# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [1.26.4] — 2026-09-03

### Fixed

- `src/lib/auth.ts`: убран `session.cookieCache.strategy: 'jwt'`. Dashboard был единственным
  приложением монорепо с этой схемой — все dev-серверы монорепо на `localhost` делят один
  cookie-jar (cookie не различаются по порту), и JWT в `better-auth.session_data` (значение с
  точками) ронял `/api/auth/get-session` у любого другого приложения с дефолтной compact-схемой
  (`Invalid Base64 character: .`). Разбор и почему это не тронуло прод (host-only cookie, разные
  домены) — `.claude/docs/better-auth-localhost-cookie-jar-collision.md`. Альтернатива
  (`cookiePrefix` каждому из ~14 приложений) отклонена: несоразмерна dev-only риску и разово
  разлогинивает пользователей на проде при выкатке.

## [1.26.3] — 2026-09-03

### Changed

- `src/jobs/scheduler.ts` переведён на общую фабрику `createAppJobsModule` из `@letar/jobs`
  (PLAN-INFRA-4.md §75) — тот же рефакторинг, что применён к `studio`. Файл схлопнулся с ~75
  строк до 8 ре-экспортов; globalThis-кеш планировщика и загрузка `JobOverride` теперь общий код
  библиотеки, а не копия между приложениями. Публичные имена функций и поведение не менялись.

## [1.26.2] — 2026-09-03

### Changed

- Убран дубль ANSI-парсера: `DeployLogDialog.tsx` держал свою копию маппинга ANSI-кодов
  (`ANSI_COLORS`, `parseAnsi`) с палитрой, отличной от общей `src/lib/ansi-to-react.tsx`
  (уже переиспользуемой в `LogsDialog.tsx`/`DeployProgress.tsx`). Теперь `DeployLogDialog.tsx`
  использует общий `AnsiText`, оставив только свою уникальную эвристику раскраски строк без
  ANSI-кодов. `allowedMatches` в `scripts/check-theme-hardcodes.mjs` актуализирован.

## [1.26.1] — 2026-09-03

### Added

- Гейт сырых UI-значений `theme:check` (`nx g @letar/generators:theme-check-integrate dashboard`,
  `@letar/theme-check`) — подключён в `dependsOn` у `lint`. Первый прогон нашёл настоящие
  находки: 5 мест с `transition="... 0.2s"` (magic-number длительность) переведены на
  `transitionProperty` + `transitionDuration="moderate"`; палитра брендовой темы вынесена из
  `theme-provider.tsx` в `src/theme/config.ts` (получила освобождение по `themePrefix`); цвета
  графика в `SystemOverview.tsx`/`MetricsChart.tsx`, совпавшие с реальными Chakra-токенами
  (`brand.500`/`green.400`/`blue.400`), переведены на `var(--chakra-colors-*, #fallback)`.
  Остальные находки — легитимные исключения (ANSI-палитра терминала в `DeployLogDialog.tsx`/
  `ansi-to-react.tsx`, `themeColor` в `layout.tsx`, ложное совпадение `#310` — номер ошибки React
  в комментарии) — занесены в `allowedMatches` с пояснением. Детали — `PLAN_COMPLETED.md`.

## [1.26.0] — 2026-09-03

### Added

- Собственные крон-задачи (`dashboard-heartbeat`, `s2-pageview-count`, `s2-ssl-check`) переехали
  на `@letar/jobs` (pg-boss) — по образцу пилота `studio` (PLAN-INFRA-4.md §75). Планировщик
  стартует из `instrumentation.ts`, задачи объявлены в `src/jobs/`, статус — `/api/jobs/status`
  (для будущего наблюдателя `dashboard-agent`) и новая страница `/jobs` (`requireAdmin()`,
  таблица `@letar/admin-ui` `JobsTable` — расписание, последний/следующий прогон, «Запустить
  сейчас», вкл./выкл. без редеплоя).
- Модель `JobOverride` — правка расписания/включённости через `/jobs` переживает деплой (та же
  идея, что уже решена для `DEFAULT_CRON_JOBS` `dashboard-agent`, но здесь код и UI-оверрайд
  примиряются, а не выбирается один источник).
