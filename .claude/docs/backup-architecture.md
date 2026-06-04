# Архитектура бэкапов

> Последнее обновление: 2026-03-02

## Обзор

Бэкапы управляются через **dashboard-agent** (Fastify сервер на порту 3100).
Все данные сохраняются в `/home/deploy/letar/backups/` на соответствующем сервере.

Dashboard является чистым UI — прямого доступа к файловой системе, Docker или postgres **не имеет**.

---

## Бэкапы PostgreSQL

### Механизм

```
dashboard UI
  → dashboard (Next.js) /api/database/[db]/backup
  → dashboard-agent POST /api/database/backup
  → docker exec <pg-container> pg_dump -U <user> -d <db> | gzip
  → /home/deploy/letar/backups/<app>_<type>_<timestamp>.sql.gz
```

- Запускается через Docker API (dockerode в agent) — выполняет `pg_dump` внутри PG контейнера
- Сжимается gzip прямо в pipe
- Копируется на хост через `docker cp`

### Формат имени файла

```
<app>_<type>_<YYYY-MM-DDTHH-MM-SS>.sql.gz

premium-rosstil_auto_2026-03-01T03-00-00.sql.gz
imot_manual_2026-03-01T10-45-00.sql.gz
```

### Приложения и серверы

| Приложение         | Сервер | Контейнер БД                | БД                  |
| ------------------ | ------ | --------------------------- | ------------------- |
| premium-rosstil    | s1     | premium-rosstil-postgres    | lena_premium        |
| imot               | s1     | imot-postgres               | lena_imot           |
| mandala            | s2     | mandala-postgres            | mandala             |
| kami               | s2     | kami-postgres               | lena_kami           |
| umami              | s2     | umami-postgres              | umami               |
| animatrona-tracker | s2     | animatrona-tracker-postgres | animatrona_tracker  |
| driving-school     | s2     | driving-school-postgres     | lena_driving_school |
| dashboard          | s2     | dashboard-db                | dashboard           |
| archetest          | s2     | archetest-db                | archetest           |
| auth-hub           | s2     | auth-hub-postgres           | lena_auth           |
| time               | s2     | time-db                     | time                |
| form-example       | s2     | form-example-db             | forms_example       |

### API (в dashboard-agent)

```
POST /api/database/backup?db=imot    — бэкап конкретной БД
GET  /api/database/backups           — список всех бэкапов
GET  /api/database/backups?db=imot   — бэкапы конкретной БД
```

### Cron (автоматический)

Конфиг: `/home/deploy/letar/cron-jobs.json`
Расписание: настраивается через Dashboard UI → Cron

---

## Бэкапы Nginx Proxy Manager

### Механизм

```
dashboard-agent
  → tar -czf nginx_<type>_<timestamp>.tar.gz \
      /home/deploy/letar/infra/nginx-proxy-manager/data/ \
      /home/deploy/letar/infra/nginx-proxy-manager/letsencrypt/
  → /home/deploy/letar/backups/nginx_<type>_<timestamp>.tar.gz
```

### Содержимое архива

| Директория     | Содержимое                                          |
| -------------- | --------------------------------------------------- |
| `data/`        | SQLite база NPM (proxy hosts, users, SSL настройки) |
| `data/nginx/`  | Сгенерированные nginx конфиги                       |
| `letsencrypt/` | SSL сертификаты Let's Encrypt                       |

### Формат имени файла

```
nginx_<type>_<YYYY-MM-DDTHH-MM-SS>.tar.gz

nginx_auto_2026-03-01T03-00-00.tar.gz
nginx_manual_2026-03-01T10-45-00.tar.gz
```

### API (в dashboard-agent)

```
POST /api/nginx/backup    — создать бэкап NPM
GET  /api/nginx/backups   — список бэкапов NPM
```

### Cron (автоматический)

- **S1**: задача `nginx-backup` — 3:00 ежедневно
- **S2**: задача `nginx-backup-s2` — 3:00 ежедневно

