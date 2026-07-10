# Выполненные задачи — Dashboard Agent

Детальное описание всех реализованных фич.

## Версия 0.6.0 — Deploy API для deploy-mcp (§18 Сессии B/C, 2026-07-10)

Слой, над которым построен `libs/deploy-mcp` (MCP-деплой вместо сырого SSH). Работа велась в связке с BlackCove (deploy agent).

### `POST /api/deploy/app` — переработан под структурированный статус

- **deployId** (`crypto.randomUUID`) + **ring-buffer истории** (последние 20 деплоев) вместо одного глобального `currentDeploy`; лог каждого деплоя капится (`MAX_OUTPUT_LINES=2000`, старые строки вытесняются с учётом `truncatedLines`).
- **Курсор логов** `sinceLine` в `GET /api/deploy/status` — возвращаются только строки после курсора + `totalLines`/`fromLine`, чтобы MCP-поллинг не тащил весь лог каждый раз. Новый `GET /api/deploy/history` (краткая история без логов).
- **staging** в body → `deploy-affected.sh --staging`. **spawn без shell**: аргументы массивом (`nsenter … deploy-affected.sh --app <app> [--staging]`), инъекция структурно невозможна.
- **Серверный guard** (defence in depth): `getCurrentServer()==='s3'` принимает только `staging:true`, `'s2'` — только production. Случайный прод-деплой на staging-раннер / staging-мусор на прод невозможен независимо от вызывающего.

### Два бага `/api/deploy/app`, вскрытые первым реальным вызовом через deploy-mcp

Эндпоинт **никогда не работал** для зашифрованных приложений (а это все) — при сыром SSH маскировалось ручным `export SOPS_AGE_KEY_FILE` у BlackCove:

1. **SOPS-проброс** (`4d970e7`): spawn не передавал `SOPS_AGE_KEY_FILE` → расшифровка `.env.docker.enc` падала. Фикс: `env: { ...process.env, SOPS_AGE_KEY_FILE: <host-путь> }`.
2. **sudo env-reset** (`1160e9e`, в `deploy-affected.sh`): при запуске через `nsenter` от root скрипт делает `exec sudo -u deploy` → sudo сбрасывает окружение → проброшенный токен-ключ теряется. Диагноз BlackCove. Фикс — дефолт `SOPS_AGE_KEY_FILE` в самом скрипте после sudo-блока (без `--preserve-env`, который рискует уронить sudo).

Подтверждено: `deploy_app({app:"time"})` через deploy-mcp → **exitCode 0**, deployId + sinceLine + self-re-exec + SOPS — всё на реальном прогоне.

### server-config.ts — s1 убран, s3 добавлен, guard-тест

- Тип `CronServer` → `'s2' | 's3'` (s1 выведен из эксплуатации 2026-06-20), fallback `getCurrentServer()` → s2.
- `server-config.ts` — **локальная копия** канона `@letar/infra-config` (Dockerfile.production изолирован от монорепо, прямой импорт сломал бы `bun install` в контейнере). Дрейф ловит **guard-тест** `server-config.guard.spec.ts` (сверяет `SERVER_APPS`/`getServerForApp` с каноном на `nx test`). Заведена vitest-инфраструктура (не было): `vitest.config.ts`, `tsconfig.spec.json`, `test`-таргет.
- `cron.ts` — удалены две мёртвые s1-задачи. `types.ts` — `ApiResponse<T = unknown>` (env.ts использовал без аргумента).

### docker-compose: консолидация + s3-инстанс

- **`docker-compose.s2.yml` удалён** — устаревший дубль (живой всегда был `production.yml`, подтверждено `docker inspect`; `driving-school-network` в нём вестигиальный — `driving-school-db` на `premium-network`).
- **`docker-compose.s3.yml`** — staging-инстанс: `SERVER_NAME=s3`, без прод-секретов `/secrets/*.env`, без `~/.ssh`. Токен — `AGENT_TOKEN: ${AGENT_TOKEN_S3:?…}` (отдельный s3-токен из общего `.env.docker.enc`, fail-safe против пустого). Публикация **`127.0.0.1:13103:3100`** (loopback) — host:3100 занят media-api, а loopback-bind разом чинит конфликт порта И закрывает агента от интернета.

**Файлы:** `src/routes/deploy.ts`, `src/lib/server-config.ts` (+ `.guard.spec.ts`), `src/lib/cron.ts`, `src/types.ts`, `vitest.config.ts`, `tsconfig.spec.json`, `project.json`, `docker-compose.s3.yml`, удалён `docker-compose.s2.yml`.

**Связанное (вне apps/dashboard-agent):** `libs/infra-config` (канон), `libs/deploy-mcp` (MCP-слой), `deploy-affected.sh` (харденинг + self-re-exec + SOPS-дефолт). Полная картина — корневой `PLAN.md` §18 Сессия №52.

## Версия 0.5.2

### Алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` раньше только логировал провал задачи в in-memory `executionLogs` — никакого сигнала наружу не было. Теперь при не-2xx ответе или exception вызывается `POST /api/alerts` в dashboard (`CRON_FAILED`, заголовок `X-Cron-Secret`); ошибки самого уведомления не роняют выполнение задачи, только логируются.

Зарегистрировано приложение `dsperevod` в `APP_PORTS` (3019) / `APP_HOSTS` (`dsperevod-app`) + новая дефолтная задача `dsperevod-email-health-check` (`0 */6 * * *`, `server: 's2'`) — вызывает `dsperevod`'s `/api/cron/email-health-check` (`transporter.verify()` без реальной отправки письма).

**Файлы:**

- `src/lib/cron.ts` — `notifyDashboardAlert()`, вызов в обеих failure-ветках `executeJob()`, новые записи в `APP_PORTS`/`APP_HOSTS`/`DEFAULT_CRON_JOBS`

**Секреты:** `CRON_SECRET` сгенерирован (`openssl rand -base64 32`), прописан в `.env.docker.enc` — ранее не был настроен, `X-Cron-Secret` отправлялся с fallback-значением `'default-cron-secret'`.

## Версия 0.4.0

### Мониторинг cron задач

- Парсинг cron расписаний (cron-parser)
- Отслеживание выполнения задач
- Интеграция с node-cron

### Улучшения PostgreSQL

- Детальная статистика по базам
- Размер баз данных
- Количество подключений

---

## Версия 0.3.0

### PostgreSQL мониторинг

- Подключение к PostgreSQL через pg
- Сбор метрик: размер, подключения, активность
- Endpoint `/databases`

---

## Версия 0.2.0

### Docker мониторинг

- Интеграция с Docker через dockerode
- Список контейнеров со статусом
- Метрики CPU/Memory для контейнеров
- Endpoint `/containers`

### CORS

- Поддержка CORS для Dashboard UI
- @fastify/cors middleware

---

## Версия 0.1.0

### HTTP сервер

- Fastify 5 как основа
- Структурированные роуты
- JSON ответы

### Системные метрики

- systeminformation для сбора данных
- CPU: usage, cores, температура
- Memory: used, total, available
- Disk: used, total, filesystem

### API Endpoints

| Endpoint   | Описание            |
| ---------- | ------------------- |
| `/health`  | Health check        |
| `/metrics` | Все метрики системы |

---

**Последнее обновление:** 2026-02-02