- `deploy-affected.sh`: блокирующий гейт — прод-деплой приложения с `src/jobs/` останавливается,
  если `JOBS_ENABLED=true` не задан в расшифрованном `.env.docker` (защита от инцидента studio
  2026-08-13, где задачи сутки не тикали молча).

### Removed

- `app/api/cron/{heartbeat,pageview-count,ssl-check}/route.ts` — логика переехала в
  `src/jobs/*.ts`, HTTP-обёртка для `dashboard-agent` больше не нужна (агент перестанет дёргать
  эти три id отдельным шагом — только после живого прод-прогона через `/jobs`, см. PLAN-INFRA-4.md
  §75).

## [1.25.0] — 2026-09-03

### Added

- `Alert.notified` — nullable-поле (`null`/`true`/`false`): различает «уведомление не пыталось
  отправляться» (например `DEPS_VULNERABLE`, см. `lib/deps.ts`), «ушло» и «попытка провалилась».
  Проставляется через `markAlertNotified()` в `POST /api/alerts` и `ssl-monitor.ts` после каждой
  попытки `sendNotification()`.
- Heartbeat (`/api/cron/heartbeat`, PLAN-INFRA-3.md §52 «сторож для сторожа») теперь реагирует и
  на явно недоставленные алерты за 24 часа (`notified: false`), не только на их полное отсутствие —
  раньше молчал при ЛЮБОМ алерте за сутки, включая тот, что не смог дойти до Telegram. Новое
  сообщение `sendUndeliveredAlertsTelegram()` в `lib/notifications.ts`.

## [1.24.12] — 2026-09-01

### Fixed

- `overflowX="auto"` на `Card.Body`, оборачивающем `Table.Root` без своей обёртки со скроллом —
  4 места (`DepsPackageTable.tsx`, `database/backups/page.tsx`, `cron/page.tsx`,
  `PageViewsCard.tsx`). Без него узкая таблица на мобильных раздвигала `Card.Body` и скроллила
  всю страницу горизонтально вместо локального скролла самой таблицы — тот же баг, что был
  найден и починен в `domwellbes` (61 место). `DiskUsage.tsx`/`ProcessList.tsx` уже оборачивали
  `Table.Root` в собственный `Box overflowX="auto"` — не тронуты. `ImageList.tsx`, `AppsTable.tsx`,
  `docker/volumes`, `docker/networks`, `CronHistoryDialog.tsx` — таблицы там не внутри
  `Card.Body` (голый `Box`/`Dialog`), вне охвата этого фикса.

## [1.24.11] — 2026-08-31

### Changed

- `src/lib/prisma.ts` (ленивый нативный `PrismaClient` для better-auth `prismaAdapter()`)
  переведён на общую фабрику `createLazyPrismaAuthClient` из `@letar/auth/server` — тот же код
  дословно дублировался в 5 приложениях (dashboard, mandala, svoichuzhie, dsperevod, domwellbes).
  Поведение не изменилось.

## [1.24.10] — 2026-08-28

### Added

- Новый тип алерта `AUTH_LOGIN_CANARY_FAILED` в `AlertType` (миграция
  `20260828124810_add_login_canary_alert_type`) — создаётся `dashboard-agent`'ской синтетической
  канареечной проверкой входа каждые 30 минут (`login-canary-check`, PLAN.md корня §71 п.3.3):
  POST `/api/auth/sign-in/email` канареечными учётными данными на 9 приложений с реальным
  credential-входом, алерт при HTTP-ответе, отличном от 200, две неудачи подряд. Дополняет
  `AUTH_ACCOUNT_ISSUER_NULL` (п.3.2) — ловит любую поломку входа, не только NULL issuer.

## [1.24.9] — 2026-08-28

### Added

- Новый тип алерта `AUTH_ACCOUNT_ISSUER_NULL` в `AlertType` (миграция
  `20260828055033_alert_type_auth_account_issuer_null`) — создаётся `dashboard-agent`
  ежедневной cron-проверкой `Account.issuer IS NULL` по 14 приложениям с моделью Account
  (регрессия better-auth 1.7, PLAN.md корня §71 п.3.2). Дополняет статический гейт схемы
  `scripts/check-better-auth-schema.mjs` — тот ловит отсутствие поля, не уже вставленные NULL.

