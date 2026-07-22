# Dashboard Agent — План развития

## Текущая версия: 0.8.2

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
- [x] **Internal-нога провижинирована (2026-07-22, root-weaver):** ящик `canary@letar.best` создан на Maddy (`maddy creds create`, пароль — `openssl rand -base64 32`), SMTP+IMAP auth проверены вживую (`nodemailer.verify()` + `ImapFlow.connect()`, оба OK). `EMAIL_CANARY_SMTP_USER`/`EMAIL_CANARY_SMTP_PASSWORD`/`EMAIL_CANARY_INTERNAL_IMAP_*` заполнены в `.env.docker`/`.env.docker.enc` (коммит `2a5aaa0d`), синхронизированы на s1/s2 через `scripts/sync-env-docker.sh dashboard-agent`. Деплой запрошен у BlackCove (thread `deploy-dashboard-agent-email-canary`).
- [x] **External-нога провижинирована (2026-07-22):** получатель `letarkami@gmail.com` (личный ящик владельца), IMAP app-password сгенерирован владельцем (потребовалось сперва включить 2FA — без неё Google скрывает страницу app-passwords). IMAP auth проверен вживую (`ImapFlow.connect()` к `imap.gmail.com:993`, OK). `EMAIL_CANARY_EXTERNAL_*` заполнены в `.env.docker`/`.env.docker.enc`, синхронизированы на s1/s2. Обе ноги теперь `configured: true`.
- [x] **Прод-инцидент найден и починен (2026-07-22, BlackCove + root-weaver, коммит `305c0ec7`, `0.8.0 → 0.8.1`):** первый деплой уронил весь процесс `dashboard-agent` на s2 — необработанный `'error'` на `ImapFlow` (`Socket timeout`) трактуется Node как фатальный, попутно оборвав деплой `aprel8008`, который в этот момент вёл BlackCove. Два слоя фикса: (1) слушатель `client.on('error', ...)` — устраняет краш, но если ошибка приходит вместо reject-а уже начатого `await`, тот `await` виснет навсегда; (2) `waitForCanaryMessage()` обёрнут внешним `Promise.race` с жёстким дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по истечении — гарантирует ответ за конечное время независимо от поведения ImapFlow изнутри, плюс `acquireTimeout` на `getMailboxLock()`. Живым прогоном воспроизведён реальный зависший IMAP-сокет (внешняя сетевая проблема до порта 993, не баг Maddy) и подтверждено: вместо зависания — `ok:false` с причиной за ~105с, процесс жив.
- **Примечание по алертингу:** переиспользован существующий `AlertType.CRON_FAILED` (`POST /api/alerts` в dashboard) вместо нового enum-значения — избежали Prisma-миграции на боевой БД ради этой задачи. Если понадобится отдельная фильтрация в UI dashboard/alerts — заводить `EMAIL_DELIVERY_FAILED` отдельной сессией.
- **Не покрыто (сознательно, вне MVP):** Umami-событие (§ Этап 0 упоминает Telegram+Umami как алертинг) — текущий alert-pipeline dashboard поддерживает только Telegram (`sendNotification` в `apps/dashboard/src/lib/notifications.ts`), заводить Umami-канал ради одной этой задачи не стали.
- [x] **Системные находки применены (2026-07-22, `0.8.1 → 0.8.2`):** (1) починена латентная бесконечная рекурсия `loadAllCronJobs ↔ saveCronConfig` в `lib/cron.ts` (обнаружена случайно в dev, не стреляла в проде); (2) `notifyDashboardAlert`/`notifyCanaryAlert` дедуплицированы в общий `lib/dashboard-alert.ts` (+ `lib/app-registry.ts` для `APP_PORTS`/`APP_HOSTS`/`getAppUrl`); (3) `email-canary.ts` переключён на `@letar/email` (`createEmailProvider`) вместо дублирования nodemailer-транспорта — потребовало добавить `bcc?` в `SendEmailParams` (`@letar/email` 0.2.0 → 0.3.0). Первый non-Next.js consumer `libs/*` в приложении на `@nx/esbuild` — проверено живым билдом + смоук-тестом. Детали — `CHANGELOG.md`.

| Задача                         | Статус  | Приоритет |
| ------------------------------ | ------- | --------- |
| Отправка метрик в Dashboard    | ⏳ TODO | P1        |
| Алерты при превышении порогов  | ⏳ TODO | P2        |
| WebSocket для real-time метрик | ⏳ TODO | P3        |

---

## Backlog 📋

### Хвосты imot/premium-rosstil в функциональном коде (найдено root-weaver, 2026-07-22)

