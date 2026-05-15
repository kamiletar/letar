# Backup Audit - Аудит бэкапов

Проведи аудит системы бэкапов: проверь что все бэкапы свежие, cron работает, репликация идёт, все приложения зарегистрированы.

## Когда использовать

- Еженедельно (плановая проверка)
- После добавления нового приложения с PostgreSQL
- После инцидента с сервером или восстановления
- Перед деплоем критичных изменений в dashboard-agent

## Подготовка

SSH-команды выполняй через:

```bash
# Подключение к серверам
unset SSH_AUTH_SOCK && unset SSH_AGENT_PID
S1="root@194.164.245.97"
S2="root@s2.letar.best"
SSH="/c/Windows/System32/OpenSSH/ssh.exe"
```

## Области проверки

### 1. Dashboard-Agent доступность

Проверь что agent запущен и отвечает на обоих серверах:

```bash
# S1
$SSH $S1 'docker ps --filter name=dashboard-agent --format "{{.Status}}" && curl -sf localhost:3100/health'

# S2
$SSH $S2 'docker ps --filter name=dashboard-agent --format "{{.Status}}" && curl -sf localhost:3100/health'
```

- Контейнер `dashboard-agent` в статусе `Up`
- `/health` возвращает 200

### 2. Cron расписание

Проверь что автоматические задачи настроены и активны:

```bash
# S1
$SSH $S1 'cat /home/deploy/letar/cron-jobs.json'

# S2
$SSH $S2 'cat /home/deploy/letar/cron-jobs.json'
```

Ожидаемые задачи:

| Job ID             | Расписание | Сервер | Описание        |
| ------------------ | ---------- | ------ | --------------- |
| s1-database-backup | 02:00 UTC  | s1     | pg_dump всех БД |
| s2-database-backup | 02:00 UTC  | s2     | pg_dump всех БД |
| nginx-backup       | 03:00 UTC  | s1     | NPM бэкап       |
| nginx-backup-s2    | 03:00 UTC  | s2     | NPM бэкап       |

- Все 4 задачи присутствуют
- `enabled: true` у каждой
- Расписание соответствует таблице

### 3. Свежесть бэкапов PostgreSQL

Проверь наличие и свежесть дампов для каждого приложения:

```bash
# S1 — список бэкапов с размерами
$SSH $S1 'ls -lhS /home/deploy/letar/backups/*.sql.gz 2>/dev/null | tail -20'

# S2
$SSH $S2 'ls -lhS /home/deploy/letar/backups/*.sql.gz 2>/dev/null | tail -20'
```

Приложения для проверки:

| Приложение         | Сервер | Минимальный размер |
| ------------------ | ------ | ------------------ |
| premium-rosstil    | s1     | > 1 KB             |
| imot               | s1     | > 1 KB             |
| mandala            | s1     | > 1 KB             |
| kami               | s1     | > 1 KB             |
| umami              | s1     | > 1 KB             |
| animatrona-tracker | s1     | > 1 KB             |
| driving-school     | s2     | > 1 KB             |
| dashboard          | s2     | > 1 KB             |
| archetest          | s2     | > 1 KB             |
| auth-hub           | s2     | > 1 KB             |
| grandslamcup       | s2     | > 1 KB             |
| time               | s2     | > 1 KB             |
| form-example       | s2     | > 1 KB             |

Критерии:

- Последний бэкап каждого приложения **не старше 25 часов**
- Размер файла **> 1 KB** (пустой дамп = проблема)
- Тип `auto` в имени файла (подтверждает работу cron)

### 4. Свежесть бэкапов Nginx Proxy Manager

```bash
# S1
$SSH $S1 'ls -lh /home/deploy/letar/backups/nginx_*.tar.gz 2>/dev/null | tail -5'

# S2
$SSH $S2 'ls -lh /home/deploy/letar/backups/nginx_*.tar.gz 2>/dev/null | tail -5'
```

- Последний бэкап на каждом сервере **не старше 25 часов**
- Размер **> 10 KB**
- Ротация работает (не более ~7 файлов на сервер)

### 5. Регистрация приложений в dashboard-agent

Сверь `APP_CONFIG` в коде с реальными docker-compose файлами:

```bash
# Прочитай APP_CONFIG
# Файл: apps/dashboard-agent/src/lib/database.ts
```

