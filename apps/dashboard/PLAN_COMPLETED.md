# Выполненные задачи — Dashboard

Детальное описание всех реализованных фич.

## Версия 1.20.6 — health-check ходил в localhost вместо соседа по kami-network (2026-07-30)

Разбор задачи: почему `/metrics` всегда показывал красный статус/0% uptime для
`driving-school`/`mandala`/`kami`/`animatrona-landing`, хотя сами приложения были живы.

`apps/dashboard/docker-compose.production.yml` подключает `dashboard-app` к `kami-network` обычным
bridge-режимом (`networks: [kami-network]`, БЕЗ `network_mode: host` — есть только `pid: host`,
который шарит PID-namespace, а не сеть). В bridge-режиме `localhost` внутри контейнера — это сам
контейнер, а не хост-машина и не соседи по сети. `performHealthCheck()` в `app-metrics.ts` делал
`fetch('http://localhost:<port>/api/health')` для всех `MONITORED_APPS` — что для самого dashboard
(тот же контейнер) работало, а для всех остальных было гарантированным `ECONNREFUSED`/`fetch
failed`, тихо пишущимся в БД каждый цикл health-check.

Подтверждено эмпирически на s2 (`docker exec dashboard-app`):

```
wget http://localhost:3003/api/health          → connection refused (EXIT:1)
wget http://driving-school-app:3003/api/health → {"status":"ok",...} (EXIT:0)
```

`driving-school`/`mandala`/`kami`/`animatrona-landing` — rollout-профиль (§18.6 Сессия J): без
`container_name`, доступны по network alias (`networks.kami-network.aliases`) из своих
`docker-compose.production.yml`: `driving-school-app`, `mandala-app`, `kami-app`,
`animatrona-landing-app` соответственно.

**Исправление** — по образцу `APP_HOSTS` из `apps/dashboard-agent/src/lib/app-registry.ts` (тот же
паттерн уже решал ту же проблему для межконтейнерных вызовов cron/алертов):

- `libs/infra-config/src/index.ts` — новый `APP_HOSTS`/`getAppHost()`, канон «истинного» сетевого
  имени контейнера каждого приложения (не self-reference — тот caller-specific, см. комментарий в
  коде). `dashboard: 'dashboard-app'` — как его видят ДРУГИЕ, не как он видит сам себя.
- `apps/dashboard/src/lib/app-metrics.ts` — `performHealthCheck()` собирает URL через
  `getAppHost(app)`, с явным исключением `app === 'dashboard'` → `'localhost'` (self-check, тот же
  контейнер).
- `apps/dashboard-agent/src/lib/app-registry.guard.spec.ts` — расширен второй проверкой: локальная
  копия `APP_HOSTS` в `app-registry.ts` не расходится с каноном (кроме `dashboard-agent` — тоже
  self-reference на `localhost`, отличается от того, как канон называет этот контейнер для чужих
  вызовов).

Не тронуто: `MONITORED_APPS` (локальное решение «кого проверяем», не канон), `dsperevod`/`studio`
добавлены в канон `APP_HOSTS` для полноты (уже были в `app-registry.ts` у dashboard-agent), но
`app-metrics.ts` их не опрашивает — вне текущего `MONITORED_APPS`.

Проверено: `nx test dashboard-agent`, `nx test @letar/infra-config`, `nx lint`/`typecheck:tsgo` на
`dashboard`, `dashboard-agent`, `@letar/infra-config` — зелёные. Живая проверка на s2 через
`docker exec` (см. выше) — до фикса.

## Версия 1.20.5 — мёртвый allow-list SUPPORTED_DATABASES/DatabaseNameSchema (2026-07-30)

Разбор задачи: `SUPPORTED_DATABASES` (`constants.ts`) — allow-list из 3 приложений
(`mandala`, `kami`, `driving-school`) для UI восстановления бэкапов, тогда как
`dashboard-agent/src/lib/database.ts` `APP_CONFIG` реально бэкапит 16 приложений. Гипотеза
из PLAN.md § «Единый источник правды для карты портов»: недоступна кнопка восстановления
для 13 приложений, чей бэкап реально идёт.

