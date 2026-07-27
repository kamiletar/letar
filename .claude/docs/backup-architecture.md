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

| Приложение         | Сервер | Контейнер БД             | БД                  |
| ------------------ | ------ | ------------------------ | ------------------- |
| premium-rosstil    | s2     | premium-rosstil-postgres | lena_premium        |
| imot               | s2     | imot-postgres            | lena_imot           |
| mandala            | s2     | mandala-db               | mandala             |
| kami               | s2     | kami-db                  | lena_kami           |
| umami              | s2     | umami-db                 | umami               |
| animatrona-tracker | s2     | animatrona-tracker-db    | animatrona_tracker  |
| driving-school     | s2     | driving-school-db        | lena_driving_school |
| dashboard          | s2     | dashboard-db             | dashboard           |
| archetest          | s2     | archetest-db             | archetest           |
| auth-hub           | s2     | auth-hub-db              | lena_auth           |
| time               | s2     | time-db                  | time                |
| form-example       | s2     | form-example-db          | forms_example       |
| grandslamcup       | s2     | grandslamcup-db          | grandslamcup        |
| dsperevod          | s2     | dsperevod-db             | dsperevod           |
| studio             | s2     | studio-db                | studio              |

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

## Pre-migrate дампы (deploy-affected.sh)

Отдельный слой защиты данных при деплое (добавлен 2026-07-09, PLAN.md §18 Сессия A):