Для каждого приложения с PostgreSQL в монорепо проверь:

1. Приложение есть в `APP_CONFIG` (database.ts)
2. Приложение есть в `SERVER_APPS` (server-config.ts)
3. Имя контейнера в APP_CONFIG совпадает с `docker-compose.production.yml`
4. `.env.docker` примонтирован как secret в docker-compose agent

```bash
# Проверь что все PG контейнеры на месте
$SSH $S1 'docker ps --filter name=-postgres --format "{{.Names}}"'
$SSH $S2 'docker ps --filter name=-postgres --format "{{.Names}}" && docker ps --filter name=-db --format "{{.Names}}"'
```

### 6. Resilio Sync репликация

```bash
# Статус сервиса
$SSH $S1 'systemctl is-active resilio-sync'
$SSH $S2 'systemctl is-active resilio-sync'

# Проверь что бэкапы НЕ в IgnoreList
$SSH $S1 'cat /home/deploy/letar/.sync/IgnoreList 2>/dev/null'
$SSH $S2 'cat /home/deploy/letar/.sync/IgnoreList 2>/dev/null'
```

- `resilio-sync` активен на обоих серверах
- `*.sql.gz` и `*.tar.gz` **отсутствуют** в IgnoreList
- Локальная копия на Windows актуальна:

```bash
# Проверь наличие бэкапов на Windows
ls -lh /c/BackupSync/lena/s1/backups/*.sql.gz 2>/dev/null | tail -5
ls -lh /c/BackupSync/lena/s2/backups/*.sql.gz 2>/dev/null | tail -5
```

### 7. Credentials (секреты)

Проверь что dashboard-agent имеет доступ к credentials:

```bash
# S1 — проверь монтирование секретов
$SSH $S1 'docker inspect dashboard-agent --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}" | grep secrets'

# S2
$SSH $S2 'docker inspect dashboard-agent --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}" | grep secrets'
```

- Каждое приложение из APP_CONFIG имеет примонтированный `/secrets/<app>.env`
- Файлы содержат `DB_PASSWORD` (не пустой)

---

## Чеклист

### Critical

- [ ] Dashboard-agent запущен и отвечает на s1 и s2
- [ ] Cron задачи активны (4 шт: 2 DB + 2 NPM)
- [ ] Бэкапы PostgreSQL свежие (< 25ч) для всех 12 приложений
- [ ] Бэкапы PostgreSQL не пустые (> 1 KB)
- [ ] Бэкапы NPM свежие (< 25ч) на обоих серверах
- [ ] Credentials доступны agent (все .env.docker примонтированы)

### Important

- [ ] Все PG-приложения зарегистрированы в APP_CONFIG
- [ ] Имена контейнеров в APP_CONFIG совпадают с реальными
- [ ] Resilio Sync активен на s1 и s2
- [ ] Бэкапы не исключены из Resilio Sync (IgnoreList)
- [ ] Ротация NPM бэкапов работает (не более ~7 файлов)

### Recommended

- [ ] Бэкапы реплицированы на Windows (C:\BackupSync\)
- [ ] Размеры бэкапов стабильны (нет резких просадок)
- [ ] Логи cron не содержат ошибок (проверить через Dashboard UI)

---

## Результат

Заполни таблицу по итогам аудита:

| Область                | Статус | Детали                             |
| ---------------------- | ------ | ---------------------------------- |
| Agent s1               |        | Up / Down, время работы            |
| Agent s2               |        | Up / Down, время работы            |
| Cron задачи            |        | N/4 активных                       |
| БД бэкапы s1           |        | N/6 свежих, мин/макс размер        |
| БД бэкапы s2           |        | N/7 свежих, мин/макс размер        |
| NPM бэкапы             |        | Свежесть s1/s2                     |
| Регистрация приложений |        | N/13 зарегистрированы, пропущенные |
| Resilio Sync           |        | Активен s1/s2, IgnoreList ok       |
| Windows репликация     |        | Файлы актуальны / устаревшие       |
| Credentials            |        | Все секреты примонтированы         |

## Документация

- [Архитектура бэкапов](/.claude/docs/backup-architecture.md)
- [Восстановление сервера](/.claude/docs/server-recovery.md)
- [Деплой](/.claude/docs/deployment.md)