Гипотеза не подтвердилась. Восстановление отключено целиком, для всех БД без исключения,
задолго до вопроса allow-list:

- `apps/dashboard/src/app/_actions/database-actions.ts` — `restoreBackup`, `removeBackup`,
  `executeMigrations` помечены `@deprecated` и безусловно возвращают
  `{ success: false, error: '... not available via agent API.' }`, не обращаясь к агенту
- `apps/dashboard/src/app/api/database/[db]/restore/route.ts` — безусловный `501`, даже не
  парсит `DatabaseNameSchema`
- Причина — `dashboard-agent/src/routes/database.ts` вообще не реализует restore/delete/
  migration-эндпоинты, только `status`/`stats`/`backup`/`backups`

`grep` по `apps/dashboard/src` показал, что `DatabaseNameSchema`/`AppNameSchema` (и весь файл
`apps/dashboard/src/app/api/_schemas/common.ts`, который их экспортировал —
`DeployStartSchema`, `DatabaseRestoreSchema`, `ContainersQuerySchema`) не импортируются ни
одним живым файлом. Список БД для кнопок бэкапа на `database/backups/page.tsx` уже берётся
динамически через `GET /api/database/available` → `client.getDatabaseStatus()` (живой запрос к
агенту), в обход `SUPPORTED_DATABASES`.

**Удалено** (мёртвый код, не влиявший на поведение):

- `apps/dashboard/src/app/api/_schemas/common.ts` — файл целиком
- `apps/dashboard/src/lib/constants.ts` — `SUPPORTED_DATABASES`, `SUPPORTED_APPS`,
  `DatabaseName`, `AppName`

Проверено: `nx lint dashboard`, `nx typecheck:tsgo dashboard` — зелёные.

## Версия 1.20.3 — удалена мёртвая страница /deploy/history (2026-07-30)

При разборе задачи «`KNOWN_APPS` содержит устаревший `label-printer`» (см. PLAN.md v1.20.2)
выяснилось, что дело не в одной устаревшей константе фильтра. `GET /api/deploy/history/route.ts`
безусловно возвращал `{ success: false }` с кодом 501 («Deploy history is not available. Deploy
runs via dashboard-agent.») — без учёта query-параметров. Из-за этого `useQuery` на странице
`/deploy/history` всегда падал в ветку `historyError` ещё до рендера фильтров: не только кнопка
`label-printer` никогда не показывала данные, вообще ни один фильтр (включая `dashboard`) никогда
не доходил до списка записей. Страница была мёртвым кодом целиком, а не частично устаревшим списком.

Удалено вместе как один связанный кластер (всё появилось и умерло одновременно при переходе
деплоя на dashboard-agent):

- `apps/dashboard/src/app/deploy/history/page.tsx` — сама страница (с `KNOWN_APPS`)
- `apps/dashboard/src/app/api/deploy/history/route.ts` — безусловный 501-заглушка
- `apps/dashboard/src/app/api/deploy/logs/[id]/route.ts` — тоже безусловная 501-заглушка
  («Not implemented. Deploy logs are managed by dashboard-agent.»), использовалась только
  `DeployLogsDialog`
- `apps/dashboard/src/app/_components/deploy/DeployLogsDialog.tsx` — единственный потребитель
  удалённого роута логов
- Ссылка «History» и импорт `LuHistory` в `apps/dashboard/src/app/deploy/page.tsx`
- Строка `GET /api/deploy/history` в `README.md`

Общий `LogsDialog` (`_components/shared/LogsDialog.tsx`) не тронут — используется отдельно
`ContainerLogsDialog`. `/api/deploy/start`, `/api/deploy/status`, `/api/deploy/clear-logs` тоже не
тронуты — у них есть живые вызывающие (`RemoteServerDeploy`, `DeployProgress`, `server-client/remote.ts`).

Проверено: `nx typecheck:tsgo dashboard`, `nx lint dashboard` — зелёные.