## [1.24.7] — 2026-08-28

### Refactor: сведён дубль `formatBytes`

Локальная копия в `SystemOverview.tsx` (всегда GB, 2 знака) удалена — общая `formatBytes` из
`src/lib/format.ts` расширена опциональным параметром `forceUnit` для принудительного выбора
единицы вместо автоподбора по логарифму. Видимый текст не изменился.

## [1.24.6] — 2026-08-25

### Fixed

- `Account.issuer` — добавлено в общий ZenStack-фрагмент `AccountFields`
  (`libs/zenstack-fragments`), better-auth 1.7.1 требует это поле при создании/обновлении
  `Account` (регистрация, сброс пароля). `db:push` прогнан, live sign-up не проверялся в этой
  сессии. См. [better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md).

## [1.24.4] — 2026-08-19

### Fixed: dev-сервер мог отдавать 500 из-за `@tanstack/devtools-ui@0.7.0`

Webpack-алиас `@tanstack/devtools-ui: false` расширен с `if (!dev)` на `if (isServer || !dev)` —
серверная половина графа сборки резолвит `solid-js/web` без экспорта `use`, который эта версия
devtools-ui импортирует через `@letar/query-provider`. Разбор — PLAN.md §51.

## [1.24.3] — 2026-08-19

### Refactor: SSE-хуки на общем `useEventSource` (`@letar/hooks`)

`useSSE`, `useUnifiedStream` и страница `/apps/[app]/logs` переведены с ручных
`new EventSource(...)` на общий `useEventSource` — дедупликация переподключения с backoff
(константный/экспоненциальный по месту использования), добавлено пересоздание соединения на
`visibilitychange`. API `useSSE`/`useUnifiedStream` не изменился, поведение сохранено.

## [1.24.1] — 2026-08-11

### Feature: dev-session bypass для preview-верификации

Дашборд входит только через OIDC Ключницы — headless-браузер не может пройти этот флоу,
поэтому UI-изменения было невозможно проверить вживую без ручного логина. Добавлен
`/api/auth/dev-session` через `@letar/auth/server` `createDevSessionRoute` — тот же паттерн,
что уже используют `domwellbes` и `grandslamcup`. Двойная защита `ALLOW_DEV_SESSION=true` +
`DEV_SESSION_TOKEN` (constant-time сравнение), обе переменные — **только в `.env.local`**,
никогда в `.env.docker`/`.env.docker.enc`. `NODE_ENV` не годится индикатором окружения
(`next build`/`next start` всегда `'production'`), поэтому единственная защита — эта пара
переменных, которая физически не попадает в прод-конфиг.

## [1.24.0] — 2026-08-11

### Feature: контроль зависимостей (§25 PLAN-INFRA.md, Этап 1 — MVP)

Еженедельный сбор данных об устаревших и уязвимых пакетах монорепо вместо ручного ритуала
«вспомнить и запустить `/infra:deps-update`». `scripts/deps-scan.ts` гонит `bun outdated` +
`bun audit` на машине разработчика (на сервере нет `node_modules`) и отправляет снапшот через
`POST /api/deps/scan` (авторизация `X-Cron-Secret`, как у `/api/alerts`). Новые модели
`DepScan`/`DepPackage` в схеме, страница `/deps` (баннер устаревания lockfile, карточки риска,
таблица пакетов с фильтрами/поиском/раскрытием advisory). При `high+` уязвимостях поднимается
алерт `DEPS_VULNERABLE` (переиспользован существующий дедуп `createAlert`/`resolveAlertsByType`).
`/repo` получил секцию «Здоровье зависимостей» — возраст lockfile по git-логу + предложение
запустить скан при возрасте >14 дней (только с подтверждением, без авто-запуска).
Автообновление пакетов сознательно не реализовано — только сбор данных и доклад, `bun update`
запускает человек. Анализ changelog моделью (Этап 2, `/infra:deps-analyze`) — не в этой версии.

## [1.23.0] — 2026-07-30

### Feature: проактивные алерты об истечении SSL сертификатов

