# Changelog

Все значимые изменения в Dashboard Agent документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Planned

- Отправка метрик в Dashboard
- WebSocket для real-time

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