## Версия 1.20.2 — единый канон APP_PORTS (2026-07-30, dashboard-dev)

Закрыл первый пункт backlog «единый источник правды для реестра приложений» (найден 2026-07-15
при чистке `premium-rosstil`/`imot`) — карту `app → port`. `SERVER_APPS` уже был вынесен в
`@letar/infra-config` раньше; по тому же паттерну добавлен `APP_PORTS`/`getAppPort()`.

`app-metrics.ts` теперь импортирует порт напрямую из `@letar/infra-config` (dashboard не
Docker-изолирован — подключил лib в `tsconfig.json`/`package.json`/`next.config.ts`
transpilePackages). `dashboard-agent/app-registry.ts` держит локальную копию значений (его
`Dockerfile.production` не видит `libs/`), дрейф от канона теперь ловит новый
`app-registry.guard.spec.ts` — тот же приём, что уже был у `server-config.guard.spec.ts`.

Список «кого мониторим» (`MONITORED_APPS`) в обоих модулях остался явным локальным решением —
канон отвечает только за «какой у кого порт», не за то, кого включать в опрос/вызовы. Это
осознанно: слепое использование полного канона вместо текущего явного списка расширило бы
набор health-check'аемых/вызываемых приложений тихо, без решения разработчика.

**Сознательно не тронуто** (не тот же класс дублирования — самостоятельные curated-списки со
своей бизнес-логикой, а не текстовое повторение одного факта): `SUPPORTED_DATABASES`
(`constants.ts`, allow-list из 3 приложений для UI восстановления бэкапов — сильно уже, чем
16 приложений в `dashboard-agent/database.ts` `APP_CONFIG`, возможно баг, но отдельная задача),
`KNOWN_APPS` (`deploy/history/page.tsx`, ручной UI-фильтр из 2 значений), `APP_CONFIG` в
`dashboard-agent/database.ts` (единственный владелец этих данных — `dashboard/lib/secrets.ts`
с аналогичной картой уже удалён в Фазе 2 v1.18.0).

Проверено: `typecheck:tsgo`/`typecheck`, `test`, `lint`, `build` — зелёные для `infra-config`,
`dashboard`, `dashboard-agent`. Коммит `759110cb`.

## Версия 1.20.1 — X-Cron-Secret через @letar/api-server (2026-07-28)

Закрыт хвост из корневого `PLAN.md` §0: проверка `CRON_SECRET` была продублирована идентичным кодом
(`!cronSecret || provided !== cronSecret`) в 6 местах монорепо (dashboard×2, studio×2, driving-school,
dsperevod). Вынес в `verifyCronSecret(request)` (`libs/api-server/src/lib/cron-secret.ts`, fail-closed —
без `CRON_SECRET` в окружении всегда `false`, покрыт unit-тестами). `/api/cron/heartbeat` и `/api/alerts`
переключены на него. Подключил `@letar/api-server` в `implicitDependencies`/`tsconfig.json` (paths +
references) — раньше не был подключён.

Попутно поправлен doc-пример в `schema.zmodel` (`imageName`/`domain` в `DeployedApp` ссылались на
decommissioned `premium-rosstil` — заменено на `driving-school`, `src/generated` перегенерирован
через `zenstack:generate`+`db:generate`, не трекается git).

## Версия 1.20.0 — Alert Heartbeat + фикс сломанного прод-билда (2026-07-28)

**Heartbeat-уведомление:** `POST /api/cron/heartbeat` — если за последние 24 часа не было
ни одного `Alert`, шлёт в Telegram «У всех всё хорошо» напрямую (`sendHeartbeatTelegram`,
без создания записи в БД — эфемерное подтверждение живости канала, а не событие для истории).
Отличает «всё правда хорошо» от «Telegram/канареечный путь сломан и молчит».

