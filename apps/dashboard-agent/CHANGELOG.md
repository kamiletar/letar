# Changelog

Все значимые изменения в Dashboard Agent документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Planned

- Отправка метрик в Dashboard
- WebSocket для real-time

## [0.9.7] — 2026-07-30

### Changed

- `lib/history.ts`: `getHistory()` при downsampling (>500 точек в ответе) теперь усредняет
  значения внутри временных бакетов вместо взятия каждой N-й точки. Раньше кратковременные
  скачки CPU/памяти/диска между выбранными точками пропадали из графика при запросе истории
  за 7d/30d; закрывает пункт бэклога «Агрегация за интервалы» (`PLAN.md`).

## [0.9.6] — 2026-07-30

### Docs

- **Оценка унификации дебаунс-паттерна алертов** (`lib/email-canary.ts` vs
  `lib/backup-freshness.ts` vs `lib/health-check.ts`) — по запросу проверена возможность
  вынести общий generic-хелпер `runDebouncedCheck<TState>` поверх `loadJsonState`/`saveJsonState`.
  Вывод: нет — три реализации различаются не деталями, а типом триггера: email-canary — счётчик
  `consecutiveFailures` с порогом `ALERT_THRESHOLD` на две независимые ноги; backup-freshness —
  один плоский `alerted`, level-triggered; health-check — level-triggered `Record<string, boolean>`
  для порогов CPU/память/диск/БД, но ОТДЕЛЬНО edge-triggered переход состояния контейнеров
  (`Record<string, string>` с предыдущим значением, не просто boolean, плюс `restarting` вообще
  не дебаунсится). Единый хелпер либо не покрыл бы edge-triggered случай, либо превратился в
  конфигурационный комбайн сложнее прямого кода. Решение и критерий пересмотра — расширенный
  комментарий в `lib/json-state-file.ts`. Код логики не менялся.

## [0.9.5] — 2026-07-30

### Docs

- **Оценка унификации Redis-backed history (`routes/deploy.ts` vs `lib/cron.ts`)** — по запросу
  проверена, достаточно ли похожи два места с паттерном «ring-buffer в памяти → best-effort
  персист в Redis → rehydrate при старте → пометка running-записей как interrupted/error», чтобы
  оправдать общий `createRedisBackedHistory<T>` уже на двух потребителях. Вывод: нет — формы
  хранения расходятся по существу (плоский глобальный ring-buffer с индексом-LIST и одним ключом
  на элемент в deploy.ts, vs N независимых per-job ring-buffer с индексом-SET и одним ключом на
  группу в cron.ts), плюс разная стратегия персиста (дебаунс vs немедленно). Решение и критерий
  возврата к вопросу — комментарий в `lib/redis.ts`. Код не менялся.

## [0.9.4] — 2026-07-30

### Added

- **`@fastify/rate-limit`** — глобальный лимит `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`
  (по умолчанию 600 запросов/мин на IP) поверх `AGENT_TOKEN`, закрывает Backlog
  «Безопасность → Rate limiting». `127.0.0.1`/`::1` в `allowList` — не режет собственные
  cron-вызовы агента на себя же (`app: 'dashboard-agent'` в `cron.ts`).
- **`lib/ip-whitelist.ts`** — опциональный whitelist `ALLOWED_IPS` (точные IP или IPv4 CIDR
  через запятую), preHandler до `authMiddleware`. Не задан — проверка выключена, поведение
  не меняется. Закрывает Backlog «Безопасность → Whitelist IP адресов».
- **Redis-персистентность логов cron-задач** (`lib/cron.ts`) — `executionLogs` теперь
  персистится в Redis (`dashboard-agent:cron:logs:<jobId>`, TTL 30 дней) по тому же паттерну,
  что `deployHistory` в `routes/deploy.ts` (0.8.3): `rehydrateExecutionLogsFromRedis()` при
  старте восстанавливает историю, записи в статусе `running` при рестарте помечаются `error`.
  Закрывает половину Backlog «Логи cron-задач в памяти, `CronExecutionLog` в БД dashboard —
  мёртвая модель» — выбран путь «переживает рестарт через Redis в самом dashboard-agent»
  вместо записи в БД `dashboard` (та архитектура и так pull-based — `dashboard` не хранит
  копий метрик/логов агента, только на лету запрашивает через `RemoteServerClient`).
  Модель `CronExecutionLog` в схеме `dashboard` при этом остаётся неиспользуемой — решение
  об её удалении миграцией вне scope dashboard-agent (см. PLAN.md Backlog).

