---
description: Аудит системы бэкапов — свежесть дампов, cron, репликация, регистрация приложений
allowed-tools: Bash
---

# Backup Audit - Аудит бэкапов

Проведи аудит системы бэкапов: проверь что все бэкапы свежие, cron работает, репликация идёт, все приложения зарегистрированы.

⚠️ **Все production-приложения на s2** (s1 выведен из эксплуатации 2026-06-20 — сервер больше не
принадлежит letar, бэкапов/cron/dashboard-agent на нём нет). Подробнее —
[backup-architecture.md](/.claude/docs/backup-architecture.md).

## Когда использовать

- Еженедельно (плановая проверка)
- После добавления нового приложения с PostgreSQL
- После инцидента с сервером или восстановления
- Перед деплоем критичных изменений в dashboard-agent

## Подготовка

SSH-команды выполняй через:

```bash
unset SSH_AUTH_SOCK && unset SSH_AGENT_PID
S2="root@s2.letar.best"
SSH="/c/Windows/System32/OpenSSH/ssh.exe"
```

## Области проверки

### 1. Dashboard-Agent доступность

```bash
$SSH $S2 'docker ps --filter name=dashboard-agent --format "{{.Status}}" && curl -sf localhost:3100/health'
```

- Контейнер `dashboard-agent` в статусе `Up`
- `/health` возвращает 200

### 2. Cron расписание

```bash
$SSH $S2 'cat /home/deploy/letar/cron-jobs.json'
```

Ожидаемые задачи:

| Job ID             | Расписание | Сервер | Описание        |
| ------------------ | ---------- | ------ | --------------- |
| s2-database-backup | 02:00 UTC  | s2     | pg_dump всех БД |
| nginx-backup-s2    | 03:00 UTC  | s2     | NPM бэкап       |

- Обе задачи присутствуют
- `enabled: true` у каждой
- Расписание соответствует таблице

### 3. Свежесть бэкапов PostgreSQL

```bash
$SSH $S2 'ls -lhS /home/deploy/letar/backups/*.sql.gz 2>/dev/null | tail -30'
```

Приложения с PostgreSQL для проверки (сверено по `docker-compose.production.yml`, все на s2):

| Приложение         | Минимальный размер |
| ------------------ | ------------------ |
| aboi               | > 1 KB             |
| animatrona-tracker | > 1 KB             |
| aprel8008          | > 1 KB             |
| archetest          | > 1 KB             |
| auth-hub           | > 1 KB             |
| dashboard          | > 1 KB             |
| domwellbes         | > 1 KB             |
| driving-school     | > 1 KB             |
| dsperevod          | > 1 KB             |
| form-example       | > 1 KB             |
| grandslamcup       | > 1 KB             |
| kami               | > 1 KB             |
| mandala            | > 1 KB             |
| studio             | > 1 KB             |
| svoichuzhie        | > 1 KB             |
| time               | > 1 KB             |
| umami              | > 1 KB             |

⚠️ Список получен грепом `image: postgres` по `apps/*/docker-compose.production.yml` — если
приложение добавило БД после последней сверки этого файла, его тут может не быть. Перед аудитом
можно пересверить:

```bash
for d in apps/*/docker-compose.production.yml; do grep -q "image: postgres" "$d" && dirname "$d"; done
```

Критерии:

- Последний бэкап каждого приложения **не старше 25 часов**
- Размер файла **> 1 KB** (пустой дамп = проблема)
- Тип `auto` в имени файла (подтверждает работу cron)

### 4. Свежесть бэкапов Nginx Proxy Manager

⚠️ Nginx Proxy Manager снят и с s3 (2026-08-08), и с s2 (2026-08-31) — на s2 сейчас Traefik
([traefik/README.md](/infra/traefik/README.md)). Этот шаг актуален только если на сервере всё ещё
остался NPM-бэкап от прежней конфигурации — проверь, действительно ли `nginx-backup-s2` в cron ещё
нужен, прежде чем требовать его свежести.