Раньше срок действия сертификата был виден только визуально на `/nginx/certificates`
(цветной бейдж `CertificateCard`) — если никто не заходил на страницу, истечение
обнаруживалось только по факту падения HTTPS. Добавлена ежедневная проверка
(`lib/ssl-monitor.ts`, cron `s2-ssl-check` в dashboard-agent, 08:00 МСК): все сертификаты
из Nginx Proxy Manager, истекающие в ближайшие 30 дней или уже истёкшие, попадают в единый
алерт `SSL_EXPIRING` (WARNING/ERROR/CRITICAL по худшему сроку) со списком доменов, с
Telegram-уведомлением если включено в настройках. Когда проблемных сертификатов не остаётся —
алерт разрешается автоматически.

## [1.22.1] — 2026-07-30

### Fix: Telegram-уведомления не доходили с s1/s2 (ETIMEDOUT)

`api.telegram.org` заблокирован провайдером ДЦ на s1/s2 — прямые запросы к Bot API зависали.
Заменили три захардкоженных URL на `TELEGRAM_API_ROOT` (по умолчанию `tg-proxy.letar.best`,
обратный прокси на mail-сервере NL), тот же подход что в `apps/kami`/`apps/grandslamcup`.

## [1.22.0] — 2026-07-30

### Feature: статус CI (GitHub Actions) на главной странице

Карточка `GithubActionsCard` показывает последние 10 запусков workflow монорепо `letar` —
статус (успешно/ошибка/выполняется/отменено), ветку, ссылку на GitHub. Клиент
`src/lib/github-actions.ts` ходит в публичный GitHub REST API анонимно, `GITHUB_TOKEN`
опционален (только поднимает rate limit). Auth-gated `GET /api/github/workflow-runs` по тому
же паттерну, что и остальные API dashboard. Покрывает только публичный `kamiletar/letar` —
приватные submodule-репозитории вне охвата.

## [1.21.0] — 2026-07-30

### Feature: грубый счётчик посещаемости (hits/day/domain) без ПДн

Дополняет Umami там, где cookie-consent gate не пропускает часть трафика (посетители, ушедшие до
решения по баннеру, первый pageview у согласившихся). Новые модели `PageViewCount`/
`PageViewLogOffset`, `src/lib/pageview-counter.ts` инкрементально парсит access-логи Nginx Proxy
Manager через `nsenter` (без per-app middleware и без хранения IP/UA/строк лога — только число).
Cron-задача `s2-pageview-count` в dashboard-agent каждые 10 минут, `GET /api/analytics/pageviews` +
`PageViewsCard` на `/analytics`. Правовой разбор (152-ФЗ ст. 3) — почему обработке ПДн здесь взяться
неоткуда — см. PLAN.md.

## [1.20.7] — 2026-07-30

### Fix: дедупликация `AlertType`/`AlertSeverity` в `api/alerts/route.ts`

`z.enum` для `type`/`severity` в `CreateAlertSchema` дублировал строкой перечень значений
`enum AlertType`/`AlertSeverity` из `schema.zmodel` — добавление нового значения в схему без
синхронной правки `z.enum` давало молчаливый 400 при создании алерта этого типа. Теперь оба
`z.enum` строятся из `Object.values(AlertType/AlertSeverity)` (реэкспорт `@/generated/models`).

### Refactor: переименование `lib/npm.ts` → `lib/nginx-proxy-manager.ts`

Файлы `lib/npm.ts`/`lib/npm-client.ts` — клиент Nginx Proxy Manager, а не node package manager;
имя провоцировало путаницу при работе с будущей логикой npm-зависимостей. Переименованы в
`lib/nginx-proxy-manager.ts`/`lib/nginx-proxy-manager-client.ts`, импорты поправлены.

## [1.20.6] — 2026-07-30

### Fix: health-check бил в `localhost` вместо контейнера соседа по сети

`performHealthCheck()` в `app-metrics.ts` ходил по `http://localhost:<port>/api/health` для
`driving-school`, `mandala`, `kami`, `animatrona-landing` — но `dashboard-app` подключён к
`kami-network` обычным bridge-режимом (`network_mode: host` не выставлен, есть только
`pid: host`), поэтому `localhost` внутри контейнера — это сам dashboard-app, а не сосед по сети.
Проверено `docker exec dashboard-app` на s2: `localhost:3003` — `connection refused`,
`driving-school-app:3003` — `200 OK`. Для всех приложений кроме самого dashboard health-check
молча писал в БД `status: 'down'` с `error: 'fetch failed'` каждый цикл.