## [0.9.3] — 2026-07-30

### Refactor: синхронизация `app-registry.ts` `APP_PORTS` с каноном `@letar/infra-config`

Значения портов в локальной копии `APP_PORTS` (обязательна — `Dockerfile.production` изолирован от `libs/`) теперь сверяются с каноном `@letar/infra-config` guard-тестом `app-registry.guard.spec.ts`, по тому же паттерну, что уже применялся к `SERVER_APPS`/`server-config.guard.spec.ts`. Набор приложений в локальной копии не менялся — только источник истины для номеров портов.

## [0.9.2] — 2026-07-30

### Added

- **`lib/health-check.ts` + `routes/health-check.ts`** — `POST /api/cron/health-check`
  (крон каждые 5 мин, s2), закрывает Backlog «Алерты при превышении порогов» (P2):
  проверяет CPU/память/диск против порогов (`HEALTH_CPU_THRESHOLD`/`HEALTH_MEMORY_THRESHOLD`/
  `HEALTH_DISK_THRESHOLD`, по умолчанию 90%), состояние Docker-контейнеров (переход
  running→exited/dead и состояние `restarting` как индикатор crash-loop) и доступность БД
  (контейнер запущен, но подключение не проходит). Алертит через существующий
  `postDashboardAlert()` типами `CPU_HIGH`/`MEMORY_HIGH`/`DISK_HIGH`/`CONTAINER_DOWN`/
  `CONTAINER_RESTARTED`/`DATABASE_DOWN` — эти типы существовали в `DashboardAlertType` и схеме
  `dashboard` с самого начала, но ни разу не вызывались. Дебаунс (один алерт на непрерывный
  эпизод) через `json-state-file.ts`, тот же паттерн, что `email-canary.ts`/
  `backup-freshness.ts`.

## [0.9.1] — 2026-07-29

### Added

- Крон-задача `studio-check-budget-alerts` (каждые 30 мин, s2) — алерты 75/90/100% по потолку
  часов почасовых проектов studio (Фаза 11 блок D).

## [0.9.0] — 2026-07-28

### Added

- **Таймаут на `POST /api/e2e/run`** (15 мин, SIGTERM → SIGKILL через 10с) — часть hard
  e2e-gate для archetest/dsperevod/svoichuzhie/aboi/aprel8008 (PLAN-INFRA.md §18.7). Без
  таймаута зависший Playwright-прогон никогда не писал `.last-e2e-status/<app>.json`, и
  hard-gate в `deploy-mcp` продолжал бы читать старый (возможно зелёный) статус. По срабатыванию
  таймаута, а также при ошибке самого процесса (`spawn`/`error`), статус явно пишется как
  `passed:false` — раньше при ошибке процесса `lastStatus` не писался вообще.

## [0.8.9] — 2026-07-28

### Changed

- **`APP_CONFIG` в `src/lib/database.ts` — убрано дублирование `host`/`containerName`**
  (Backlog, найдено ранее MagentaGlen как категория риска после инцидента studio 2026-07-04):
  `host` больше не отдельное поле в `defaults`, а всегда выводится из `containerName`
  (`getAppDbConfig()` → `host: config.containerName`). Опечатка при добавлении нового
  приложения (как у aboi/aprel8008 в 0.8.7) больше не может рассинхронить два поля одного
  объекта.
- **Общий `lib/json-state-file.ts`** — `loadJsonState`/`saveJsonState` вынесены из
  задублированного паттерна «читать/писать небольшой JSON-файл состояния, try/catch на
  каждую операцию», который был отдельно в `email-canary.ts` и новом `backup-freshness.ts`
  (0.8.8). Сам дебаунс-паттерн (пороги, `consecutiveFailures` у двух ног email-canary
  против плоского `alerted` у backup-freshness) не унифицирован — разная семантика, только
  низкоуровневое чтение/запись файла было идентично.

## [0.8.8] — 2026-07-28

### Added

- **`maddy-backup-freshness-check`** — новая cron-задача (раз в 6 часов, `s2`): проверяет,
  что самый свежий `maddy_*.tar.gz` в `/home/deploy/letar/backups/maddy` не старше 30 часов.
  Алертит через существующий `BACKUP_FAILED` (дебаунс — один алерт на непрерывный эпизод,
  тот же паттерн, что `email-canary.ts`). Закрывает урок инцидента 2026-07-28 (Этап 0.3
  корневого `PLAN.md`): бэкапы Maddy не шли 26 дней незамеченно, потому что ничего не
  проверяло факт их появления — `email-canary` проверяет доставку писем, не целостность
  самого бэкап-пайплайна. `POST /api/cron/backup-freshness-check`.