Задача `nginx-backup-s2` имеет поле `server: 's2'` — запускается только на dashboard-agent с `SERVER_NAME=s2.letar.best`.

---

## Восстановление

### PostgreSQL

```bash
# Через Dashboard UI: Databases → выбрать бэкап → Restore (не реализовано пока)
# Вручную:
gunzip -c backup.sql.gz | docker exec -i <pg-container> psql -U <user> -d <db>
```

### Nginx Proxy Manager

```bash
# 1. Остановить NPM
cd /home/deploy/letar/infra/nginx-proxy-manager
docker compose down

# 2. Распаковать бэкап (перезапишет data/ и letsencrypt/)
tar -xzf /home/deploy/letar/backups/nginx_auto_TIMESTAMP.tar.gz -C /

# 3. Запустить NPM
docker compose up -d
```

---

## Хранение и ротация

- Все бэкапы: `/home/deploy/letar/backups/`
- Ротация nginx бэкапов: оставляются последние 7 (`nginx-backup.ts` в агенте)
- Ротация DB бэкапов: ручная (через Dashboard UI или скрипт)
- Смонтировано в docker-compose агента через `WORKSPACE_PATH`

---

## Конфигурация dashboard-agent (secrets)

Credentials БД берутся из файлов секретов (read-only mount):

```yaml
# docker-compose.production.yml (S1)
volumes:
  - ${WORKSPACE_PATH}/apps/premium-rosstil/.env.docker:/secrets/premium-rosstil.env:ro
  - ${WORKSPACE_PATH}/apps/umami/.env.docker:/secrets/umami.env:ro
  # ...

# docker-compose.s2.yml (S2)
volumes:
  - ${WORKSPACE_PATH}/apps/driving-school/.env.docker:/secrets/driving-school.env:ro
```

Переменные в `.env.docker` приложения:

- `DB_PASSWORD` — пароль PostgreSQL
- `POSTGRES_USER` — пользователь (опционально, есть дефолты)
- `POSTGRES_DB` — имя БД (опционально, есть дефолты)

---

## Resilio Sync — репозиторий на Windows

Resilio Sync настроен на **s1** для синхронизации кода репозитория на локальный Windows-компьютер.

### Установка и конфигурация (s1)

```
Пакет: resilio-sync (apt-репозиторий linux-packages.resilio.com)
Версия: 3.1.2
Сервис: systemctl status resilio-sync
Конфиг: /etc/resilio-sync/config.json
Лог:    /var/lib/resilio-sync/sync.log
Пользователь: deploy (override в /etc/systemd/system/resilio-sync.service.d/deploy-user.conf)
```

### Синхронизируемые папки

| Сервер | Папка на сервере     | Папка на Windows        | Папка на pinner2        | Ключ (RO)                                |
| ------ | -------------------- | ----------------------- | ----------------------- | ---------------------------------------- |
| s1     | `/home/deploy/letar` | `C:\BackupSync\lena\s1` | `/home/backups/lena/s1` | см. `.claude/OPS_JOURNAL.local.md §14.4` |
| s2     | `/home/deploy/letar` | `C:\BackupSync\lena\s2` | `/home/backups/lena/s2` | см. `.claude/OPS_JOURNAL.local.md §14.4` |

> R/W ключи хранятся в `/etc/resilio-sync/config.json` на каждом сервере.

### Исключения из синхронизации (`.sync/IgnoreList`)

Стратегия: синхронизируются только **uploads** всех приложений и папка **backups**. Всё остальное восстанавливается из git (`git pull` + `bun install` + генерация).

```
# Build artifacts
node_modules
.next
dist

# Dev caches
.nx
.cache
.turbo

# Source code (re-pullable from git)
src
prisma
public
libs
scripts
.github

# Nginx (configs backed up via nginx_auto_*.tar.gz)
infra/nginx-proxy-manager/data
infra/nginx-proxy-manager/letsencrypt

# Logs
*.log
```

> **Важно:** `*.sql.gz`, `*.tar.gz` и `uploads/` НЕ исключаются — бэкапы БД, NPM и загруженные пользователями файлы синхронизируются на все точки хранения.

