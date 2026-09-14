---
name: mcp-postgres-setup
description: |
  Регистрация Postgres-базы нового приложения в letar-db. Используй при:
  - Добавлении нового приложения с PostgreSQL
  - Подключении к локальной и/или прод БД через Claude Code
  - Создании read-only пользователя для прод БД
---

# MCP Postgres Setup

Все Postgres-базы монорепо обслуживает один MCP-сервер `letar-db`
(`.claude/mcp/letar-db.ts`, см. [mcp-servers.md](/.claude/docs/mcp-servers.md#letar-db)).
Добавить базу = добавить запись в реестр `.claude/mcp/databases.json` — **без правки
`.mcp.json` и без рестарта сессии** (реестр перечитывается на каждый вызов `dbs`/`sql`/`schema`).
Пароли остаются только в `.env`-файлах — `databases.json` их не содержит.

## Шаг 1 — Узнать порт локального контейнера

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep <app>
```

Пример вывода: `kami-postgres  0.0.0.0:5437->5432/tcp` → порт `5437`.

## Шаг 2 — Добавить MCP_LOCAL_URL в .env.local (если DATABASE_URL не годится напрямую)

```env
# ============================================
# MCP postgres подключения (только для Claude Code)
# ============================================
MCP_LOCAL_URL=postgresql://<user>:<password>@localhost:<local-port>/<db>
```

Если `DATABASE_URL` в `.env.local` уже указывает на правильный порт и пользователя — отдельная
переменная не нужна, `urlVar` в реестре можно не указывать (умолчание `DATABASE_URL`).

## Шаг 3 — Добавить запись в `.claude/mcp/databases.json`

```json
{
  "name": "<app>",
  "envFile": "apps/<app>/.env.local",
  "urlVar": "MCP_LOCAL_URL",
  "mode": "rw"
}
```

`urlVar` опустить, если используется `DATABASE_URL`. `mode: "rw"` — обычный дев-доступ (пишет и
читает); `mode: "ro"` — каждый `sql` на этой базе выполняется в `BEGIN TRANSACTION READ ONLY` с
`ROLLBACK` в конце, писать в принципе нельзя независимо от текста запроса — используй `ro` для
всего, что не должно принимать запись через MCP (в первую очередь любой прод).

## Проверка

Новая запись подхватывается сразу, рестарт сессии не нужен:

```typescript
mcp__letar - db__dbs()
mcp__letar - db__sql({
  db: '<app>',
  sql: "SELECT 'ok' as status, count(*) as tables FROM information_schema.tables WHERE table_schema = 'public'",
})
```

Разрешение `mcp__letar-db__*` в `permissions.allow` — уже общее на все базы (безопасность держится
на `mode`, не на пермишенах), отдельно регистрировать новую базу в `settings.local.json` не нужно.

---

## Опционально: прод-доступ (read-only)

### Шаг P1 — Найти порт на проде

```bash
ssh root@185.28.85.195 "docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep <app>"
```

Пример: `<app>-postgres  0.0.0.0:5438->5432/tcp` → порт `5438`.

### Шаг P2 — Создать read-only пользователя на проде

```bash
ssh root@185.28.85.195 "docker exec <app>-postgres psql -U <prod-user> -d <prod-db> -c \"
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
```

Выбери свободный tunnel-port (проверить занятые: `netstat -an | grep LISTEN`). Занятые порты в
`databases.json`: 5455 (`kami-prod`), 5456 (`studio-prod`), 5457 (`domwellbes-prod`).

⚠️ **Хост туннеля — только литеральный IP `185.28.85.195`, не `s2.letar.best`.** Под TUN-VPN
хостнейм резолвится в Fake-IP, SSH туда не доходит — см.
[mcp-servers.md](/.claude/docs/mcp-servers.md#letar-db).

### Шаг P4 — Добавить запись в `databases.json`

```json
{
  "name": "<app>-prod",
  "envFile": "apps/<app>/.env.docker",
  "urlVar": "MCP_PROD_RO_URL",
  "mode": "ro",
  "tunnel": { "localPort": <tunnel-port>, "sshHost": "root@185.28.85.195", "remotePort": <prod-port> }
}
```

`mode: "ro"` обязателен для прод-записи — намеренно не оставляй `rw`, чтобы записи на прод было
структурно невозможно совершить через `sql`, а не только через договорённость.

## Справочник: текущие базы

Полная и актуальная таблица — в [mcp-servers.md § letar-db](/.claude/docs/mcp-servers.md#letar-db),
не дублируется здесь во избежание расхождения.

✅ **`kami` — расхождение `MCP_LOCAL_URL`/`DATABASE_URL` закрыто 2026-08-31.** Раньше
`DATABASE_URL` в `apps/kami/.env.local` указывал на порт 5432 (`premium-rosstil-postgres`) — не
просто другую базу, а битую строку подключения (роль `postgres` там не существует). Теперь оба
значения указывают на один и тот же канонический дев-контейнер `kami-postgres` (порт 5437,
`lena_kami`). Разбор —
[verification-pitfalls.md](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-инструмент-а-про-mcp-сервер-postgres-app-может-смотреть-не-в-ту-бд-что-database_url-приложения).
Для нового приложения `MCP_LOCAL_URL`/`urlVar` имеет смысл только когда он реально смотрит на тот
же контейнер, что и `DATABASE_URL` приложения — иначе используй вариант по умолчанию (без
`urlVar`, читает `DATABASE_URL` напрямую), там расхождение структурно невозможно.