## [0.8.7] — 2026-07-28

### Fixed

- **Аудит охвата бэкапов БД (корневой `PLAN.md`, Этап 0.3) нашёл пробел: `aboi` и `aprel8008`
  вообще не бэкапились** — оба развёрнуты на s2 (`SERVER_APPS`), у обоих есть Postgres-БД,
  но `APP_CONFIG` в `src/lib/database.ts` их не перечислял, а `docker-compose.production.yml`
  не монтировал их `.env.docker` в `/secrets/`. Добавлены оба приложения (контейнеры `aboi-db`
  /`aprel8008-db`, БД `neyroaboi_prod`/`aprel8008`) — не только в аудит, но и в реальный
  ежедневный `pg_dump`-бэкап на `/home/deploy/letar/backups`.
  ⚠️ aboi — флагман 152-ФЗ-комплаенса, его БД не бэкапилась ни разу с момента, когда
  реестр `APP_CONFIG` был заведён — гэп не датирован точно, обнаружен только сейчас.
- **Дрейф `SERVER_APPS`: канон `@letar/infra-config` не содержал `studio`** (был только
  в локальной копии `src/lib/server-config.ts`) — `server-config.guard.spec.ts` падал
  красным на `main` до этого коммита. Добавлен `studio` в канон, тест снова зелёный.

## [0.8.5] — 2026-07-22

### Added: grep-фильтр в `POST /api/e2e/run`

Точечный e2e-прогон (проверить фикс одной страницы) гонял весь набор (~120 тестов),
потому что фильтровать было нечем. Добавлен опциональный `grep` в тело запроса,
пробрасывается в `playwright test --grep`. Валидация — deny-лист shell-небезопасных
символов (значение интерполируется в shell-строку на s3 через `nsenter`).

## [0.8.4] — 2026-07-22

### Refactor: Redis-клиент вынесен в @letar/redis-client

`lib/redis.ts` дублировал один и тот же паттерн graceful-degradation, что и
`animatrona-tracker`/`svoichuzhie`. Вынесено в общую библиотеку `libs/redis-client`
(`@letar/redis-client`) — `lib/redis.ts` теперь тонкая обёртка (`createRedisClient()`).
Поведение не изменилось. Проверено изолированной Docker-сборкой (та же схема, что ловит
"Module not found" на транзитивных `@letar/*`-импортах).

## [0.8.3] — 2026-07-22

### Feat: персистентность deploy-истории в Redis

`routes/deploy.ts` хранил `deployHistory` (ring-buffer до 20 деплоев + активный лог) только в
памяти процесса — рестарт/пересоздание контейнера `dashboard-agent` безвозвратно терял историю и
лог активного деплоя (найдено BlackCove 2026-07-22 на инциденте с email-canary, PLAN.md backlog).

- Новый `lib/redis.ts` — клиент `ioredis` с graceful degradation (тот же паттерн, что и
  `apps/animatrona-tracker/src/lib/redis.ts`): без `REDIS_URL` или при недоступности Redis
  деплой продолжает работать чисто в памяти, как раньше, без ошибок.
- `deploy.ts`: каждый деплой персистится в Redis (`dashboard-agent:deploy:item:<id>`, TTL 7 дней) +
  индекс порядка (`dashboard-agent:deploy:index`, список deployId). Лог пишется дебаунсом (не чаще
  раза в секунду на деплой — `appendOutput` может звать построчно на каждый chunk stdout/stderr),
  финальный статус — немедленно (`flushPersist`) на каждом пути завершения (`pull`, `restart`,
  `compose-up`, `deploy-app` close/error, `cancel`).
- При старте процесса `rehydrateFromRedis()` восстанавливает `deployHistory`. Записи, застигнутые
  в `running: true` (агент перезапустился посреди деплоя), помечаются `interrupted: true` —
  реальный исход после рестарта dashboard-agent не отслеживается.
- Redis (`letar-redis`, `infra/redis`) уже развёрнут на s2 и используется другими приложениями
  (`animatrona-tracker`, `auth-hub`, `kami`, `driving-school`, `svoichuzhie`) — переиспользован тот
  же инстанс на `kami-network`, новая инфраструктура не поднималась.
  `docker-compose.production.yml`: `REDIS_URL: ${REDIS_URL:-redis://letar-redis:6379}`. На s3
  (staging) Redis не развёрнут — `REDIS_URL` там намеренно не задан, агент работает в чистом
  in-memory режиме без лишних error-логов о недоступном Redis.