Оба приложения удалены из монорепо 2026-07-05 (см. `project_premium_rosstil_imot_removed` в
памяти), но упоминания остались в **25+ файлах**. Один из них — `libs/infra-config/src/index.ts`
(`SERVER_APPS` всё ещё содержит `'premium-rosstil': 's2'` и `imot: 's2'`) — реально ломает
`server-config.guard.spec.ts` в `dashboard-agent` (канон ≠ локальная копия `SERVER_APPS`, которая
их уже не содержит с версии 0.7.5). Остальное — тихий тех-долг, не роняет ничего активно.

**Обнаруженные категории (`grep -rln "imot\|premium-rosstil"`, вне `apps/imot`/`apps/premium-rosstil`):**

- [ ] **Функциональные, стоит почистить:** `libs/infra-config/src/index.ts` (`SERVER_APPS` — причина
      падения теста), `scripts/sync-env-docker.sh` (`APPS` массив), `cron-jobs.json`/`cron-jobs.example.json`,
      `deploy-affected.sh` (только в `--help` тексте как пример, не в `S2_APPS` — уже чисто).
- [ ] **Docker-compose secret-mounts других живых приложений** (`apps/dashboard/docker-compose.production.yml`,
      `apps/kami/docker-compose.production.yml`, `apps/mandala/docker-compose.production.yml`,
      `infra/nginx-proxy-manager/docker-compose.yml`) — вероятно монтируют
      `apps/premium-rosstil/.env.docker`/`apps/imot/.env.docker`, которых больше нет; требует проверки
      на сервере, не просто грепа локально (случайно снести рабочий mount).
- [ ] **`apps/dashboard`** (реестр `DeployedApp`) — `prisma/seed.ts`, `src/lib/audit-log.ts`,
      `src/app/api/servers/[id]/apps/discover/route.ts`, `src/app/servers/_components/AppForm.tsx`,
      `src/generated/prisma/**` (НЕ трогать руками — генерируется, чистить через `schema.zmodel` +
      `zenstack:generate`, если там реально enum/константа).
- [ ] **Backup-скрипты:** `scripts/backup/db-backup.sh`, `db-restore.sh`, `list-backups.sh`,
      `scripts/pull-env-docker.sh`, `scripts/umami-setup.sh`.
- [ ] **Прочее:** `apps/driving-school/.../pin-auth-adapters.ts`, `libs/letar-consultant/src/prompt.ts`,
      `.socraticodecontextartifacts.json`, `tsconfig.json` (path-алиасы?).
- [ ] **Только doc-комментарии, косметика:** `libs/validation-utils/src/lib/{money,password,phone}.ts`
      (`* Используется в: premium-rosstil, imot` — списки использования в JSDoc, не код).

**Не трогать:** `.claude/worktrees/heuristic-roentgen-7645de/` — отдельный git worktree (заброшенный?),
не часть основного дерева, требует отдельного решения (удалить worktree или разобраться, что это).

**Зависимости:** независимая сессия — большая часть требует проверки на сервере (docker-compose
secret-mounts), не чисто локальный grep-and-replace.

### Надёжность deploy-истории (найдено BlackCove, 2026-07-22)

`routes/deploy.ts` хранит `deployHistory` (ring-buffer, `MAX_DEPLOY_HISTORY` записей) и стрим логов текущего деплоя **только в памяти процесса** (`const deployHistory: DeployStatus[] = []`). При падении/рестарте контейнера `dashboard-agent` вся история и лог активного деплоя теряются безвозвратно — `deploy_status`/`GET /api/deploy/history` отвечают «not found»/«No deploys yet», хотя сам `deploy-affected.sh` мог быть ещё жив на хосте (через `nsenter`) и продолжать деплой вслепую, без возможности его отследить через deploy-mcp.

**Инцидент-триггер:** 2026-07-22, email-canary (`lib/email-canary.ts`) уронил весь процесс dashboard-agent необработанным `error`-событием `ImapFlow` (`Socket timeout`) прямо во время деплоя aprel8008 — деплой пришлось доливать вручную через SSH-резерв, а прогресс из deploy-mcp пропал.

- [ ] Вынести `deployHistory` (и активный лог-стрим по `deployId`) во внешнее хранилище, переживающее рестарт контейнера — Redis (TTL на записи, cap как сейчас) или файл/SQLite на volume `dashboard-agent`. Redis предпочтительнее, если он всё равно появится для чего-то ещё в инфре (сейчас нигде в letar не используется как shared-стор — проверить перед добавлением новой зависимости).
- [ ] После рестарта — при старте процесса проверять, не был ли прерван `deploy-affected.sh` для какого-то приложения (маркер/pid-файл на хосте), и помечать соответствующую запись `interrupted`, а не молча терять.
- [ ] Заодно рассмотреть: `dashboard-agent` крашится → должен ли `deploy-affected.sh`, запущенный через `nsenter` от его имени, быть устойчивым к обрыву exec-сессии (сейчас неясно, продолжает ли он работать после потери родителя, или тоже гибнет) — прояснить и задокументировать поведение.

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