Добавлен канон `APP_HOSTS`/`getAppHost()` в `@letar/infra-config` (то же место, что и `APP_PORTS`)
— имя контейнера/network alias приложения в `kami-network`. `app-metrics.ts` теперь ходит по
`http://${getAppHost(app)}:${port}` с явным исключением для самого dashboard (`localhost`, тот же
контейнер). Guard-тест `app-registry.guard.spec.ts` (dashboard-agent) расширен: проверяет, что
локальная копия `APP_HOSTS` не разошлась с каноном (кроме self-reference `dashboard-agent`).

## [1.20.5] — 2026-07-30

### Removed: мёртвый allow-list `SUPPORTED_DATABASES`/`DatabaseNameSchema`

Расследование расхождения между `SUPPORTED_DATABASES` (`constants.ts`, 3 приложения) и `APP_CONFIG` в `dashboard-agent/database.ts` (16 приложений с реальными pg_dump-бэкапами) показало, что это не баг UI восстановления бэкапов — восстановление отключено целиком, для всех БД без исключения. `_actions/database-actions.ts` (`restoreBackup`, `removeBackup`, `executeMigrations`) и `/api/database/[db]/restore/route.ts` безусловно возвращают ошибку/`501`, независимо от переданного имени БД: `dashboard-agent` не реализует restore/delete/migration-эндпоинты, только `status`/`stats`/`backup`/`backups`. Сам `SUPPORTED_DATABASES` и весь читавший его `api/_schemas/common.ts` (`AppNameSchema`, `DatabaseNameSchema`, `DeployStartSchema`, `DatabaseRestoreSchema`, `ContainersQuerySchema`) не импортировались ни одним живым роутом — список БД для кнопок бэкапа UI уже брался динамически из `/api/database/available`. Удалён `common.ts`, из `constants.ts` убраны `SUPPORTED_DATABASES`/`SUPPORTED_APPS`/`DatabaseName`/`AppName`.

## [1.20.3] — 2026-07-30

### Removed: мёртвая страница `/deploy/history`

`GET /api/deploy/history` безусловно возвращал 501 («Deploy history is not available. Deploy runs via dashboard-agent.») независимо от query-параметров — страница `/deploy/history` всегда падала в состояние ошибки ещё до рендера фильтров (`KNOWN_APPS`, включая устаревший `label-printer`, был лишь симптомом). Удалены: страница, `/api/deploy/history/route.ts`, `/api/deploy/logs/[id]/route.ts` (тоже безусловная 501-заглушка, использовалась только удалённой страницей) и `DeployLogsDialog.tsx`. Ссылка «History» убрана с `/deploy`.

## [1.20.2] — 2026-07-30

### Refactor: `APP_PORTS` вынесен в канон `@letar/infra-config`

`app-metrics.ts` больше не держит собственную карту портов приложений — импортирует `getAppPort()` из `@letar/infra-config` (тот же канон, что уже даёт `SERVER_APPS` для dashboard-agent). Список приложений, для которых dashboard делает health-check (`MONITORED_APPS`), остался локальным явным решением — канон отвечает только за «какой у кого порт», не «кого опрашивать». См. `PLAN.md` § «Единый источник правды для карты портов» за разбором, что вынесено, а что сознательно оставлено (`SUPPORTED_DATABASES`, `KNOWN_APPS`, `dashboard-agent/database.ts` `APP_CONFIG` — это curated-списки со своей бизнес-логикой, не тот же класс дупликации).

## [1.20.1] — 2026-07-28

### Refactor: `X-Cron-Secret` через `@letar/api-server`

`/api/cron/heartbeat` и `/api/alerts` переведены на общий `verifyCronSecret()` из `@letar/api-server` вместо дублированной инлайн-проверки `CRON_SECRET`. Попутно поправлен doc-пример поля `imageName`/`domain` в `schema.zmodel` (ссылался на decommissioned `premium-rosstil`, заменён на `driving-school`).