### Docs: устойчивость nsenter-процесса к рестарту контейнера — прояснено

Backlog PLAN.md ставил вопрос: переживает ли `deploy-affected.sh`, запущенный через `nsenter`
(`lib/host-exec.ts`), обрыв родительского процесса dashboard-agent. Разбор флагов: `nsenter -t 1 -m
-u -n -i` НЕ включает `-p` (pid namespace) — не нужен, т.к. контейнер уже поднят с `pid: host` в
compose, поэтому спавненный процесс и так живёт в host PID namespace. Но **cgroup при этом не
меняется** — процесс остаётся в cgroup контейнера `dashboard-agent`, если явно не выполнен cgroup
escape (не делается). При `docker compose up -d` recreate Docker останавливает контейнер через
kill всей его cgroup — уносит с собой и nsenter-порождённый `deploy-affected.sh`, если тот ещё жив.
Это тот же механизм, что и в другом backlog-пункте («self-deploy обрывает сам себя на
recreate-шаге») — оба вытекают из общего factа: nsenter здесь даёт только namespace-изоляцию
(mount/uts/net/ipc), не cgroup-независимость. Полноценный fix (cgroup escape, например через
`systemd-run --scope` на хосте) не сделан в этой сессии — рискованное изменение общего
`deploy-affected.sh`, отдельная задача.

## [0.8.2] — 2026-07-22

### Fix: бесконечная рекурсия `loadAllCronJobs ↔ saveCronConfig` при отсутствующем конфиге

Обнаружено случайно в локальном dev-окружении (43k+ строк лога за секунды) — `loadAllCronJobs()`
при отсутствующем `cron-jobs.json` звала `saveCronConfig()`, которая сама звала `loadAllCronJobs()`
для мержа с другими серверами → взаимная рекурсия до `RangeError: Maximum call stack size
exceeded` (перехватывалась try/catch, не роняла процесс, но впустую жгла CPU и не давала файлу
реально создаться). В проде не стреляло, т.к. `/home/deploy/letar/` смонтирован и файл обычно уже
существует — но при сбое volume/прав это заблокировало бы даже `/health`. Фикс: разорвал рекурсию
через общий низкоуровневый примитив `readCronJobsFile()`/`writeCronJobsFile()`, ни одна из функций
больше не вызывает другую.

### Refactor: устранено дублирование алертинга и SMTP-отправки

- `lib/cron.ts`'s `notifyDashboardAlert` и `lib/email-canary.ts`'s `notifyCanaryAlert` дублировали
  один и тот же POST `/api/alerts` в dashboard — вынесены в общий `lib/dashboard-alert.ts`
  (`postDashboardAlert`). `APP_PORTS`/`APP_HOSTS`/`getAppUrl` вынесены в новый `lib/app-registry.ts`
  (нужны обоим модулям, избегает циклической зависимости).
- `email-canary.ts` дублировал часть SMTP-транспорта из `@letar/email` — переключён на
  `createEmailProvider()`. Библиотека `@letar/email` получила поддержку `bcc` в `SendEmailParams`
  (`0.2.0 → 0.3.0`, обратно совместимо) — понадобилось для canary's internal+external проверки
  одним письмом. Первый non-Next.js consumer `libs/*` в приложении на `@nx/esbuild` — проверено
  живым билдом и смоук-тестом, кросс-lib импорт резолвится корректно.

Прямая зависимость `nodemailer`/`@types/nodemailer` убрана из `dashboard-agent` — используется
только транзитивно через `@letar/email`.

## [0.8.1] — 2026-07-22

### Fix: краш процесса на зависшем IMAP-сокете email-canary (прод-инцидент, найден BlackCove)

После деплоя 0.8.0 необработанный `'error'` event на `ImapFlow` (`Socket timeout`) ронял весь процесс `dashboard-agent` — вместе с cron-планировщиком остальных задач и deploy-mcp API, попутно оборвав в проде деплой другого приложения. Два слоя фикса в `lib/email-canary.ts`: (1) `client.on('error', ...)` перехватывает событие вместо падения процесса, но если ошибка приходит вместо reject-а уже начатого `await`, тот `await` может повиснуть навсегда; (2) `waitForCanaryMessage()` обёрнут внешним `Promise.race` с жёстким дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по истечении — гарантирует ответ за конечное время независимо от внутреннего поведения ImapFlow. Плюс `acquireTimeout` на `getMailboxLock()`. Проверено вживую на реально зависшем IMAP-сокете (внешняя сетевая проблема до порта 993) — вместо зависания получен `ok:false` с причиной за ~105с, процесс не падает.

