---
alwaysApply: true
---

# Координация деплоя через Deploy Agent

## ⛔ Прямой деплой ЗАПРЕЩЁН

⛔ **НИКОГДА** не запускай `deploy-affected.sh`, `docker compose`, SSH-деплой самостоятельно.
⛔ Даже если пользователь пишет «деплой» — отправь запрос BlackCove, а не деплой сам.
⛔ Единственное исключение — явное разрешение пользователя после 10 минут молчания BlackCove.

Вместо этого отправь запрос Deploy Agent (BlackCove) через Agent Mail.

## Как запросить деплой

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: <app-name>",
  body_md: "app: <app-name>\nreason: <что сделал>\ncommit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

## Перед запросом деплоя

1. **Закоммить** все изменения: `git add apps/<app>/ && git commit`
2. **Запушить**: `git push`
3. **Проверь качество**: `nx lint <app> && nx typecheck:tsgo <app>`
4. **Если добавил/поменял импорт из `libs/*`** (особенно новую для этого приложения библиотеку) —
   дополнительно прогони `nx build <app>`. `typecheck:tsgo` резолвит `libs/*` через TS project
   references и может быть зелёным, даже если прод-билд (`next build`/Turbopack) не может
   разрешить транзитивный импорт — например когда библиотека реэкспортирует другую `@letar/*`-либу,
   не подключённую в `tsconfig.json`/`next.config.mjs` (`transpilePackages`) текущего приложения.
   Прецедент: `SortablePhotoGrid` (`@letar/admin-ui`) реэкспортировал `@letar/format-utils`, которая
   была подключена только в `mandala` — typecheck прошёл, а прод-билд в `aboi`/`aprel8008` упал на
   `Module not found` (2026-07-21).
5. Только потом отправляй запрос

## Ожидание результата

После отправки запроса:

- Продолжай работу над другими задачами
- DeployAgent ответит через `reply_message` когда деплой завершится
- Проверяй inbox периодически

## Если Deploy Agent не отвечает

Если прошло больше 10 минут и нет ответа:

1. Проверь `fetch_inbox` — может быть ответ уже пришёл
2. Спроси пользователя: "Deploy Agent не отвечает, запустить деплой самостоятельно?"
3. Только с явного разрешения пользователя деплой напрямую

## Исключение

Если ты сам Deploy Agent (имя агента = `BlackCove`) — ты выполняешь деплой.

### BlackCove: деплой через deploy-mcp (предпочтительно), SSH — резервный канал

Основной путь — MCP-инструменты `deploy-mcp` (структурированный статус вместо парсинга stdout):

```
git_status({ server: "s2" })                     # коммиты запушены?
deploy_app({ app: "<app>", target: "production" })   # → deployId
deploy_status({ server: "s2", deployId, sinceLine: 0 })  # поллинг (sinceLine = totalLines из прошлого ответа)
```

- `target: "staging"` резолвится на s3 (образ `<app>:staging`).
- `seed: true` → добавляет `--seed` (`nx run <app>:db:seed` после успешного деплоя) — теперь не требует SSH-резерва.
- `agent_health({ server })` — при проблемах: различает недоступность сервера и неверный токен.
- Подробности: [mcp-servers.md § Deploy MCP](/.claude/docs/mcp-servers.md#deploy-mcp-letardeploy-mcp), [libs/deploy-mcp/README.md](/libs/deploy-mcp/README.md).

⚠️ **Наличие переменной в `.env.docker`/`.env.docker.enc` не означает, что она попала в БД.** Если
приложение сидит настройки из env через идемпотентный upsert-скрипт (например
`prisma/seed.ts`), после деплоя с `seed: true` нужно свериться либо с логом самого сида (строка
вида «✅ настройки обновлены из env»), либо напрямую с содержимым таблицы через `postgres-*` MCP —
не полагаться на факт, что значение когда-то было прописано в файле.

**Сырой SSH (`deploy-affected.sh` напрямую) остаётся резервным каналом** для того, что
dashboard-agent не покрывает: первичная настройка нового приложения на сервере, ручное
вмешательство при сбое агента, provision нового сервера.
