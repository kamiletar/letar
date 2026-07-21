# Dashboard Agent — План развития

## Текущая версия: 0.8.0

Легковесный агент мониторинга для удалённых серверов.

---

## Реализовано ✅

- [x] Fastify HTTP сервер
- [x] Сбор системных метрик (systeminformation)
- [x] Мониторинг Docker контейнеров (dockerode)
- [x] Мониторинг PostgreSQL баз
- [x] REST API для метрик
- [x] CORS для Dashboard

---

## В работе 🚧

### Deploy MCP + staging (корневой PLAN.md §18, сессия №49 2026-07-09)

Часть работ §18, относящаяся к dashboard-agent:

- [x] `routes/deploy.ts`: deployId (randomUUID) + ring-buffer истории (20 деплоев) + cap логов (2000 строк) + курсор `sinceLine` + `GET /api/deploy/history` + `staging` в body + spawn аргументами без `bash -c` — **закоммичено `8498c06`**
- [x] `lib/server-config.ts`: s1 убран (сервер выведен 2026-06-20), тип `'s2' | 's3'`, fallback s2 — **закоммичено `8498c06`**
- [x] `lib/cron.ts`: удалены две мёртвые задачи `server: 's1'` — **закоммичено `8498c06`**
- [x] Серверный guard: `getCurrentServer()==='s3'` → только `staging: true`, `'s2'` → только production (defence in depth) — **сделано**
- [x] `@letar/infra-config` как канон + guard-тест сверки (НЕ прямой импорт — Dockerfile изолирован; локальная копия `server-config.ts` + `server-config.guard.spec.ts` ловит дрейф) — **закоммичено `8498c06`**
- [x] `docker-compose.s3.yml`: SERVER_NAME s3, без прод-секретов `/secrets/*.env`, без `~/.ssh`, отдельный AGENT_TOKEN (раскладка через BlackCove при provision) — **сделано**
- [x] Консолидация compose: `docker-compose.s2.yml` удалён как устаревший (живой — `production.yml`, подтвердил BlackCove через `docker inspect`; `driving-school-network` в s2.yml вестигиальный — `driving-school-db` на `kami-network`) — **сделано**
- [x] Роут `routes/e2e.ts`: `POST /api/e2e/run`, `GET /api/e2e/status`, запись `.last-e2e-status/<app>.json` (сессия D) — реализован ранее, но первый живой прогон (2026-07-11, §18 Сессия D) сразу упал: `spawn nx ENOENT` (спавнил `nx` напрямую внутри контейнера, где nx физически нет). Исправлено на `nsenter -t 1 -m -u -n -i` в host-namespace, как в `deploy.ts` — заодно найдена и закрыта command injection (`project` из POST-body шёл в shell-строку без валидации). `0.7.0 → 0.7.1`.
- [x] `docker-compose.s3.yml`: добавлен опциональный (`required: false`) `env_file: .env.s3-e2e.local` — способ прокинуть `DEV_SESSION_TOKEN` в spawn-окружение `run_e2e` (nsenter наследует env процесса dashboard-agent) без попадания секрета в `.env.docker(.enc)`, что запрещено `.claude/rules/env-files.md` для `ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN`. Файл не коммитится, живёт только на s3. BlackCove, коммит `5f71bd3c` (2026-07-11).
- [x] `routes/e2e.ts`: обнаружен и исправлен баг найденный BlackCove на живом staging-прогоне grandslamcup (2026-07-11) — `nxCommand` не переключался с root на `deploy` (в отличие от `deploy-affected.sh:11-19`), из-за чего каждый `run_e2e` на s3 создавал root-owned `.nx/workspace-data` и `apps/<app>-e2e/test-output`, ломающие следующий `deploy_app`/`run_e2e` (`EACCES`). Добавлен тот же `DEPLOY_AS_ROOT`-гвард (`if [ "$(id -u)" = "0" ]... exec sudo -u deploy -H --`) прямо в собираемую shell-строку. `0.7.2 → 0.7.3`.
- [x] `routes/e2e.ts`: регрессия от предыдущего фикса, найдена BlackCove тем же вечером (2026-07-11) — `sudo -u deploy -H` по умолчанию сбрасывает окружение (та же ловушка, что уже была с `SOPS_AGE_KEY_FILE` в `deploy-affected.sh`), из-за чего `BASE_URL`/`DEV_SESSION_TOKEN` не долетали до `bunx nx e2e` — Playwright не видел staging baseUrl, поднимал свой `nx dev` против dev-БД (`ECONNREFUSED :5453`), 28/28 falsely failed ещё на этапе webServer. Добавлен `--preserve-env=BASE_URL,DEV_SESSION_TOKEN` к `sudo`. `0.7.3 → 0.7.4`.
- [x] `routes/deploy.ts`: `POST /api/deploy/app` принимает `seed?: boolean` → добавляет `--seed` к `deploy-affected.sh` (`nx run <app>:db:seed` после успешного деплоя). Раньше seed после деплоя требовал сырого SSH-резерва (см. `.claude/rules/deploy-coordination.md`) — теперь доступен через `deploy_app({ app, seed: true })` в `libs/deploy-mcp`. `0.7.5 → 0.7.6`, коммит `64e558fc` (2026-07-18, BlackCove).