```bash
$SSH $S2 'ls -lh /home/deploy/letar/backups/nginx_*.tar.gz 2>/dev/null | tail -5'
```

- Последний бэкап **не старше 25 часов** (если задача ещё актуальна)
- Размер **> 10 KB**
- Ротация работает (не более ~7 файлов)

### 5. Регистрация приложений в dashboard-agent

Сверь `APP_CONFIG` в коде с реальными docker-compose файлами:

```bash
# Файл: apps/dashboard-agent/src/lib/database.ts
```

Для каждого приложения с PostgreSQL в монорепо проверь:

1. Приложение есть в `APP_CONFIG` (database.ts)
2. Приложение есть в `SERVER_APPS` (server-config.ts / `libs/infra-config`)
3. Имя контейнера в APP_CONFIG совпадает с `docker-compose.production.yml`
4. `.env.docker` примонтирован как secret в docker-compose agent

```bash
$SSH $S2 'docker ps --filter name=-postgres --format "{{.Names}}" && docker ps --filter name=-db --format "{{.Names}}"'
```

### 6. Resilio Sync репликация

```bash
$SSH $S2 'systemctl is-active resilio-sync'
$SSH $S2 'cat /home/deploy/letar/.sync/IgnoreList 2>/dev/null'
```

- `resilio-sync` активен на s2
- `*.sql.gz` и `*.tar.gz` **отсутствуют** в IgnoreList
- Локальная копия на Windows актуальна:

```bash
ls -lh /c/BackupSync/lena/s2/backups/*.sql.gz 2>/dev/null | tail -5
```

### 7. Credentials (секреты)

```bash
$SSH $S2 'docker inspect dashboard-agent --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}" | grep secrets'
```

- Каждое приложение из APP_CONFIG имеет примонтированный `/secrets/<app>.env`
- Файлы содержат `DB_PASSWORD` (не пустой)

---

## Чеклист

### Critical

- [ ] Dashboard-agent запущен и отвечает на s2
- [ ] Cron задачи активны (2 шт: DB + NPM, см. п.4 про актуальность NPM-бэкапа после Traefik)
- [ ] Бэкапы PostgreSQL свежие (< 25ч) для всех приложений из п.3
- [ ] Бэкапы PostgreSQL не пустые (> 1 KB)
- [ ] Credentials доступны agent (все .env.docker примонтированы)

### Important

- [ ] Все PG-приложения зарегистрированы в APP_CONFIG
- [ ] Имена контейнеров в APP_CONFIG совпадают с реальными
- [ ] Resilio Sync активен на s2
- [ ] Бэкапы не исключены из Resilio Sync (IgnoreList)
- [ ] Ротация NPM/архивных бэкапов работает (не более ~7 файлов), если задача ещё актуальна

### Recommended

- [ ] Бэкапы реплицированы на Windows (C:\BackupSync\)
- [ ] Размеры бэкапов стабильны (нет резких просадок)
- [ ] Логи cron не содержат ошибок (проверить через Dashboard UI)

---

## Результат

Заполни таблицу по итогам аудита:

| Область                | Статус | Детали                             |
| ---------------------- | ------ | ---------------------------------- |
| Agent s2               |        | Up / Down, время работы            |
| Cron задачи            |        | N/2 активных                       |
| БД бэкапы              |        | N/17 свежих, мин/макс размер       |
| NPM/архивный бэкап     |        | Свежесть, актуальность задачи      |
| Регистрация приложений |        | N/17 зарегистрированы, пропущенные |
| Resilio Sync           |        | Активен, IgnoreList ok             |
| Windows репликация     |        | Файлы актуальны / устаревшие       |
| Credentials            |        | Все секреты примонтированы         |

## Документация

- [Архитектура бэкапов](/.claude/docs/backup-architecture.md)
- [Восстановление сервера](/.claude/docs/server-recovery.md)
- [Деплой](/.claude/docs/deployment.md)
