---
name: mcp-postgres-setup
description: |
  Настройка MCP postgres для нового приложения. Используй при:
  - Добавлении нового приложения с PostgreSQL
  - Настройке postgres-* MCP серверов в .mcp.json
  - Подключении к локальной и/или прод БД через Claude Code
  - Создании read-only пользователя для прод БД
---

# MCP Postgres Setup

Добавление postgres MCP серверов для нового приложения. Пароли хранятся только в `.env` файлах — не в `.mcp.json`.

## Архитектура

- **pg-wrapper.mjs** — обёртка, читает connection string из `.env` файла
- **Локальная БД** → `.env.local` → полный доступ (write разрешён)
- **Прод БД read-only** → `.env.docker` → только SELECT, без permission prompt
- **Прод БД write** → `.env.docker` → полный доступ, требует permission prompt

## Шаг 1 — Узнать порт локального контейнера

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep <app>
```

Пример вывода: `kami-postgres  0.0.0.0:5437->5432/tcp` → порт `5437`.

Посмотреть credentials контейнера:

```bash
docker exec <app>-postgres env | grep POSTGRES
```

## Шаг 2 — Добавить MCP_LOCAL_URL в .env.local

```env
# ============================================
# MCP postgres подключения (только для Claude Code)
# ============================================
MCP_LOCAL_URL=postgresql://<user>:<password>@localhost:<local-port>/<db>
```

> Если `DATABASE_URL` в `.env.local` уже указывает на правильный порт и пользователя — можно не добавлять `MCP_LOCAL_URL` и использовать `DATABASE_URL` напрямую.

## Шаг 3 — Добавить запись в .mcp.json

Открой `C:/web/letar/.mcp.json` и добавь секцию рядом с другими `postgres-*`:

```json
"postgres-<app>": {
  "type": "stdio",
  "command": "node",
  "args": [".claude/mcp/pg-wrapper.mjs", "apps/<app>/.env.local", "MCP_LOCAL_URL"]
}
```

Если `DATABASE_URL` уже корректный — можно без третьего аргумента (умолчание `DATABASE_URL`):

```json
"postgres-<app>": {
  "type": "stdio",
  "command": "node",
  "args": [".claude/mcp/pg-wrapper.mjs", "apps/<app>/.env.local"]
}
```

## Шаг 4 — Зарегистрировать в settings.local.json

Открой `C:/web/letar/.claude/settings.local.json` и добавь в два места:

**1. В `permissions.allow`** (разрешить без prompt):

```json
"mcp__postgres-<app>__*",
```

**2. В `enabledMcpjsonServers`**:

```json
"postgres-<app>",
```

## Проверка

Перезапусти Claude Code. После перезапуска в system-reminder должен появиться `mcp__postgres-<app>__query`.

Проверить подключение:

```sql
SELECT 'ok' as status, count(*) as tables
FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## Опционально: прод MCP (если нужен доступ к production БД)

### Шаг P1 — Найти порт на проде

```bash
ssh root@s2.letar.best "docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep <app>"
```

Пример: `<app>-postgres  0.0.0.0:5438->5432/tcp` → порт `5438`.

### Шаг P2 — Создать read-only пользователя на проде

```bash
ssh root@s2.letar.best "docker exec <app>-postgres psql -U <prod-user> -d <prod-db> -c \"
CREATE USER <app>_ro WITH PASSWORD '<генерировать: openssl rand -hex 16>';
GRANT CONNECT ON DATABASE <prod-db> TO <app>_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO <app>_ro;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO <app>_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO <app>_ro;
\""
```

### Шаг P3 — Добавить прод URL в .env.docker

```env
# MCP postgres подключения (только для Claude Code)
MCP_PROD_RO_URL=postgresql://<app>_ro:<ro-password>@localhost:<tunnel-port>/<prod-db>
MCP_PROD_RW_URL=postgresql://<prod-user>:<prod-password>@localhost:<tunnel-port>/<prod-db>
```

Выбери свободный tunnel-port (проверить занятые: `netstat -an | grep LISTEN`).
Занятые порты в проекте: 5432 (premium-rosstil), 5437 (kami), 5453 (grandslamcup).

### Шаг P4 — Добавить прод серверы в .mcp.json

```json
"postgres-<app>-prod": {
  "type": "stdio",
  "command": "node",
  "args": [
    ".claude/mcp/pg-wrapper.mjs",
    "apps/<app>/.env.docker",
    "MCP_PROD_RO_URL",
    "--tunnel", "<tunnel-port>", "root@s2.letar.best", "<prod-port>"
  ]
},
"postgres-<app>-prod-write": {
  "type": "stdio",
  "command": "node",
  "args": [
    ".claude/mcp/pg-wrapper.mjs",
    "apps/<app>/.env.docker",
    "MCP_PROD_RW_URL",
    "--tunnel", "<tunnel-port>", "root@s2.letar.best", "<prod-port>"
  ]
}
```

### Шаг P5 — Зарегистрировать в settings.local.json

В `permissions.allow` добавить **только read-only** (write — намеренно НЕ добавлять):

```json
"mcp__postgres-<app>-prod__*",
```

В `enabledMcpjsonServers` добавить оба:

```json
"postgres-<app>-prod",
"postgres-<app>-prod-write",
```

> `postgres-<app>-prod-write` не в allowlist → каждый раз при использовании Claude Code будет запрашивать явное разрешение пользователя.

## Справочник: текущие MCP серверы

| Сервер                     | Env файл                          | Переменная        | Туннель         |
| -------------------------- | --------------------------------- | ----------------- | --------------- |
| `postgres-kami`            | `apps/kami/.env.local`            | `MCP_LOCAL_URL`   | нет (порт 5437) |
| `postgres-kami-prod`       | `apps/kami/.env.docker`           | `MCP_PROD_RO_URL` | 5455 → s2:5437  |
| `postgres-kami-prod-write` | `apps/kami/.env.docker`           | `MCP_PROD_RW_URL` | 5455 → s2:5437  |
| `postgres-driving-school`  | `apps/driving-school/.env.local`  | `DATABASE_URL`    | нет (порт 5432) |
| `postgres-premium-rosstil` | `apps/premium-rosstil/.env.local` | `DATABASE_URL`    | нет (порт 5432) |
| `postgres-grandslamcup`    | `apps/grandslamcup/.env.local`    | `DATABASE_URL`    | нет (порт 5453) |
