# @letar/deploy-mcp

MCP-сервер: структурированный слой над REST API dashboard-agent для управления деплоем.

Даёт агентам (в первую очередь **BlackCove**) деплой через типизированные инструменты
вместо сырого SSH + ручного парсинга stdout. Вся деплой-логика остаётся в
`deploy-affected.sh` и `dashboard-agent` — здесь только тонкие HTTP-обёртки поверх
уже существующего API, через SSH-туннель.

## Инструменты

| Инструмент                                         | Действие                                                                                                                                | Эндпоинт агента           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `list_servers()`                                   | Серверы + маппинг «приложение → сервер» (статика из `@letar/infra-config`)                                                              | —                         |
| `agent_health({ server })`                         | Health-check (отличает «сервер недоступен» от «токен неверный»)                                                                         | `GET /health`             |
| `git_status({ server })`                           | Ветка, незапушенные/входящие коммиты — проверять перед деплоем                                                                          | `GET /api/git/status`     |
| `deploy_status({ server, deployId?, sinceLine? })` | Статус деплоя + инкрементальные логи по курсору `sinceLine`; включает `phases[]`/`stalled`                                              | `GET /api/deploy/status`  |
| `deploy_wait({ server, deployId?, waitSeconds? })` | Long-poll вместо ручного опроса по таймеру — отпускает раньше `waitSeconds` (≤120с) при терминальном статусе/смене фазы/смене `stalled` | `GET /api/deploy/wait`    |
| `deploy_cancel({ server })`                        | Отмена текущего деплоя (SIGTERM)                                                                                                        | `POST /api/deploy/cancel` |
| `deploy_app({ app, target, seed? })`               | Запуск деплоя (`target`: `production`\|`staging`, `seed`: `--seed`) + e2e-gate (warn-only, hard для `HARD_GATED_APPS`)                  | `POST /api/deploy/app`    |
| `run_e2e({ app, baseUrl, project?, grep? })`       | Запуск Playwright e2e на s3 против `baseUrl`; `grep` — точечный прогон вместо всего набора                                              | `POST /api/e2e/run`       |
| `e2e_status({ app?, runId?, sinceLine? })`         | Статус e2e-прогона + персистентный `lastStatus` (что читает gate)                                                                       | `GET /api/e2e/status`     |

`server` — `s2` (прод, по умолчанию) или `s3` (staging). В `deploy_app` сервер резолвится
автоматически из `app` + `target` (staging → всегда s3). `run_e2e`/`e2e_status` всегда ходят
на s3 — это единственный e2e-раннер (см. `e2e-testing.md`).

### e2e-gate в deploy_app(production)

Перед запуском production-деплоя (`target` не `"staging"`) `deploy_app` читает
`.last-e2e-status/<app>.json` на s3 (через `agent_health`-туннель) и собирает причины, если:
данных нет; последний прогон упал; прогонялся на другом коммите, чем деплоится; старше 24ч;
или сам запрос статуса не удался (сеть/туннель).

Два режима одновременно (`evaluateE2eGate()` в `server.ts`):

- **Warn-only** (по умолчанию) — деплой не блокируется, причины просто дописываются в начало
  ответа как предупреждения.
- **Hard gate** (fail-closed) — для приложений из `HARD_GATED_APPS` (`@letar/infra-config`:
  сейчас `archetest`, `dsperevod`, `svoichuzhie`, `aboi`, `aprel8008`) любая причина **блокирует**
  деплой: инструмент возвращает `isError` до вызова `/api/deploy/app`, ни `deploy_app`, ни
  сам прод-деплой не выполняются. Обхода флагом нет (PLAN-INFRA.md §18.7, инцидент archetest
  2026-07-28 — сломанный рендер, не пойманный HTTP-проверками деплоя). Для `grandslamcup` (§18.6
  Фаза 3) hard gate — отдельное, ещё не принятое решение после недели warn-only; он в
  `HARD_GATED_APPS` не входит.

Типичный staging-пайплайн (реальный HTTPS-домен — максимально близко к прод-окружению, `localhost`
не годится для проверки cookie/CORS/OIDC-редиректов):

```
deploy_app({ app: "grandslamcup", target: "staging" })                              // → образ на s3
run_e2e({ app: "grandslamcup", baseUrl: "https://grandslamcup-stage.s3.letar.best" }) // → nx e2e против staging
e2e_status({ app: "grandslamcup", sinceLine: 0 })                                    // поллинг + финальный lastStatus
deploy_app({ app: "grandslamcup" })                                                  // production — покажет gate-warnings
```

`baseUrl` — явный параметр (не выводится автоматически): единая конвенция
`https://<app>-stage.s3.letar.best` (один лейбл — попадает под существующий DNS wildcard
`*.s3 CNAME s3.letar.best`) → NPM proxy host на s3 (TLS через обычный Let's Encrypt HTTP-01) →
форвард на хостовый порт staging-контейнера через docker-хост-гейтвей — инфраструктурная задача,
выполняется через BlackCove/владельца. Данные staging-БД — анонимизированный снепшот прод
(`apps/<app>/scripts/anonymize-staging-db.ts`), не пустая/seed-БД — подробности в `deployment.md`.

### Типичный воркфлоу деплоя

```
git_status({ server: "s2" })                    // убедиться, что коммиты запушены
deploy_app({ app: "time" })                      // target: "production" по умолчанию
// → возвращает deployId
deploy_wait({ server: "s2", deployId, waitSeconds: 90 })  // ждёт смены фазы/терминала/stalled — повторяй, пока running: true
```

`deploy_wait` — рекомендуемый способ отслеживать прогресс (PLAN-INFRA.md §38): вместо
будильника с ручным поллингом `deploy_status` по таймеру, держит запрос открытым и
отпускает раньше `waitSeconds` (капается сервером на ~120с) при терминальном статусе,
появлении новой фазы в `phases[]` или смене `stalled`. Ответ — тот же снапшот, что и
`deploy_status`, но `output` — только хвост (20 строк), не весь лог по курсору.

`deploy_status({ server, deployId, sinceLine })` остаётся для точечного снапшота и полного
курсорного чтения лога — `sinceLine` возвращает только новые строки начиная с этого номера
(в ответе `totalLines`/`fromLine`). Экономит контекст при явном поллинге длинного деплоя.

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
- **e2e-gate warn-only для приложений вне `HARD_GATED_APPS`** — не блокирует деплой при
  отсутствии/провале e2e-данных. Для `grandslamcup` (PLAN.md §18.6) hard gate — отдельное,
  ещё не принятое решение после недели эксплуатации warn-only.
- **`run_e2e`/`e2e_status` требуют живого dashboard-agent на s3** — до тех пор возвращают ошибку
  туннеля/недоступности; для warn-only приложений `deploy_app(production)` при этом всё равно
  работает (gate просто warn'ит про недоступность s3, не падает), для `HARD_GATED_APPS` —
  недоступность s3 тоже блокирует (fail-closed).
- **`run_e2e` таймаут 15 мин** (`apps/dashboard-agent/src/routes/e2e.ts`) — зависший Playwright-
  прогон останавливается (SIGTERM → SIGKILL) и явно пишется как `passed:false`, иначе гейт читал
  бы устаревший «зелёный» статус, не зная о зависшем прогоне.