**⚠️ Попутно найден и починен production-баг, блокировавший билд целиком:** `next build`
падал на любом импорте из `@letar/auth/server` (`File libs/auth/src/server/index.ts is not
under rootDir 'apps/dashboard/src'`) — `tsconfig.json` имел `rootDir: "src"` + `composite: false`,
конфликтующие с `paths`-маппингом на сырые файлы `libs/auth/src/*` (библиотека без билд-шага,
`package.json` → `exports` указывают прямо на `.ts`). `nx typecheck:tsgo` эту категорию ошибок
не ловит (резолвит `libs/*` через TS project references иначе, чем `next build`/tsc — см. корневой
`CLAUDE.md`). Исправлено по образцу `driving-school`/`auth-hub`: `rootDir: "../.."` (корень
монорепо) + добавлен `@letar/auth` в `transpilePackages`.

**Масштаб:** BlackCove подтвердил при деплое — прод-билд был сломан с коммита `78340e8a`
(RP-Initiated Logout, v0.5.0), деплой dashboard не запускался с тех пор (последний живой образ —
с коммита `d074e9b5`, задолго до breaking-изменения).

**После деплоя** обнаружено в логах: `Error sending Telegram notification: [TypeError: fetch
failed] ETIMEDOUT` (повторяется) — Telegram API недоступен из контейнера прямо сейчас,
отдельная нерешённая проблема (сеть/DNS/файрвол), блокирует и heartbeat, и обычные алерты.

commit `d4374694`.

## Версия 1.19.4 — чистка мёртвых ссылок на `premium-rosstil`/`imot` (2026-07-15)

Найдено при разборе техдолга вне глобального `PLAN.md` (сессия `/repo` статус-отчёта). Оба приложения
удалены из монорепо 2026-07-05, но остались в 6 файлах кода: карты портов (`app-metrics.ts`,
`legacy-container-map.ts`), список поддерживаемых БД (`constants.ts`), UI-ветки цвета/known-apps
(`cron/page.tsx`, `deploy/history/page.tsx`), список web-приложений для storage-статистики
(`api/apps/[app]/storage/route.ts`) и seed-данные `DeployedApp` (`prisma/seed.ts`).

**Самое значимое:** `docker-compose.production.yml` монтировал `apps/premium-rosstil/.env.docker` и
`apps/imot/.env.docker` — путей, которых больше нет в репозитории. При следующем поднятии контейнера
Docker создал бы там пустые директории (реальный риск на будущем передеплое). Убрано.