## [0.8.0] — 2026-07-22

### Feat: канареечный мониторинг доставки email (PLAN.md Этап 0.7)

Новый `lib/email-canary.ts` + роуты `POST /api/cron/email-canary-check` / `GET /api/cron/email-canary-check/status`. Раз в 15 минут (`email-canary-check`, s2) отправляет тестовое письмо через SMTP выделенного ящика `canary@letar.best` (Maddy) и проверяет round-trip двумя независимыми ногами: **internal** (письмо появляется во входящих того же ящика по IMAP — жив ли сам Maddy) и **external** (то же письмо доставляется BCC на реальный внешний ящик, напр. Gmail — ловит класс инцидентов «форвард режется gmail», первопричину Этапа 0). Обе ноги опциональны — если соответствующие `EMAIL_CANARY_*` не заданы, нога просто не проверяется, ошибкой не считается. Состояние (счётчик подряд-неудач, история последних 30 прогонов с latency) персистится в `/home/deploy/letar/email-canary-state.json`. При 3 подряд неудачах одной ноги — алерт в dashboard (`POST /api/alerts`, переиспользован тип `CRON_FAILED`, отдельный `AlertType`/миграция схемы признаны непропорциональными ради этой задачи); при первом успехе после провалов счётчик и флаг алерта сбрасываются. Новые зависимости: `imapflow`, `nodemailer`. **Требует провижининга** — ящик `canary@letar.best` на Maddy (`maddy creds create`) и, для external-ноги, внешний почтовый ящик с IMAP-доступом — оба вне скоупа кода, см. PLAN.md Этап 0.7.

## [0.7.5] — 2026-07-15

### Chore: удалены мёртвые ссылки на `premium-rosstil`/`imot`

`APP_PORTS`/`APP_HOSTS` в `cron.ts`, `SERVER_APPS` в `server-config.ts` и `APP_CONFIG` в `database.ts` больше не содержат записи для приложений, удалённых из монорепо 2026-07-05. Удалены две мёртвые cron-задачи (`imot-session-reminders`, `imot-practice-diary-reminders`), которые пытались выполниться против несуществующего контейнера. `docker-compose.production.yml` больше не монтирует несуществующие `apps/premium-rosstil/.env.docker` / `apps/imot/.env.docker`.

## [0.7.0] — 2026-07-10

### Feat: e2e API-роут (PLAN.md §18 Сессия D)

`POST /api/e2e/run` — запускает `nx e2e <app>-e2e` против staging-контейнера (`E2E_BASE_URL=<app>.s3.letar.best`), только на s3 (staging-раннер). Асинхронно, как `/api/deploy/app`: возвращает `runId`, прогресс через `GET /api/e2e/status` (ring-buffer + курсор `sinceLine`, тот же паттерн, что деплой). По завершении пишет персистентный `.last-e2e-status/<app>.json` (`{ commitSha, passed, timestamp, durationMs }`) — читается warn-gate'ом `deploy-mcp` перед production-деплоем.

## [0.5.2] — 2026-07-05

### Feat: алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` теперь при провале задачи (не-2xx ответ или exception) вызывает `POST /api/alerts` в dashboard (`CRON_FAILED`, `X-Cron-Secret`) — раньше провал только логировался локально in-memory, никакого сигнала наружу не было. Добавлена задача `dsperevod-email-health-check` (`0 */6 * * *`, s2) — проверка SMTP-транспорта dsperevod через `transporter.verify()`. Зарегистрирован `dsperevod` в `APP_PORTS`/`APP_HOSTS` (порт 3019, хост `dsperevod-app`).

## [0.5.0] - 2026-04-04

### Added

- Бэкапы 6 недостающих production БД

## [0.4.0] - 2026-01-XX

### Added

- Мониторинг cron задач
- Улучшенный сбор метрик PostgreSQL

### Changed

- Обновлён Fastify до v5
- Оптимизирован сбор метрик Docker

## [0.3.0] - 2026-01-XX

### Added

- Мониторинг PostgreSQL баз данных
- Endpoint `/databases`

## [0.2.0] - 2026-01-XX

### Added

- Мониторинг Docker контейнеров
- Endpoint `/containers`
- CORS поддержка

## [0.1.0] - 2026-01-XX

### Added

- Fastify HTTP сервер
- Сбор системных метрик (CPU, RAM, Disk)
- REST API (`/health`, `/metrics`)
- Базовая структура проекта