- **Когда:** автоматически перед `prisma migrate deploy`, только если `prisma migrate status` показывает неприменённые миграции
- **Как:** `docker exec <db-container> pg_dump | gzip` (имя контейнера — из `container_name` compose-файла, fallback `<app>-db`)
- **Где:** `/home/deploy/pre-migrate-dumps/<app>-<short-sha>-<YYYYmmdd-HHMMSS>.sql.gz`
- **Ротация:** последние 3 дампа на приложение (автоматически)
- **Fail-closed:** дамп не удался → деплой приложения прерывается, миграция не применяется. Явный обход: `SKIP_PREMIGRATE_DUMP=1 ./deploy-affected.sh ...`
- **Назначение:** восстановление БД при неудачной миграции без отката к ночному бэкапу (окно потери сжимается с «до 24ч» до нуля на момент миграции). Ошибка самой миграции также прерывает деплой (старый контейнер не трогается) — см. [deployment.md](/.claude/docs/deployment.md#процесс-деплоя)

---

## Конфигурация dashboard-agent (secrets)

Credentials БД берутся из файлов секретов (read-only mount). Все прод-приложения на
**s2**, поднимаются из единственного `docker-compose.production.yml`; он монтирует
`.env.docker` каждого приложения в `/secrets/<app>.env:ro`:

```yaml
# apps/dashboard-agent/docker-compose.production.yml (s2 — прод)
volumes:
  - ${WORKSPACE_PATH}/apps/premium-rosstil/.env.docker:/secrets/premium-rosstil.env:ro
  - ${WORKSPACE_PATH}/apps/driving-school/.env.docker:/secrets/driving-school.env:ro
  - ${WORKSPACE_PATH}/apps/svoichuzhie/.env.docker:/secrets/svoichuzhie.env:ro
  # ... по одному на каждое прод-приложение
```

> **s1 выведен из эксплуатации (2026-06-20).** Прежний `docker-compose.s2.yml` удалён как
> устаревший дубль (сессия B deploy-mcp, 2026-07-10) — живым всегда был `production.yml`.
>
> **s3 (staging/e2e)** использует `docker-compose.s3.yml` — он **не монтирует** `/secrets/*.env`
> (на s3 нет прод-БД, бэкапить нечего) и служит staging-деплоям/e2e, не бэкапам.

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

Стратегия: синхронизируются только **uploads** всех приложений и папка **backups**. Всё остальное восстанавливается из git (`git pull` + `bun install` + генерация). Секреты хранятся отдельно (см. §Локальные credentials ниже).

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

# Secrets — НЕ должны синхронизироваться через Resilio
# Хранить в KeePassXC / OPS_JOURNAL.local.md (см. §Локальные credentials)
.env.docker
.env.local
.env

# Logs
*.log
```

> **Важно:** `*.sql.gz`, `*.tar.gz` и `uploads/` НЕ исключаются — бэкапы БД, NPM, Maddy и загруженные пользователями файлы синхронизируются на все точки хранения.

### Применение IgnoreList на серверах

```bash
# На s1:
ssh root@s1.letar.best "cat > /home/deploy/letar/.sync/IgnoreList" << 'EOF'
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

# Secrets
.env.docker
.env.local
.env

# Logs
*.log
EOF

# Аналогично на s2
```

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

| Файл/папка                       | Описание                          |
| -------------------------------- | --------------------------------- |
| `/opt/maddy/config/maddy.conf`   | Основной конфиг                   |
| `/opt/maddy/docker-compose.yml`  | Docker Compose                    |
| `/opt/maddy/data/credentials.db` | Хэши паролей SMTP-аккаунтов       |
| `/opt/maddy/data/aliases`        | Алиасы и форварды                 |
| `/opt/maddy/data/dkim_keys/`     | **DKIM private keys** ⚠️ критично |

> ⚠️ Потеря DKIM private keys = нужно регенерировать ключи и менять DNS TXT-записи для всех доменов.

### Механизм

Скрипт `/opt/maddy/backup.sh` — ежедневно в 03:00 (crontab root):

```bash
# Запуск вручную
ssh root@mail.letar.best "bash /opt/maddy/backup.sh"

# Просмотр бэкапов (на s2, уже в Resilio)
ssh root@s2.letar.best "ls -lh /home/deploy/letar/backups/maddy/"

# Лог
ssh root@mail.letar.best "tail -20 /var/log/maddy-backup.log"
```

Результат: `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz` (~16 KB), ротация 14 дней.

### Цепочка хранения

```
mail.letar.best          s2.letar.best                    Windows / pinner2
/root/backups/maddy/ ──rsync──▶ /home/deploy/letar/backups/maddy/ ──Resilio──▶ C:\BackupSync\lena\s2\backups\maddy\
```

SSH-ключ для rsync: `root@mail` → `deploy@s2` (`/root/.ssh/id_ed25519`, добавлен в `~deploy/.ssh/authorized_keys` на s2).

---

## Локальные credentials (стратегия)

> Добавлено 2026-06-04. Этап 0.3.

Локальные credentials (`.env.docker`, SSH-ключи, личные токены) **не синхронизируются через Resilio** — они исключены из `.sync/IgnoreList`. Вместо этого:

### Что куда хранить

| Тип                                       | Где хранить                           | Как восстановить                               |
| ----------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| Пароли сервисов, API-токены               | KeePassXC (`~/.keepass/*.kdbx`)       | Открыть KDBX-файл                              |
| Пароль БД, SMTP, OAuth secrets            | KeePassXC → раздел "Letar Production" | Заново создать `.env.docker` по шаблону из git |
| SSH-ключи (`~/.ssh/id_rsa`, `id_ed25519`) | KeePassXC Advanced (file attachment)  | Восстановить из KDBX                           |
| KDBX мастер-пароль                        | Бумага в сейфе / голове владельца     | —                                              |

> KeePassXC-файл (`~/.keepass/*.kdbx`) синхронизируется через системный iCloud/OneDrive/etc., отдельно от Resilio.

### Восстановление сервера с нуля

1. Установить Docker, git, Resilio Sync
2. Добавить Resilio R/O-ключ → папка `backups/` и `uploads/` появятся автоматически
3. `git clone git@github.com:kamiletar/letar.git --recurse-submodules`
4. Создать `.env.docker` по шаблону каждого приложения, взять значения из KeePassXC
5. `./deploy-affected.sh --app <app>` для каждого приложения

### Что НЕ нужно бэкапить отдельно

- Код — в git ✅
- Nginx proxy-конфиги — в `nginx_auto_*.tar.gz` ✅
- Maddy конфиги + DKIM — в `maddy_*.tar.gz` ✅
- БД — в `*.sql.gz` ✅
- Uploads — в Resilio ✅

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
