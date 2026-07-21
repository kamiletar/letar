# Changelog

Все значимые изменения в Dashboard Agent документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Planned

- Отправка метрик в Dashboard
- WebSocket для real-time

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
