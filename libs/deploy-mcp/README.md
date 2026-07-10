# @letar/deploy-mcp

MCP-сервер: структурированный слой над REST API dashboard-agent для управления деплоем.

Даёт агентам (в первую очередь **BlackCove**) деплой через типизированные инструменты
вместо сырого SSH + ручного парсинга stdout. Вся деплой-логика остаётся в
`deploy-affected.sh` и `dashboard-agent` — здесь только тонкие HTTP-обёртки поверх
уже существующего API, через SSH-туннель.

## Инструменты

| Инструмент                                         | Действие                                                                   | Эндпоинт агента           |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| `list_servers()`                                   | Серверы + маппинг «приложение → сервер» (статика из `@letar/infra-config`) | —                         |
| `agent_health({ server })`                         | Health-check (отличает «сервер недоступен» от «токен неверный»)            | `GET /health`             |
| `git_status({ server })`                           | Ветка, незапушенные/входящие коммиты — проверять перед деплоем             | `GET /api/git/status`     |
| `deploy_status({ server, deployId?, sinceLine? })` | Статус деплоя + инкрементальные логи по курсору `sinceLine`                | `GET /api/deploy/status`  |
| `deploy_cancel({ server })`                        | Отмена текущего деплоя (SIGTERM)                                           | `POST /api/deploy/cancel` |
| `deploy_app({ app, target })`                      | Запуск деплоя (`target`: `production`\|`staging`)                          | `POST /api/deploy/app`    |

`server` — `s2` (прод, по умолчанию) или `s3` (staging). В `deploy_app` сервер резолвится
автоматически из `app` + `target` (staging → всегда s3).

### Типичный воркфлоу деплоя

```
git_status({ server: "s2" })                    // убедиться, что коммиты запушены
deploy_app({ app: "time" })                      // target: "production" по умолчанию
// → возвращает deployId
deploy_status({ server: "s2", deployId, sinceLine: 0 })   // поллинг прогресса
deploy_status({ server: "s2", deployId, sinceLine: <totalLines из прошлого ответа> })
```

`sinceLine` — курсор: возвращаются только новые строки лога начиная с этого номера
(в ответе `totalLines`/`fromLine`). Экономит контекст при поллинге длинного деплоя.

## Соединение и безопасность

- **SSH-туннель.** Клиент поднимает `ssh -L <localPort>:localhost:3100 -N deploy@<host>`
  (s2 → локальный порт 13100, s3 → 13101) и ходит на `127.0.0.1:<localPort>`. Туннель
  поднимается лениво при первом обращении и переиспользуется. Порт агента 3100 не обязан
  быть открыт в интернет.
- **Bearer-токен** читается из `apps/dashboard-agent/.env.docker` (или расшифровывается из
  `.env.docker.enc` через `sops`, нужен `SOPS_AGE_KEY_FILE`) — **не хранится в `.mcp.json`**,
  по аналогии с `.claude/mcp/pg-wrapper.mjs`. s3 использует отдельный `AGENT_TOKEN_S3`, если
  задан.

## Диагностика

- `agent_health({ server })` — первый шаг при проблемах: различает недоступность сервера
  и неверный токен.
- «SSH-туннель не поднялся» → проверь SSH-доступ (`ssh deploy@<host>`) и что агент слушает `:3100`.
- «Агент отклонил токен (401/403)» → проверь `AGENT_TOKEN` в `apps/dashboard-agent/.env.docker`.
- «Найден .env.docker.enc, но не задан SOPS_AGE_KEY_FILE» → `export SOPS_AGE_KEY_FILE=~/.age/letar-key.txt`.

## Запуск

Регистрируется в корневом `.mcp.json` как `deploy-mcp` (`bunx tsx libs/deploy-mcp/src/cli.ts`),
запускается из корня репозитория. Env-override `DEPLOY_MCP_REPO_ROOT` — если cwd не корень репо.

## Ограничения

- **Модель доверия процедурная.** `.mcp.json` общий для всех сессий, поэтому `deploy_app`
  технически вызываем из любой сессии — как и SSH-ключ сегодня. По конвенции деплоит только
  BlackCove ([deploy-coordination](/.claude/rules/deploy-coordination.md)).
- **Фаза 1.** e2e-gate и инструменты `run_e2e`/`e2e_status` — Фаза 2 (Сессия D плана §16).