✅ Передеплой s2 на новый deploy API выполнен (сессия C, см. корневой `PLAN.md` §18). s3-инстанс тоже поднят и живой (staging + e2e-раннер).

### Канареечный мониторинг доставки email (корневой PLAN.md Этап 0.7, 2026-07-22, root-weaver)

- [x] `lib/email-canary.ts` + `routes/email-canary.ts` — `POST /api/cron/email-canary-check` (запускается планировщиком раз в 15 минут) и `GET /api/cron/email-canary-check/status` (последнее состояние без нового прогона). Код готов, `0.7.6 → 0.8.0`. Детали — `CHANGELOG.md`.
- [ ] **Провижининг (вне скоупа этой сессии, ручной шаг владельца/BlackCove):**
  - Создать ящик `canary@letar.best` на Maddy: `ssh root@31.56.180.161 "docker exec -it maddy maddy creds create canary@letar.best"` (пароль генерировать только `openssl rand -base64 32`, см. `.claude/rules/security.md`).
  - Заполнить `EMAIL_CANARY_SMTP_USER`/`EMAIL_CANARY_SMTP_PASSWORD`/`EMAIL_CANARY_INTERNAL_IMAP_*` в `apps/dashboard-agent/.env.docker` этим паролем → `./scripts/sync-env-docker.sh` → передеплой через BlackCove.
  - Для external-ноги (реальная доставка во внешний почтовик, ловит класс «форвард режется gmail») — завести/использовать внешний ящик (Gmail и т.п.) с IMAP-доступом (app password), заполнить `EMAIL_CANARY_EXTERNAL_*`. Опционально — без них внешняя нога просто не проверяется.
  - До заполнения секретов cron-задача `email-canary-check` будет молча возвращать `configured: false` по обеим ногам (не алертит, не считается провалом).
- **Примечание по алертингу:** переиспользован существующий `AlertType.CRON_FAILED` (`POST /api/alerts` в dashboard) вместо нового enum-значения — избежали Prisma-миграции на боевой БД ради этой задачи. Если понадобится отдельная фильтрация в UI dashboard/alerts — заводить `EMAIL_DELIVERY_FAILED` отдельной сессией.
- **Не покрыто (сознательно, вне MVP):** Umami-событие (§ Этап 0 упоминает Telegram+Umami как алертинг) — текущий alert-pipeline dashboard поддерживает только Telegram (`sendNotification` в `apps/dashboard/src/lib/notifications.ts`), заводить Umami-канал ради одной этой задачи не стали.

| Задача                         | Статус  | Приоритет |
| ------------------------------ | ------- | --------- |
| Отправка метрик в Dashboard    | ⏳ TODO | P1        |
| Алерты при превышении порогов  | ⏳ TODO | P2        |
| WebSocket для real-time метрик | ⏳ TODO | P3        |

---

## Backlog 📋

### Улучшения сбора метрик

- [ ] Мониторинг сетевого трафика
- [ ] Мониторинг логов контейнеров
- [ ] История метрик (локальный буфер)
- [ ] Агрегация за интервалы

### Безопасность

- [ ] API токен авторизация
- [ ] Rate limiting
- [ ] Whitelist IP адресов

### Интеграции

- [ ] Prometheus exporter
- [ ] Telegraf совместимость
- [ ] Grafana datasource

---

## Команды разработки

```bash
# Разработка (watch mode)
nx dev dashboard-agent

# Сборка
nx build dashboard-agent

# Запуск
nx start dashboard-agent

# Проверки
nx lint dashboard-agent
nx typecheck dashboard-agent
```

---

**Последнее обновление:** 2026-02-02