## [1.19.4] — 2026-07-15

### Chore: удалены мёртвые ссылки на `premium-rosstil`/`imot`

Оба приложения удалены из монорепо 2026-07-05, но остались в хардкоженных картах портов (`app-metrics.ts`, `legacy-container-map.ts`), списках БД/приложений (`constants.ts`), UI-ветках (`cron/page.tsx`, `deploy/history/page.tsx`, `storage/route.ts`) и seed-данных `DeployedApp` (`prisma/seed.ts`). Также убраны volume-маунты `apps/premium-rosstil/.env.docker` / `apps/imot/.env.docker` из `docker-compose.production.yml` — указывали на несуществующие пути. Фантомные строки `DeployedApp` на прод-БД удалены отдельно (BlackCove, тред `cleanup-deployedapp-premium-imot`).

## [1.19.2] — 2026-07-05

### Feat: `POST /api/alerts` — впервые задействован Telegram-алертинг

Ранее `createAlert()`/`sendTelegramNotification()` существовали, но нигде не вызывались — вся система алертов была мёртвым кодом. Добавлен `POST /api/alerts` (авторизация `X-Cron-Secret`, Zod-валидация): создаёт `Alert` и, если в `AlertSettings` включён Telegram, сразу отправляет уведомление. Первый вызывающий — `dashboard-agent` при провале любой cron-задачи (`CRON_FAILED`), начиная с `dsperevod-email-health-check`.

## [Unreleased]

## [1.19.0] - 2026-04-01

### Added

- **Кнопка «Записать env» на SiteCard** — запись Umami env для существующих сайтов
  - Общий `api.ts` с типами и функциями (`writeEnvToServer`, `fetchEnvStatus`, `fetchSiteStats`)
  - Оранжевая подсветка для сайтов без env, зелёная галочка после успешной записи
  - Batch-проверка статуса env через `GET /api/analytics/env-status?apps=...`
- **Мульти-серверная маршрутизация env** — поддержка s1 (dashboard-agent) и s2 (nsenter)
  - `env-status` и `env` routes маршрутизируют через DB lookup (DeployedApp → Server)
  - Dashboard-agent: новый `GET /api/env-status` endpoint для batch-проверки
  - Dashboard-agent: автосоздание `.env.docker` если файл отсутствует

### Fixed

- Ошибки записи env показывают реальную причину вместо общего тоста
- Кнопка записи env не сбрасывается на оранжевую после успеха (invalidateQueries вместо setTimeout)
- Домен animatrona-tracker в seed.ts (`tracker.letar.best` → `animatrona-tracker.letar.best`)
- Автосоздание `.env.docker` если файл не существует (вместо 404)

## [1.18.0] - 2026-03-31

### Changed

- **Централизованный реестр приложений (Фаза 2)** — полное удаление хардкоженных списков
  - `CreateProxyHostDialog` заполняет форму из props (БД) вместо fetch на npm-config API
  - npm-config API переписан на DB lookup (`prisma.deployedApp.findFirst`)
  - Dashboard-agent `/api/apps/:app/npm-config` читает `.env.docker` динамически без валидации
  - Обновлена документация: `deployment-assistant`, `create/new-app`

### Removed

- Удалён `src/lib/secrets.ts` — захардкоженные `APP_CONFIG` и `STATIC_APP_CONFIG` больше не нужны
- Удалён хардкод `APP_CONFIG` из `dashboard-agent/src/routes/apps.ts`

## [1.17.0] - 2026-03-29

### Added

- **Централизованный реестр приложений (Фаза 1)** — единый источник данных
  - Поле `domain` в модели `DeployedApp` (nullable для CLI-приложений)
  - Seed обновлён с доменами всех 17 приложений (s1 + s2)
  - API `/api/apps/list` возвращает `domain` + поддержка `?all=true` для всех серверов
  - `AddSiteDialog` загружает приложения из БД вместо захардкоженного `KNOWN_APPS`

### Fixed

- **Umami API error propagation** — реальное сообщение ошибки пробрасывается до UI
  - Ранее показывалось generic "Ошибка создания сайта"
  - Теперь видно конкретную причину (дубликат, невалидный домен и т.д.)

## [1.16.0] - 2026-03-02