### Добавление на Windows

1. Установить [Resilio Sync для Windows](https://www.resilio.com/sync/download/)
2. **Add folder** → **Enter a key or link**
3. Ввести Read-only ключ: см. `.claude/OPS_JOURNAL.local.md §14.4`
4. Выбрать папку: `C:\BackupSync\lena\s1`
5. Тип папки: **Read only** (автоматически — RO-ключ)

### Управление сервисом

```bash
# На s1 или s2 через SSH:
systemctl status resilio-sync     # Статус
systemctl restart resilio-sync    # Перезапуск
journalctl -u resilio-sync -f     # Логи systemd
tail -f /var/lib/resilio-sync/sync.log  # Детальный лог
```

### Troubleshooting: синхронизация не запускается после сброса state

**Симптомы:** В логах только `Stop synchronization` каждую минуту, нет подключений к трекерам. Ошибка `error=105 "Destination folder is not empty"`.

**Причина:** `shared_folders` в config.json не обрабатывает диалог "Destination folder is not empty" в headless режиме.

**Решение:**

1. Включить webui в config.json (убрав `shared_folders`):
   ```json
   "webui": { "listen": "0.0.0.0:8888", "login": "admin", "password": "resilio2026" }
   ```
2. Перезапустить: `sudo systemctl restart resilio-sync`
3. Открыть `http://<server-ip>:8888`, принять EULA, добавить папку через UI
4. Вернуть config.json с `shared_folders` (без webui), перезапустить
5. На Windows — пересоздать папку (удалить + добавить с RO ключом)

**Важно:** НЕ удалять `.sync/ID`, `settings.dat`, `*.db` без необходимости — это сбрасывает identity папки и вынуждает переподключать всех клиентов.

---

## Бэкап Maddy (mail.letar.best)

> Добавлен 2026-06-04. Maddy живёт на отдельном сервере `mail.letar.best` — dashboard-agent его не видит.

### Критичные файлы

| Файл/папка                       | Описание                         |
| -------------------------------- | -------------------------------- |
| `/opt/maddy/config/maddy.conf`   | Основной конфиг                  |
| `/opt/maddy/docker-compose.yml`  | Docker Compose                   |
| `/opt/maddy/data/credentials.db` | Хэши паролей SMTP-аккаунтов      |
| `/opt/maddy/data/aliases`        | Алиасы и форварды                |
| `/opt/maddy/data/dkim_keys/`     | **DKIM private keys** ⚠️ критично |

> ⚠️ Потеря DKIM private keys = нужно регенерировать ключи и менять DNS TXT-записи для всех доменов.

### Механизм

Скрипт `/opt/maddy/backup.sh` — ежедневно в 03:00 (crontab root):

```bash
# Запуск вручную
ssh root@mail.letar.best "bash /opt/maddy/backup.sh"

# Просмотр бэкапов
ssh root@mail.letar.best "ls -lh /root/backups/maddy/"

# Лог
ssh root@mail.letar.best "tail -20 /var/log/maddy-backup.log"
```

Результат: `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz` (~16 KB), ротация 14 дней.

> ⚠️ Бэкап хранится **только на mail сервере** — single point of failure. В будущем: rsync на s2 или отдельное хранилище.

---

## Архитектура Dashboard → Dashboard-Agent

Dashboard **никогда не обращается** к системе напрямую. Всё идёт через HTTP:

```
Dashboard (Next.js, s2:3002)
  → HTTP → Dashboard-Agent (Fastify, s2:3100)  ← "Local" сервер
  → HTTP → Dashboard-Agent (Fastify, s1:3100)  ← Remote сервер

Dashboard-Agent (на обоих серверах):
  → docker socket → Docker
  → /secrets/*.env → DB credentials
  → /home/deploy/letar/backups/ → файлы бэкапов
```

`getLocalClient()` в dashboard возвращает `RemoteServerClient` к `localhost:3100` с токеном `LOCAL_AGENT_TOKEN`.