**Прод-данные:** фантомные строки `DeployedApp` (`premium-rosstil`, `imot`) на прод-БД `dashboard`
существовали отдельно от кода — удалены BlackCove по запросу (agent-mail, тред
`cleanup-deployedapp-premium-imot`, msg #480/#483 → #484), FK-зависимостей не найдено.

`nx typecheck`/`lint` — чисто. commit `d7e8e49`.

## Версия 1.19.3

### Fix: резолвинг контейнера по `<name>-N` суффиксу, не только точным именем

Найдено при подготовке §18.6 Сессии G (`libs/deploy-engine`, `time` компоуз-миграция под
zero-downtime rollout, см. корневой `PLAN.md` §18.6): `doctor`-проверка `no-container-name`
требует убрать `container_name` из compose сервиса `app` (нужен для `docker compose --scale
app=2`), но Dashboard искал контейнер приложения по **точному** имени
(`DeployedApp.containerName`) — без `container_name` реальное имя контейнера становится
`<project>-app-1` (дефолтная нумерация compose), точное совпадение ломается, и Dashboard тихо
теряет docker stats/logs/status для приложения. Ломалось уже на обычном force-recreate пути, не
только при живом rollout.

**Fix:** `src/lib/server-client/find-container.ts` — `findContainerByName()` принимает точное имя
ИЛИ `<name>-N` с числовым суффиксом (не любой префикс — не ловит несвязанные контейнеры вроде
`<name>-worker`). При нескольких живых репликах (окно rollout) детерминированно берёт `-1`.
Подключено во всех 4 местах, где раньше было точное сравнение имени: `api/apps/[app]/{status,
stats,logs}/route.ts`, `api/docker/containers/by-name/[name]/status/route.ts`,
`api/servers/[id]/apps/[appId]/deploy/route.ts` (локальный restart-путь, тот же класс бага).

**Тестирование:** `dashboard` до сих пор без vitest вообще (преэкзистентный пробел, см.
`.claude/docs/unit-testing.md`) — проверено вручную (6 сценариев: точное имя, одна реплика без
`container_name`, обе реплики во время rollout, отсутствие совпадения, защита от ложного
срабатывания на `-worker`-суффикс, regex-экранирование спецсимволов в имени приложения).
`nx typecheck:tsgo`/`nx lint` — зелёные.

commit `8de3029`

### Впервые задействован Telegram-алертинг (POST /api/alerts)

`createAlert()` и `sendTelegramNotification()` существовали в `lib/alerts.ts`/`lib/notifications.ts` с самого создания системы алертов, но нигде не вызывались — весь pipeline был мёртвым кодом (проверено grep'ом по всему `src`).

Добавлен `POST /api/alerts` — принимает `{ type, severity, title, message, metadata }` (Zod-валидация, `AlertType`/`AlertSeverity` enum), авторизация `X-Cron-Secret` (тот же секрет, что `dashboard-agent` использует для вызова cron-эндпоинтов приложений). Создаёт `Alert` через `createAlert()`, затем если `AlertSettings.enabled` — вызывает `sendNotification()` → Telegram.

**Первый вызывающий:** `dashboard-agent` (`executeJob()`) — при провале любой cron-задачи на любом сервере создаёт алерт типа `CRON_FAILED`.

**Файлы:**

- `src/app/api/alerts/route.ts` — добавлен `POST` (ранее только `GET`)

**Секреты:** `CRON_SECRET` сгенерирован через `openssl rand -base64 32`, прописан в `.env.docker.enc` (ранее не был настроен нигде в монорепо — driving-school's cron-эндпоинт использовал другой заголовок авторизации, что тоже, судя по всему, ломало auth; вынесено отдельной задачей).

## Версия 1.19.0

### Кнопка «Записать env» на SiteCard + мульти-серверная маршрутизация

Запись Umami env переменных для существующих сайтов прямо из карточки, с поддержкой удалённых серверов.

**Файлы:**

- `src/app/_components/analytics/api.ts` — общие типы (`UmamiWebsite`, `SiteStats`) и функции (`fetchSites`, `fetchSiteStats`, `fetchEnvStatus`, `writeEnvToServer`)
- `src/app/_components/analytics/SiteCard.tsx` — IconButton для записи env с тремя состояниями (idle/writing/done) и цветовой индикацией (orange/green/gray)
- `src/app/analytics/page.tsx` — TanStack Query для batch env-status проверки
- `src/app/api/analytics/env-status/route.ts` — DB-маршрутизация: local → nsenter, remote → dashboard-agent
- `src/app/api/analytics/env/route.ts` — маршрутизация записи + автосоздание .env.docker
- `apps/dashboard-agent/src/routes/env.ts` — GET /api/env-status batch endpoint + автосоздание .env.docker

**Архитектура маршрутизации:**

1. Dashboard API получает запрос с именами приложений
2. Ищет в БД `DeployedApp` → `Server` (isLocal, agentToken)
3. Локальные (s2): nsenter → grep/cat на хосте
4. Удалённые (s1): HTTP запрос к dashboard-agent с Bearer token
5. Результаты объединяются и возвращаются клиенту

## Версия 1.16.0

### Аналитика Umami

Интеграция с Umami Analytics — сводная статистика и управление сайтами.

**Файлы:**

- `src/app/analytics/page.tsx` — страница аналитики с карточками сайтов
- `src/app/_components/analytics/SiteCard.tsx` — карточка с метриками (pageviews, visitors, bounce rate)
- `src/app/_components/analytics/AddSiteDialog.tsx` — диалог добавления сайта с быстрым выбором
- `src/app/api/analytics/sites/route.ts` — проксирование к Umami API (GET/POST)
- `src/app/api/analytics/stats/route.ts` — статистика сайта (период 24h/7d/30d)
- `src/app/api/analytics/env/route.ts` — запись Website ID в `.env.docker` через nsenter
- `scripts/umami-setup.sh` — скрипт инициализации Umami (создание сайтов, смена пароля)
- `scripts/pull-env-docker.sh` — обратная синхронизация `.env.docker` с серверов

**Возможности:**

- Карточки со статистикой: просмотры, уникальные посетители, bounce rate за 24h
- Цветовая индикация bounce rate (зелёный < 40%, жёлтый < 60%, красный >= 60%)
- Быстрый выбор приложений монорепо (Badge кнопки) с фильтрацией уже добавленных
- Автозапись `NEXT_PUBLIC_UMAMI_WEBSITE_ID` и `NEXT_PUBLIC_UMAMI_SCRIPT_URL` в `.env.docker`
- Копирование env переменных в буфер обмена
- Ссылки «Открыть в Umami» для детальной аналитики

**Архитектура:**

```
Dashboard UI (/analytics)
  → Dashboard API (/api/analytics/*)
    → Umami API (https://stats.letar.best/api/*)
```

Dashboard API авторизуется на Umami с серверными credentials (`UMAMI_API_URL`, `UMAMI_API_USER`, `UMAMI_API_PASSWORD`).

---

## Версия 1.9.0

### Миграция данных на PostgreSQL

Полная миграция с файлового/in-memory хранения на PostgreSQL через ZenStack ORM.

**Файлы:**

- `src/lib/alerts.ts` — Alert, AlertSettings модели
- `src/lib/cron.ts` — CronExecutionLog модель (замена Map в памяти)
- `src/lib/app-metrics.ts` — HealthCheck модель (замена Map в памяти)
- `src/lib/system-metrics-history.ts` — SystemMetric модель с multi-tier storage
- `src/lib/audit-log.ts` — AuditLog модель (замена JSONL файла)

**Особенности реализации:**

- Enum конвертация: DB (UPPERCASE) ↔ API (lowercase)
- BigInt для больших чисел (memoryUsed, diskUsed и т.д.)
- JSON metadata через `Record<string, any>` с eslint disable
- Multi-tier storage для системных метрик (realtime/hourly/daily)
- Cleanup функции для устаревших данных

**Преимущества:**

- Persistence данных при перезапуске
- Единообразие с другими приложениями (premium-rosstil, imot)
- Возможность сложных запросов и аналитики
- История хранится в PostgreSQL, не теряется

---

## Версия 1.1.0

### Cron Task Management

Полноценная система управления cron-задачами.

**Файлы:**

- `cron-jobs.json` — конфигурация задач (workspace root)
- `src/lib/cron.ts` — библиотека управления cron
- `src/app/api/cron/jobs/*` — REST API
- `src/app/_actions/cron-actions.ts` — Server Actions
- `src/app/cron/page.tsx` — UI страница
- `src/app/cron/_components/CronHistoryDialog.tsx` — история выполнения

**Возможности:**

- Просмотр списка задач с статусами
- Переключение enabled/disabled (useOptimistic)
- Ручной запуск задачи
- История последних выполнений
- Управление планировщиком (start/stop)
- Audit log для всех действий

### useOptimistic для Docker контейнеров

Мгновенная обратная связь при управлении контейнерами.

**Файлы:**

- `src/app/docker/containers/page.tsx` — useOptimistic + useTransition
- `src/app/_components/docker/ContainerCard.tsx` — визуальные состояния переходов

**Состояния:**

- Starting... — при запуске
- Stopping... — при остановке
- Restarting... — при перезапуске
- Removing... — при удалении

### useOptimistic для Settings

Мгновенный отклик на переключение настроек.

**Файлы:**

- `src/app/_actions/settings-actions.ts` — Server Actions для toggle
- `src/app/settings/page.tsx` — useOptimistic для switches

**Переключатели:**

- Enable Alerts
- Telegram Notifications
- Auto-Cleanup

---

## Версия 0.1.0

### Реализовано

- Базовая структура дашборда
- Виджеты мониторинга

---

**Последнее обновление:** 2026-03-02