### Added

- **Страница аналитики Umami** — сводная статистика всех сайтов
  - Карточки с метриками: просмотры, посетители, bounce rate (24h)
  - Ссылки на Umami UI для каждого сайта
  - Кнопка «Добавить сайт» с быстрым выбором приложений монорепо
  - Автозапись `NEXT_PUBLIC_UMAMI_WEBSITE_ID` в `.env.docker` через nsenter
  - API routes: `/api/analytics/sites`, `/api/analytics/stats`, `/api/analytics/env`
  - Навигация: пункт «Аналитика» в Sidebar

### Infrastructure

- **Переинициализация Umami** — новые credentials, 8 сайтов созданы через API
- **Скрипт `scripts/umami-setup.sh`** — автоматизация инициализации Umami (login, смена пароля, создание сайтов)
- **Скрипт `scripts/pull-env-docker.sh`** — обратная синхронизация `.env.docker` с серверов на локалку
- Все приложения обновлены с новыми Umami Website ID

## [1.12.0] - 2026-01-25

### Changed

- **Декомпозиция крупных модулей** — рефакторинг без изменения поведения
  - `lib/docker.ts` (760 строк) → `lib/docker/` папка (client, containers, images, volumes, networks, system)
  - `lib/deploy.ts` (688 строк) → `lib/deploy/` папка (types, utils, history, affected, executor)
  - `lib/cron.ts` (669 строк) → `lib/cron/` папка (types, config, expression, executor, scheduler)
  - `lib/monitoring.ts` (587 строк) → `lib/monitoring/` папка (state, checks, collectors, controller)
  - `lib/system-metrics-history.ts` (563 строк) → `lib/system-metrics/` папка (types, storage, aggregation, query)
  - `servers/page.tsx` (892 строк) → 488 строк + `_types/`, `_api/`, `_components/` (ServerForm, AppForm, AppsTable, DiscoveredApps, HealthBadge)
- Barrel exports (index.ts) для обратной совместимости импортов
- **DRY: централизация форматирования дат** — добавлены функции в `lib/format.ts`:
  - `formatDateTime()` — полная дата и время
  - `formatDateOnly()` — только дата
  - `formatTimeOnly()` — только время
  - `formatLastDeployed()` — для дат деплоя (fallback 'Никогда')
  - `formatShortDate()` — краткая дата (день + месяц)
- Устранено дублирование форматирования в 3+ файлах (AppsTable, RemoteServerDeploy, cron/page)

## [1.11.0] - 2026-01-23

### Added

- **Мульти-серверная архитектура** — поддержка мониторинга нескольких серверов
  - Dashboard-agent для сбора метрик с удалённых серверов
  - Модель DeployedApp для хранения информации о серверах
  - API `/api/servers/` для управления серверами (CRUD)
  - UI страница `/servers` для выбора и управления серверами
  - ServerSelector в Header для быстрого переключения
  - ServerProvider для глобального состояния текущего сервера

### Changed

- **Переезд Dashboard на s2.letar.best** — Dashboard теперь работает на отдельном сервере
- **Документация NPM** — добавлена серверная архитектура, инструкции по развёртыванию агента

### Infrastructure

- s1.letar.best: premium-rosstil, imot, mandala, kami, pravda, animatrona-landing, umami + dashboard-agent
- s2.letar.best: driving-school, dashboard (NPM: npm.s2.letar.best)

## [1.10.1] - 2026-01-19

### Fixed

- **Статус планировщика cron не обновлялся** — после нажатия "Запустить" статус оставался "Остановлен"
  - Причина: `scheduledTasks` Map терялся между запросами из-за перезагрузки модулей в Next.js
  - Решение: использование `globalThis` для персистентного хранения состояния планировщика

## [1.10.0] - 2026-01-19

### Added

- **Автозапуск cron планировщика** — задачи запускаются автоматически при старте Dashboard
  - Интеграция в `/api/monitoring/auto-start` endpoint
  - Запуск при первом обращении к приложению (в production или с AUTO_START_MONITORING=true)
  - Флаг предотвращения повторного запуска

---

Продолжение в ./CHANGELOG_2026_08_09.md (версии 0.1.0 — 1.9.0)
