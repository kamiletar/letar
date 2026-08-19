# Выполненные задачи — Dashboard

Детальное описание всех реализованных фич.

## Webpack-фикс `@tanstack/devtools-ui@0.7.0` — server-половина графа (2026-08-19)

Тот же баг, что уронил dev-сервер `driving-school` (500, `Attempted import error: 'use' is not
exported from 'solid-js/web'` через `@letar/query-provider`) — dashboard в зоне риска той же
причины (webpack в dev). Добавлен `webpack: (config, { dev, isServer }) => { if (isServer ||
!dev) { config.resolve.alias['@tanstack/devtools-ui'] = false } ... }`. Полный разбор — PLAN.md
§51 и `apps/driving-school/PLAN_COMPLETED.md`.

## Подключение к GlitchTip (2026-08-11)

Через новый генератор `nx g @letar/generators:glitchtip-integrate dashboard` (PLAN-INFRA.md §70
п.8). `src/instrumentation.ts` уже держал автостарт мониторинга (не native-модуль — через API,
см. комментарий в файле) — генератор не перезаписал файл, а напечатал снипет для ручного
слияния; glitchtip `register()`/`onRequestError` домержены рядом с существующей логикой, ничего
не удалено.

- [x] `src/instrumentation.ts` — домержен вручную (мониторинг + `@letar/glitchtip/server`)
- [x] `src/instrumentation-client.ts` — создан генератором
- [x] `package.json` — `@letar/glitchtip` в `dependencies` и `nx.implicitDependencies`
- [x] `tsconfig.json` — `paths` на `@letar/glitchtip`, `/client`, `/server`
- [x] `.env.docker`/`.env.docker.example` — 4 переменные через `${VAR}` в
      `docker-compose.production.yml` (не литералом — баг из инцидента `studio`)
- [x] `nx typecheck:tsgo dashboard && nx lint dashboard` — зелёные

**Не завершено:** GlitchTip-проект `dashboard` ещё не создан в UI (`errors.s3.letar.best`),
`GLITCHTIP_DSN` в `.env.docker` пустой — деплоить рано, см. `infra/glitchtip/README.md`.

## 1.23.1 → 1.23.2: дедуп CRON_FAILED алертов по jobId, тихие провалы уведомлений логируются (2026-08-09)

Найдено попутно при разборе `PLAN-INFRA.md` §52 (cron-задачи агента падали 401, восемь дней
без сигнала). Полный разбор инцидента и диагноз — там; здесь только сама правка в `dashboard`.

`createAlert()` (`src/lib/alerts.ts`) дедуплицировал активные алерты только по `type` —
для `CRON_FAILED` (общий тип для всех cron-задач монорепо) это схлопывало разные сломанные
задачи разных приложений в один алерт с `message` от последней упавшей, остальные были не
видны нигде. Теперь если `metadata.jobId` — строка, дедуп ищет активный алерт с тем же `type`
**и** `jobId` (JSON-фильтр Postgres-диалекта ZenStack v3 — `path: '$.jobId'`, JSONPath-формат,
не голое имя ключа). Алерты без `jobId` (CPU/память/диск) дедуплицируются как раньше.

`src/lib/notifications.ts`: `sendNotification()` логирует причину, когда отправить некуда
(канал не настроен), вместо тихого `false`. `src/app/api/alerts/route.ts`: проверяет
результат `sendNotification()` и отдельно логирует случай `AlertSettings.enabled === false`.

⚠️ Не проверено живым запросом к прод-Postgres — в `apps/dashboard` нет юнит-тестов вообще
(не только для этого файла), добавлять первый тест с моком `prisma` ради одной функции
посчитали непропорциональным; синтаксис JSONPath выведен чтением исходника
`@zenstackhq/orm`, не документации.

## 1.23.0 → 1.23.1: убраны references на libs из tsconfig.json — хрупкий TS6305 редирект (2026-08-07)

`references` на `libs/auth`, `libs/query-provider`, `libs/chakra-provider`, `libs/analytics`,
`libs/forms`, `libs/ui`, `libs/api-server`, `libs/infra-config` вели на solution-конфиг
библиотек — TypeScript брал последний подпроект из их `references` (`tsconfig.spec.json`),
чей output (`out-tsc/spec/`) не собирается ни одним Nx-таргетом → `TS6305`. Образец фикса —
`dashboard-agent` (0.11.1, `885ceaf2`), механика — `.claude/rules/libs.md`.

Убраны все `references` на `libs/*` (оставлен `./tsconfig.spec.json`). Приложение расширяет
`tsconfig.next-app.json` — после удаления `references` TypeScript инферил `rootDir` слишком
узко и падал `TS6059`; фикс — явный override `"rootDir": "../.."`. `nx typecheck:tsgo
dashboard` и `nx build dashboard` полностью чисты.

## Turbopack по умолчанию + Chakra/next-themes — риск гидратации (2026-08-04)

Аудит по мотивам находки в `apps/mandala` ([доки](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)):
Next.js 16 без явного `--webpack`/`--turbopack` выбирает Turbopack, что в связке с
`ChakraProvider` (через `@letar/chakra-provider`'s `RootChakraProvider`) и `next-themes`'ным
`ColorModeProvider` (`src/app/_components/ui/color-mode.tsx` + `theme-provider.tsx`) может
триггерить hydration mismatch (см. официальный доки Chakra UI, раздел «Hydration errors»).

Подтверждено: `nx dev dashboard` (без флага) стартовал на Turbopack
(`▲ Next.js 16.3.0 (Turbopack)`). `dev`/`build` инферились Nx-плагином `@nx/next` без флага
(в `project.json` был только частичный override `build.dependsOn`).

Применён фикс: добавлен `options.command: "next build/dev --webpack"` как **частичный**
override инферированного таргета (не полное дублирование, как в mandala) — Nx мержит
project.json-таргет с инферированным по ключам, так что `cache`/`inputs`/`outputs` у `build`
сохранились от плагина, изменился только сам флаг команды. Это более безопасный паттерн для
приложений, где `dev`/`build` инферятся (см. также driving-school ниже) — подтверждено через
`nx show project dashboard --json` (cache/inputs/outputs не изменились).

Проверено: `nx dev dashboard` поднимается на webpack (`▲ Next.js 16.3.0 (webpack)`), страница
`/` (редирект на логин «Войти через Ключницу») рендерится без ошибок в консоли.

⚠️ Инструмент предпросмотра (Browser pane, `preview_start`) для порта dashboard периодически
отдавал «navigation denied or failed» и терял `serverId` сразу после старта — воспроизвелось
и на исходном (Turbopack) варианте, не связано с этим фиксом. Обошлось прямым запуском
`nx dev dashboard` в фоне через Bash и навигацией на уже поднятый сервер.

## Версия 1.23.0 — проактивные алерты об истечении SSL сертификатов (2026-07-30)

**Задача:** последний пункт из «Идеи на будущее» PLAN.md. `/nginx/certificates` уже показывал
цветные бейджи истечения сертификата (`CertificateCard` — жёлтый ≤30 дней, красный истёк), но
это была чисто пассивная UI-индикация: без захода на страницу проблема с сертификатом
обнаруживалась только когда HTTPS уже переставал работать.

**Реализация:**

- `src/lib/ssl-monitor.ts` — `checkSslCertificates()`: `npmApi.getCertificates()` → фильтр
  по `daysUntilExpiry <= 30` → если есть проблемные, единый `createAlert(SSL_EXPIRING, ...)`
  с сообщением-списком доменов и худшей серьёзностью (WARNING >7 дней, ERROR ≤7 дней, CRITICAL
  уже истёк), плюс `sendNotification` если Telegram включён в `AlertSettings`. Если проблемных
  сертификатов не осталось — `resolveAlertsByType(AlertType.SSL_EXPIRING)`.
- `enum AlertType` (`schema.zmodel`) — добавлено значение `SSL_EXPIRING`, миграция
  `20260729232641_add_ssl_expiring_alert_type`.
- `POST /api/cron/ssl-check` (`verifyCronSecret`, тот же паттерн что `pageview-count`) —
  вызывается новой cron-задачей `s2-ssl-check` (`apps/dashboard-agent/src/lib/cron.ts`,
  `0 8 * * *`, сервер s2).
- Дедупликация алерта — по типу (не по домену), т.к. `createAlert` ищет существующий активный
  алерт по `(type, status=ACTIVE, serverId)` без доп. измерения — тот же паттерн, что уже
  использует `CONTAINER_DOWN`/`CRON_FAILED`. Все проблемные домены идут одним алертом со
  списком в `message`, а не отдельными записями — сознательное решение не расширять модель
  `Alert` под этот единственный случай.
- Проверено: `nx typecheck:tsgo dashboard`, `nx typecheck dashboard-agent`, `nx lint dashboard`,
  `nx lint dashboard-agent` — зелёные.

**Файлы:** `src/lib/ssl-monitor.ts`, `src/app/api/cron/ssl-check/route.ts`, `schema.zmodel`,
`prisma/migrations/20260729232641_add_ssl_expiring_alert_type/`, `apps/dashboard-agent/src/lib/cron.ts`

---

## Версия 1.22.1 — fix: Telegram-уведомления зависали на s1/s2 (2026-07-30)

**Проблема:** `Error sending Telegram notification: [TypeError: fetch failed] ETIMEDOUT` в логах
контейнера после деплоя v1.22.0 (обнаружено BlackCove при деплое). Причина уже задокументирована
в [deployment.md](/.claude/docs/deployment.md#telegram-api--прокси-через-mail-сервер):
IP-диапазоны `api.telegram.org` заблокированы провайдером ДЦ на s1/s2 — как для хостовых
процессов, так и для Docker-контейнеров. Решение (обратный прокси `tg-proxy.letar.best` на
mail-сервере, 193.37.68.73, NL) существовало для `apps/kami` и `apps/grandslamcup`, но dashboard
его не подключил — `src/lib/notifications.ts` и `src/app/_actions/settings-actions.ts` ходили
в `https://api.telegram.org` напрямую в трёх местах.

**Реализация:**

- `TELEGRAM_API = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'` в
  `notifications.ts` (`sendTelegramNotification`, `testTelegramNotification`,
  `sendHeartbeatTelegram`) и тот же паттерн inline в `testTelegramAction` (settings-actions.ts).
- `docker-compose.production.yml` — `TELEGRAM_API_ROOT: ${TELEGRAM_API_ROOT:-https://tg-proxy.letar.best}`,
  дефолт на прокси задан прямо в compose, поэтому правка `.env.docker.enc` на проде не потребовалась.
- Подтверждено деплоем: `env | grep TELEGRAM` в контейнере показывает переменную корректно, новых
  `ETIMEDOUT` после запуска не зафиксировано (только хвост старых ретраев с прошлого рестарта).

**Файлы:** `src/lib/notifications.ts`, `src/app/_actions/settings-actions.ts`,
`.env.docker.example`, `docker-compose.production.yml`

---

## Версия 1.22.0 — статус GitHub Actions CI на главной странице (2026-07-30)

**Задача:** пункт «Интеграция с GitHub Actions» висел в PLAN.md § «Идеи на будущее» без деталей.
Уточнено с пользователем: карточка на dashboard с последними прогонами CI для публичного
монорепо `kamiletar/letar` (без охвата приватных submodule-репозиториев — отдельный
`GITHUB_TOKEN` с доступом к приватным репо не заводился).

**Реализация:**

- `src/lib/github-actions.ts` — клиент `GET /repos/kamiletar/letar/actions/runs` (публичный REST
  API GitHub, анонимный доступ работает без токена на 60 запросов/час; опциональный
  `GITHUB_TOKEN` поднимает лимит до 5000/час).
- `GET /api/github/workflow-runs` — auth-gated роут, тот же паттерн, что `analytics/pageviews`
  (`getServerSession()` → 401 без сессии).
- `GithubActionsCard` на главной странице — последние 10 запусков, статус
  (успешно/ошибка/выполняется/отменено) через `status`/`conclusion`, ветка, ссылка на GitHub;
  `useQuery` с `refetchInterval: 60_000`.
- `.claude/launch.json` — добавлена конфигурация `dashboard` (порт 3002), которой раньше не было
  (единственное приложение без записи в launch.json на момент задачи).
- Проверка: репозиторий подтверждён публичным (`gh api repos/kamiletar/letar` →
  `"private":false`), `total_count: 0` в момент проверки — все 3 workflow (`publish-npm.yml`,
  `release-animatrona.yml`, `release-mac.yml`) триггерятся только по тегам, пустой список
  корректно обрабатывается состоянием «Запусков не найдено».

**Файлы:** `src/lib/github-actions.ts`, `src/app/api/github/workflow-runs/route.ts`,
`src/app/_components/github/GithubActionsCard.tsx`, `src/app/page.tsx`, `.claude/launch.json`

---

## Версия 1.21.0 — грубый счётчик посещаемости без ПДн, дополнение к Umami (2026-07-30)

**Проблема:** `UmamiScript` во всех приложениях с `@letar/ui` `CookieBanner` инициализируется
только после `analytics: true` в согласии (`AnalyticsGate`, personal-data.md §5 — корректно
с точки зрения 152-ФЗ opt-in). Следствие: Umami систематически не видит посетителей, ушедших до
решения по баннеру (самый ценный для воронки сегмент), и самый первый pageview даже у
согласившихся.

**Правовой разбор:** обсуждение 2026-07-29 про IP-хэш для счётчика **уникальных** посетителей
здесь неприменимо — там дедупликация требовала идентификатор (→ ПДн по практике РКН/судов). Цель
этой задачи — только знать посещаемость (сколько раз открыли страницу), не кто и не сколько
уникальных. Инкремент общего счётчика без привязки к посетителю не создаёт связи «данные ↔
определённое/определяемое физлицо» (152-ФЗ ст. 3) ни на одном шаге, поэтому это вообще не
обработка ПДн, и cookie-consent (который в этом монорепо покрывает именно передачу данных
посетителя третьей стороне — Я.Метрика/Umami) на неё не распространяется. Решение сознательно не
добавляет пункта в cookie-баннер — было бы избыточно для метрики без ПДн.

**Архитектурный выбор:** вместо middleware-инкремента в каждом из ~30 приложений (инвазивно,
рантайм-оверхед на каждый запрос) — единая точка на уровне Nginx Proxy Manager. NPM и так пишет
access-лог на каждый proxy host (`infra/nginx-proxy-manager/data/logs/proxy-host-<id>_access.log`
— по одному файлу на host, встроено в jc21/nginx-proxy-manager, не требует конфигурации). Новый код
только СЧИТАЕТ новые строки с прошлого запуска — сами строки лога (с IP/UA) в БД dashboard никогда
не попадают, оседает только число.

**Реализация:**

- `schema.zmodel` — `PageViewCount(date, domain, count)` уникален по `[date, domain]`;
  `PageViewLogOffset(domain, byteOffset)` — байтовый offset последнего прочитанного лога на домен
  (инкрементальный парсинг без повторного чтения всего файла при каждом тике).
- `src/lib/pageview-counter.ts`:
  - `updatePageViewCounts()` — получает proxy hosts из NPM API (`npmApi.getProxyHosts()`), для
    каждого через `nsenter` (паттерн `api/git/pull/route.ts`) читает размер файла (`stat -c%s`) и
    досчитывает строки от предыдущего offset (`tail -c +N | wc -l`); обрабатывает ротацию/усечение
    файла (logrotate) — если текущий размер меньше сохранённого offset, считает с начала.
  - `getPageViewsSummary()` — агрегат для UI: сегодня + сумма за последние 7 дней по домену.
  - Один access-лог на proxy host, не на domain_name — если у хоста несколько доменов, считается
    только первый (`domain_names[0]`); в летар сейчас нет таких хостов (см.
    `infra/nginx-proxy-manager/README.md`), поэтому не актуально.
- `apps/dashboard-agent/src/lib/cron.ts` — задача `s2-pageview-count`, каждые 10 минут, сервер s2
  (там же живут dashboard и NPM), вызывает `POST /api/cron/pageview-count`.
- `src/app/api/cron/pageview-count/route.ts` — `verifyCronSecret` (тот же паттерн, что
  `api/cron/heartbeat/route.ts`).
- `src/app/api/analytics/pageviews/route.ts` — auth-gated (`getServerSession`), отдаёт агрегат.
- `src/app/_components/analytics/PageViewsCard.tsx` + `/analytics/page.tsx` — таблица
  домен/сегодня/7 дней с явной пометкой «включая ботов и повторные заходы, не уникальные
  посетители, без IP/UA/cookie».

`nx typecheck:tsgo dashboard`, `nx typecheck dashboard-agent`, `nx lint` (оба), `nx build dashboard`,
`nx test dashboard-agent` — зелёные. Миграция `20260729220212_add_pageview_count` создана и
применена к локальной dev-БД.

## Версия 1.20.7 — дедупликация AlertType/AlertSeverity + переименование npm.ts (2026-07-30)

Две мелкие задачи из раздела «Запланировано», найденные 2026-07-28 при проектировании §25
«Еженедельный контроль зависимостей» (`PLAN-INFRA.md`).

**`AlertType`/`AlertSeverity` дедупликация:** `CreateAlertSchema` в `api/alerts/route.ts` дублировал
строкой перечень значений `enum AlertType`/`AlertSeverity` из `schema.zmodel` внутри `z.enum([...])`.
Расхождение уже проявлялось на практике при проектировании §25 (потребовались `DEPS_VULNERABLE`/
`DEPS_STALE`, добавленные в схему без синхронной правки route-файла → молчаливый 400). Заменено на
`z.enum(Object.values(AlertType) as [AlertType, ...AlertType[]])` — значения берутся из
`@/generated/models` через реэкспорт `@/lib/alerts`, схема и API больше не могут разойтись.

**Переименование `lib/npm.ts`/`lib/npm-client.ts`:** имя провоцировало путать клиент Nginx Proxy
Manager с логикой npm-зависимостей (уже пришлось оговаривать это агенту при проектировании `/deps`).
Переименовано в `lib/nginx-proxy-manager.ts`/`lib/nginx-proxy-manager-client.ts` через `git mv`
(история файлов сохранена), поправлены все импорты в `_actions/npm-actions.ts`,
`_components/nginx/*`, `api/nginx/*`, `app/nginx/*`.

`nx typecheck:tsgo dashboard`/`nx lint dashboard` — зелёные после обеих правок.

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

---

## Перенос из PLAN.md — 2026-08-09

> Перенесено из PLAN.md: 2026-08-09. Все секции ниже были полностью помечены как выполненные
> (✅ / [x]) на момент архивации (PLAN.md v1.23.2).

### ✅ Управление Cron-задачами (v1.1.0)

**Описание:**
Панель для управления и мониторинга cron-задач всех приложений в монорепозитории.

**Функционал:**

- [x] Список всех cron-эндпоинтов приложений
  - driving-school: `/api/cron/cleanup-api-logs`
  - imot: `/api/cron/session-reminders`, `/api/cron/practice-diary-reminders`
- [x] Статус последнего выполнения (успех/ошибка, время)
- [x] Ручной запуск cron-задачи из UI
- [x] История выполнений с логами
- [x] Включение/отключение задач
- [x] Планировщик на основе node-cron

**Файлы:**

- `cron-jobs.json` — конфигурация задач в корне workspace
- `src/lib/cron.ts` — библиотека управления cron
- `src/app/cron/page.tsx` — страница управления
- `src/app/cron/_components/CronHistoryDialog.tsx` — диалог истории
- `src/app/_actions/cron-actions.ts` — Server Actions
- `src/app/api/cron/jobs/` — API endpoints

---

### ✅ Модернизация UX (React 19 useOptimistic) (v1.1.0)

**Описание:**
Применение React 19 `useOptimistic` хука для мгновенного UI feedback.

#### ✅ Docker контейнеры

- [x] Мгновенное изменение state бейджа при Start/Stop/Restart/Remove
- [x] Оптимистичное обновление кнопок
- [x] Визуальная индикация операций (Spinner overlay)
- [x] Переходные состояния: starting, stopping, restarting, removing

**Файлы:**

- `src/app/docker/containers/page.tsx` — useOptimistic + useTransition
- `src/app/_components/docker/ContainerCard.tsx` — isTransitioning prop

#### ✅ Настройки мониторинга

- [x] Instant toggle Switch компонентов (Enable Alerts, Telegram, Auto-Cleanup)
- [x] Мгновенное сохранение настроек через Server Actions
- [x] Визуальное подтверждение изменений
- [x] Откат при ошибках

**Файлы:**

- `src/app/settings/page.tsx` — useOptimistic для toggle'ов
- `src/app/_actions/settings-actions.ts` — Server Actions

### ✅ Уведомления (NotificationsPopover) (v1.2.0)

**Статус:** ✅ Готово

- [x] Мгновенное подтверждение алертов с useOptimistic
- [x] Instant update счётчика в Badge
- [x] Удаление из списка без задержки

**Файлы:**

- `src/app/_components/layout/NotificationsPopover.tsx` — useOptimistic + useTransition

### ✅ База данных (database/backups) (v1.2.0)

**Статус:** ✅ Готово

- [x] Визуальная индикация создания бэкапа (placeholder row)
- [x] Оптимистичное обновление счётчиков

**Файлы:**

- `src/app/database/backups/page.tsx` — useOptimistic + useTransition

### ✅ Управление Nginx Proxy Manager (v1.3.0)

**Статус:** ✅ Готово

- [x] Интеграция с NPM API (JWT аутентификация)
- [x] Список proxy hosts с toggle enabled/disabled
- [x] SSL сертификаты (список, срок истечения)
- [x] Access Lists (список, количество правил)
- [x] useOptimistic для toggle proxy hosts
- [x] Server Actions с audit logging
- [x] Навигация по секциям (Proxy Hosts | Certificates | Access Lists)

**Файлы:**

- `src/lib/npm.ts` — API клиент с JWT кэшированием
- `src/app/api/nginx/` — API routes (status, proxy-hosts, certificates, access-lists)
- `src/app/_actions/npm-actions.ts` — Server Actions с аудитом
- `src/app/_components/nginx/` — компоненты (NginxNav, ProxyHostCard, CertificateCard, AccessListCard)
- `src/app/nginx/` — страницы (proxy-hosts, certificates, access-lists)

### ✅ Cron: настройка расписания из UI (v1.4.0)

**Статус:** ✅ Готово

- [x] Редактирование cron expression в UI (CronScheduleDialog)
- [x] Визуальный конструктор расписания (Select для минут, часов, дней, месяцев, дней недели)
- [x] Валидация cron expressions (cron-parser)
- [x] Предпросмотр следующих 5 запусков
- [x] Предустановленные шаблоны (каждую минуту, каждый час, ежедневно и т.д.)
- [x] Человеко-читаемое описание расписания

**Файлы:**

- `src/lib/cron.ts` — getNextRunDates(), validateCronExpression(), describeCronExpression()
- `src/app/api/cron/validate/route.ts` — API для валидации
- `src/app/cron/_components/CronScheduleDialog.tsx` — диалог редактирования
- `src/app/cron/page.tsx` — кнопка редактирования в таблице

### ✅ Очистка диска (DiskUsage) (v1.5.0)

**Статус:** ✅ Готово

- [x] Оптимистичное обновление размеров при очистке Docker cache
- [x] Мгновенное обновление Docker размеров с useOptimistic
- [x] Визуальный индикатор операции (opacity + spinner)
- [x] Отображение "Очищено ✓" сразу после нажатия

**Файлы:**

- `src/app/_components/system/DiskUsage.tsx` — useOptimistic + useTransition

### ✅ Деплой (Git Pull optimistic) (v1.6.0)

**Статус:** ✅ Готово

- [x] Оптимистичное обновление incoming commits при Git Pull
- [x] Мгновенное обнуление счётчика коммитов
- [x] Визуальный индикатор "Pulling..." в статусе
- [x] useOptimistic + useTransition для non-blocking UI

**Файлы:**

- `src/app/deploy/page.tsx` — useOptimistic для Git Pull

---

### ✅ Cron: алерты при неудачном выполнении (v1.7.0)

**Статус:** ✅ Готово

- [x] Автоматическое создание алерта при ошибке cron задачи
- [x] Telegram уведомления при ошибках
- [x] Автоматическое разрешение алертов при успешном выполнении

**Файлы:**

- `src/lib/cron.ts` — интеграция с системой алертов
- `src/lib/alerts.ts` — AlertType.CRON_FAILED

### ✅ Метрики приложений (v1.7.0)

**Статус:** ✅ Готово

- [x] Health-check метрики для всех приложений
- [x] Response time (avg, min, max)
- [x] Uptime и Error Rate
- [x] Страница `/metrics` с карточками для каждого приложения
- [x] API для health-check проверок

**Файлы:**

- `src/lib/app-metrics.ts` — сбор и хранение метрик
- `src/app/api/apps/[app]/metrics/route.ts` — API метрик приложения
- `src/app/api/monitoring/health-check/route.ts` — API массовой проверки
- `src/app/metrics/page.tsx` — UI страница метрик

---

### ✅ Автозапуск cron планировщика (v1.10.0)

**Статус:** ✅ Готово

- [x] Автоматический запуск cron планировщика при загрузке Dashboard
- [x] Интеграция в существующий `/api/monitoring/auto-start` endpoint
- [x] Флаг `cronAutoStartAttempted` для предотвращения повторного запуска
- [x] Работает в production или с `AUTO_START_MONITORING=true`

**Файлы:**

- `src/app/api/monitoring/auto-start/route.ts` — добавлен запуск cron scheduler

---

### ✅ Мульти-серверная архитектура (v1.11.0)

**Статус:** ✅ Готово

- [x] Dashboard-agent для мониторинга удалённых серверов
- [x] Модель DeployedApp для хранения информации о серверах
- [x] API для управления серверами (`/api/servers/`)
- [x] UI для выбора и управления серверами (`/servers`)
- [x] Переезд Dashboard с s1 на s2.letar.best
- [x] Документация NPM для мульти-серверной архитектуры

**Серверная архитектура:**

| Сервер        | Приложения                                                              | Примечания        |
| ------------- | ----------------------------------------------------------------------- | ----------------- |
| s1.letar.best | premium-rosstil, imot, mandala, kami, pravda, animatrona-landing, umami | + dashboard-agent |
| s2.letar.best | driving-school, dashboard                                               | Dashboard здесь   |

**Файлы:**

- `apps/dashboard-agent/` — агент для удалённого мониторинга
- `src/app/servers/` — страница управления серверами
- `src/lib/server-client/` — клиент для работы с агентами
- `schema.zmodel` — модель DeployedApp

---

### ✅ Инфраструктура ZenStack + PostgreSQL (v1.8.0)

**Статус:** ✅ Готово

- [x] Создать `schema.zmodel` с моделями:
  - `Alert`, `AlertSettings`
  - `CronExecutionLog` (CronJob остаётся в JSON конфиге)
  - `HealthCheck`
  - `SystemMetric`
  - `AuditLog`
- [x] Добавить PostgreSQL в `docker-compose.production.yml`
- [x] Обновить `.env.docker.example` с DATABASE_URL
- [x] Обновить `project.json` — добавить zenstack targets
- [x] Создать `src/lib/db.ts` — enhanced Prisma client

**Файлы:**

- `schema.zmodel` — схема БД с политиками доступа
- `docker-compose.production.yml` — PostgreSQL сервис
- `src/lib/db.ts` — ZenStack ORM Client
- `src/generated/` — сгенерированные типы и Prisma схема

---

### ✅ Миграция данных на PostgreSQL (v1.9.0)

**Статус:** ✅ Готово

- [x] `src/lib/alerts.ts` → PostgreSQL через ZenStack ORM
- [x] `src/lib/cron.ts` → PostgreSQL (CronExecutionLog модель)
- [x] `src/lib/app-metrics.ts` → PostgreSQL (HealthCheck модель)
- [x] `src/lib/system-metrics-history.ts` → PostgreSQL (SystemMetric модель)
- [x] `src/lib/audit-log.ts` → PostgreSQL (AuditLog модель)

**Состояние хранения после миграции:**

| Данные            | До           | После         |
| ----------------- | ------------ | ------------- |
| Алерты            | JSON файл    | PostgreSQL ✅ |
| Cron логи         | Map в памяти | PostgreSQL ✅ |
| Health Check      | Map в памяти | PostgreSQL ✅ |
| Системные метрики | JSON файлы   | PostgreSQL ✅ |
| Audit логи        | JSONL файл   | PostgreSQL ✅ |

**Особенности реализации:**

- Enum конвертация: DB (UPPERCASE) ↔ API (lowercase)
- BigInt для больших чисел (memory/disk sizes)
- JSON metadata обработка через `Record<string, any>`
- Multi-tier storage для системных метрик (realtime, hourly, daily)
- Cleanup функции для устаревших данных

---

### ✅ Деплой через deploy-affected.sh для удалённых серверов (v1.14.0)

**Статус:** ✅ Готово

- [x] Добавить POST /api/deploy/app в dashboard-agent
- [x] Добавить deployApp метод в RemoteServerClient
- [x] Обновить route деплоя: удалённые серверы используют deploy-affected.sh
- [x] Локальные серверы продолжают использовать docker pull + restart

**Файлы:**

- `dashboard-agent/src/routes/deploy.ts` — endpoint /api/deploy/app
- `dashboard/src/lib/server-client/remote.ts` — метод deployApp()
- `dashboard/src/app/api/servers/[id]/apps/[appId]/deploy/route.ts` — логика выбора метода деплоя

---

### ✅ Git Status для удалённых серверов (v1.14.0)

**Статус:** ✅ Готово

- [x] Добавить git routes в dashboard-agent (status, incoming, pull)
- [x] Обновить RemoteServerClient с git методами
- [x] Показать git status в RemoteServerDeploy (incoming commits, ветка, modified files)
- [x] Кнопка Git Pull для удалённых серверов

**Файлы:**

- `dashboard-agent/src/lib/git.ts` — функции для работы с git
- `dashboard-agent/src/routes/git.ts` — API endpoints
- `dashboard/src/lib/server-client/remote.ts` — git методы в RemoteServerClient
- `dashboard/src/app/api/servers/[id]/git/` — проксирование git запросов
- `dashboard/src/app/_components/deploy/RemoteServerDeploy.tsx` — UI с git status

### ✅ Исправить управление приложениями (v1.14.0)

**Статус:** ✅ Готово

- [x] Улучшить error handling с деталями ошибки в API discover
- [x] Добавить недостающие приложения в seed (pravda, animatrona-landing, umami, animatrona-tracker)

**Примечание:** Для применения новых приложений нужно запустить seed на production:

```bash
ssh deploy@s2.letar.best
cd /home/deploy/letar/apps/dashboard
bun prisma db seed --schema=./src/generated/schema.prisma
```

---

### ✅ Поддержка Node.js приложений в deploy-affected.sh (v1.14.0)

**Статус:** ✅ Готово

- [x] Добавить dashboard-agent в S1_APPS
- [x] Определение типа приложения (Next.js vs Node.js)
- [x] Node.js приложения пропускают локальный nx build (собираются внутри Docker)
- [x] Пропуск проверки .next/out для Node.js приложений

**Файлы:**

- `deploy-affected.sh` — логика определения типа приложения

---

### ✅ Серверная фильтрация cron задач (v1.14.0)

**Статус:** ✅ Готово

- [x] Тип CronServer и маппинг APP_TO_SERVER
- [x] Фильтрация задач по hostname (s1/s2)
- [x] Автономные планировщики на каждом сервере
- [x] Dashboard UI управляет обоими через API

**Архитектура:**

- **S1 (dashboard-agent):** imot-\*, s1-database-backup
- **S2 (dashboard):** driving-school-\*, s2-database-backup

**Файлы:**

- `apps/dashboard/src/lib/cron/config.ts` — фильтрация для dashboard
- `apps/dashboard/src/lib/cron/types.ts` — CronServer, APP_TO_SERVER
- `apps/dashboard-agent/src/lib/cron.ts` — фильтрация для agent

---

### ✅ Исправить Docker страницы для удалённых серверов (v1.15.1)

**Статус:** ✅ Готово

- [x] containers/page.tsx: useServerContext + selectedServerId в API + управление через /api/docker/control
- [x] images/page.tsx: selectedServerId в запросе, кнопки Prune/Remove скрыты для remote
- [x] volumes/page.tsx: selectedServerId в запросе и queryKey
- [x] networks/page.tsx: selectedServerId в запросе и queryKey

---

### ✅ Аналитика Umami (v1.16.0)

**Статус:** ✅ Готово

- [x] Страница `/analytics` со сводной статистикой всех сайтов
- [x] Карточки SiteCard с метриками: просмотры, посетители, bounce rate (24h)
- [x] Диалог AddSiteDialog с быстрым выбором приложений монорепо
- [x] Фильтрация уже добавленных приложений
- [x] API `/api/analytics/sites` — проксирование к Umami API (GET/POST)
- [x] API `/api/analytics/stats` — статистика сайта из Umami
- [x] API `/api/analytics/env` — запись Website ID в `.env.docker` через nsenter
- [x] Навигация: пункт «Аналитика» в Sidebar
- [x] Переинициализация Umami с новыми credentials и 8 сайтами
- [x] Скрипт `scripts/umami-setup.sh` для автоматизации
- [x] Скрипт `scripts/pull-env-docker.sh` для обратной синхронизации env

**Файлы:**

- `src/app/analytics/page.tsx` — страница аналитики
- `src/app/_components/analytics/SiteCard.tsx` — карточка сайта с метриками
- `src/app/_components/analytics/AddSiteDialog.tsx` — диалог добавления сайта
- `src/app/api/analytics/sites/route.ts` — API списка/создания сайтов
- `src/app/api/analytics/stats/route.ts` — API статистики
- `src/app/api/analytics/env/route.ts` — API записи в .env.docker
- `scripts/umami-setup.sh` — скрипт инициализации Umami
- `scripts/pull-env-docker.sh` — обратная синхронизация env

**Конфигурация (.env.docker):**

```bash
UMAMI_API_URL=https://stats.letar.best
UMAMI_API_USER=admin
UMAMI_API_PASSWORD=<пароль>
```

---

### ✅ Централизованный реестр приложений — Фаза 2 (v1.18.0)

**Статус:** ✅ Готово

**Фаза 1 (v1.17.0):** Поле `domain` в `DeployedApp`, `AddSiteDialog` берёт из БД.
**Фаза 2 (v1.18.0):** Полное удаление хардкоженных списков приложений.

- [x] `CreateProxyHostDialog` — домен из `AppInfo.domain` (props из БД) вместо fetch `/api/apps/{app}/npm-config`
- [x] `npm-config` API — DB lookup через `prisma.deployedApp.findFirst()` вместо `getNpmAppNames()`
- [x] Удалён `src/lib/secrets.ts` — захардкоженные `APP_CONFIG` и `STATIC_APP_CONFIG`
- [x] `dashboard-agent/apps.ts` — убран хардкод, динамическое чтение `.env.docker`
- [x] Обновлена документация: `deployment-assistant`, `create/new-app`, `dashboard.md`

**Архитектура после Фазы 2:**

- Единственный источник правды — `DeployedApp` таблица в PostgreSQL
- Добавление нового приложения = запись в `prisma/seed.ts` + запуск seed
- Dashboard-agent читает домены из `.env.docker` без валидации против списка

---

### ✅ Кнопка «Записать env» на SiteCard + мульти-серверная маршрутизация (v1.19.0)

**Статус:** ✅ Готово

- [x] Общий `api.ts` — вынесены типы и функции из AddSiteDialog
- [x] Кнопка записи env на каждой SiteCard (IconButton с LuFileDown)
- [x] Оранжевая подсветка для сайтов без env, зелёная галочка после записи
- [x] Batch `GET /api/analytics/env-status?apps=...` для проверки статуса env
- [x] DB-маршрутизация: DeployedApp → Server (isLocal/agentToken) → nsenter или agent
- [x] Dashboard-agent: `GET /api/env-status` endpoint для удалённых серверов
- [x] Dashboard-agent: автосоздание `.env.docker` при POST если файл отсутствует
- [x] Реальные сообщения об ошибках в тостах вместо общих
- [x] Fix: animatrona-tracker domain в seed.ts

**Файлы:**

- `src/app/_components/analytics/api.ts` — общие типы и функции
- `src/app/_components/analytics/SiteCard.tsx` — кнопка записи env
- `src/app/_components/analytics/AddSiteDialog.tsx` — импорт из api.ts
- `src/app/analytics/page.tsx` — fetchEnvStatus query
- `src/app/api/analytics/env-status/route.ts` — batch env проверка с маршрутизацией
- `src/app/api/analytics/env/route.ts` — запись env с маршрутизацией
- `apps/dashboard-agent/src/routes/env.ts` — GET /api/env-status + автосоздание файла

---

### ✅ Рефакторинг: единый источник правды для карты портов (v1.20.1, частично)

**Найдено:** 2026-07-15, при чистке мёртвых ссылок на `premium-rosstil`/`imot` (см.
`PLAN_COMPLETED.md` v1.19.4, commit `d7e8e49`). Карта `app → port` и связанные списки продублированы
хардкодом минимум в 6 местах, независимо друг от друга:

- `apps/dashboard-agent/src/lib/cron.ts` — `APP_PORTS`, `APP_HOSTS` (на деле — импорт из
  `app-registry.ts`, см. ниже)
- `apps/dashboard/src/lib/app-metrics.ts` — `APP_PORTS`
- `apps/dashboard-agent/src/lib/server-config.ts` — `SERVER_APPS`
- `apps/dashboard/src/lib/constants.ts` — `SUPPORTED_DATABASES`
- `apps/dashboard/src/app/deploy/history/page.tsx` — `KNOWN_APPS`
- `apps/dashboard-agent/src/lib/database.ts` — `APP_CONFIG` (бэкапы БД)

Это прямо противоречит собственному правилу дашборда (`.claude/rules/dashboard.md`): _«Реестр
приложений — `DeployedApp` таблица как единственный источник правды... Нет хардкоженных списков»_.
На практике при удалении приложения из монорепо нужно вручную чистить 6+ файлов вместо одного — уже
привело к мёртвым cron-задачам и мёртвым `docker-compose` volume-маунтам после удаления
`premium-rosstil`/`imot` (2026-07-05, обнаружено только 2026-07-15).

**Что сделано (2026-07-30):** `SERVER_APPS` (`app → сервер`) уже был вынесен в канон
`@letar/infra-config` до этой сессии (образец решения — dashboard-agent держит ЛОКАЛЬНУЮ копию в
`server-config.ts`, потому что `Dockerfile.production` изолирован от монорепо и не видит `libs/`;
дрейф значений ловит `server-config.guard.spec.ts`, сравнивающий копию с каноном относительным
импортом). По тому же паттерну добавлен `APP_PORTS`/`getAppPort()` в `@letar/infra-config`:

- [x] `apps/dashboard/src/lib/app-metrics.ts` — прямой импорт `getAppPort()` из `@letar/infra-config`
      (dashboard не Docker-изолирован, может импортировать `libs/` напрямую; добавлено в
      `tsconfig.json` paths/references, `package.json` dependency, `next.config.ts` transpilePackages)
- [x] `apps/dashboard-agent/src/lib/app-registry.ts` — локальная копия значений портов (набор
      приложений — своё решение модуля, только те, кого агент реально вызывает), дрейф от канона
      ловит новый `app-registry.guard.spec.ts` (тот же паттерн, что `server-config.guard.spec.ts`)
- [x] Список «кого мониторим/вызываем» в обоих файлах остался явным локальным (`MONITORED_APPS` в
      dashboard, набор ключей в dashboard-agent) — сознательно не унифицирован с каноном, чтобы не
      расширить тихо набор приложений, участвующих в health-check/cron-вызовах (канон описывает
      «какой у кого порт», не «кого опрашивать»)
- [x] Проверено: `nx typecheck:tsgo`/`typecheck`, `nx test`, `nx lint`, `nx build` для
      `infra-config`, `dashboard`, `dashboard-agent` — зелёные

**Сознательно НЕ тронуто в этом проходе** (не являются тем же классом дрейфа — значение одного и
того же факта, продублированное текстом — а самостоятельными curated-списками с собственной бизнес-
логикой; унификация с портами рискует незаметно расширить/сузить их поведение):

- ~~`SUPPORTED_DATABASES` (`constants.ts`)~~ — снято этой же задачей (2026-07-30, v1.20.5): расхождение
  с `APP_CONFIG` (16 приложений) оказалось не багом UI восстановления, а мёртвым кодом. Реальный
  restore/delete/migrate отключён целиком на уровне `_actions/database-actions.ts` (`@deprecated`,
  всегда `{ success: false }`) и `/api/database/[db]/restore/route.ts` (безусловный `501`) — причина:
  `dashboard-agent` (`routes/database.ts`) вообще не реализует restore/delete/migration-эндпоинты,
  только `status`/`stats`/`backup`/`backups`. Сам `SUPPORTED_DATABASES` и весь читавший его
  `api/_schemas/common.ts` (`DatabaseNameSchema`, `AppNameSchema`, `DeployStartSchema`,
  `DatabaseRestoreSchema`, `ContainersQuerySchema`) нигде не импортировались — allow-list ни на что не
  влиял. Список БД для кнопок бэкапа UI уже брал динамически из `/api/database/available` (живой
  запрос к агенту), в обход этой константы. Файл `common.ts` удалён, экспорты `SUPPORTED_DATABASES`/
  `SUPPORTED_APPS`/`DatabaseName`/`AppName` убраны из `constants.ts`
- ~~`KNOWN_APPS` (`deploy/history/page.tsx`)~~ — снято другой задачей: страница и `/api/deploy/history`
  оказались мёртвым кодом целиком (роут безусловно возвращал 501 «Deploy history is not available»
  ещё до перехода на dashboard-agent), см. PLAN_COMPLETED.md v1.20.3
- `APP_CONFIG` в `dashboard-agent/database.ts` (конфигурация БД для бэкапов: `secretsPath`,
  `containerName`, `database`, `user`) — единственный владелец этих данных сейчас (
  `dashboard/src/lib/secrets.ts` с аналогичной картой уже удалён в Фазе 2 v1.18.0), реальной
  межфайловой дупликации значений нет, только концептуальное сходство с другими картами

**Зависимости:** нет, чисто внутренний рефакторинг dashboard/dashboard-agent.

---

### ✅ `AlertType` продублирован между схемой и API-роутом (v1.20.7)

**Найдено:** 2026-07-28, при проектировании §25 «Еженедельный контроль зависимостей»
(`PLAN-INFRA.md`). Перечень значений `enum AlertType` (`schema.zmodel`) продублирован строкой
в `z.enum([...])` внутри `apps/dashboard/src/app/api/alerts/route.ts` (~строки 39–49). Добавление
нового значения в схему без синхронной правки `z.enum` даёт молчаливый 400 при создании алерта
этого типа — уже наступил на это при планировании §25 (нужны были `DEPS_VULNERABLE`/`DEPS_STALE`).

**Статус:** ✅ Готово

- [x] `z.enum` для `type` строится из `Object.values(AlertType)` (реэкспорт `@/generated/models`
      через `@/lib/alerts`) вместо ручного перечисления строк.
- [x] Тот же паттерн применён и к `severity` — `Object.values(AlertSeverity)` вместо
      захардкоженного `['INFO', 'WARNING', 'ERROR', 'CRITICAL']`.
- [x] `nx typecheck:tsgo dashboard` / `nx lint dashboard` — зелёные.

**Файлы:** `src/app/api/alerts/route.ts`

**Зависимости:** нет, чисто внутренний рефакторинг dashboard.

---

### ✅ Обманчивое именование `lib/npm.ts` / `lib/npm-client.ts` (v1.20.7)

**Найдено:** 2026-07-28, при исследовании кодовой базы для §25. Файлы
`apps/dashboard/src/lib/npm.ts` и `apps/dashboard/src/lib/npm-client.ts` — это клиент **Nginx
Proxy Manager**, а не что-либо связанное с npm-пакетами. Имя прямо провоцирует спутать их
с будущей логикой работы с npm-зависимостями (уже пришлось явно оговаривать это агенту при
проектировании страницы `/deps`).

**Статус:** ✅ Готово

- [x] `lib/npm.ts` → `lib/nginx-proxy-manager.ts`, `lib/npm-client.ts` →
      `lib/nginx-proxy-manager-client.ts` (переименование через `git mv`, история сохранена).
- [x] Поправлены все импорты (`_actions/npm-actions.ts`, `_components/nginx/*`,
      `api/nginx/*`, `app/nginx/*`) — старых `@/lib/npm` в кодовой базе не осталось.
- [x] `nx typecheck:tsgo dashboard` / `nx lint dashboard` — зелёные.

**Зависимости:** нет, чисто внутреннее переименование.

---

### ✅ Голый счётчик посещаемости без cookie-consent gap (в дополнение к Umami) (v1.21.0)

**Найдено:** 2026-07-29, при разборе cookie-баннера archetest. `UmamiScript` во всех приложениях
с `@letar/ui` `CookieBanner` грузится только после `analytics: true` в согласии
(`AnalyticsGate` → `useAnalyticsConsent`, см. `libs/ui/src/lib/analytics-gate.tsx`). Это
корректно с точки зрения 152-ФЗ (opt-in), но означает, что Umami систематически не видит:

- всех посетителей, ушедших до клика по баннеру (самый ценный для воронки сегмент — те, кто не
  досидел до решения);
- самый первый pageview даже у согласившихся — скрипт ещё не в DOM в момент захода.

**Правовой разбор (2026-07-30):** цель метрики — только знать посещаемость (сколько раз открыли
страницу), не кто и не сколько уникальных пользователей. Это меняет вывод из обсуждения
2026-07-29: там речь шла про счётчик **уникальных** посетителей (нужен идентификатор → IP/хэш
IP → ПДн по практике РКН/судов, `ConsentLog.ipHash` в [personal-data.md](/.claude/docs/personal-data.md)
сам явно учтён как ПДн). Здесь идентификатор не нужен вообще — инкремент общего счётчика без
привязки к посетителю не создаёт связи «данные ↔ определённое/определяемое физлицо» (152-ФЗ ст. 3)
ни на одном шаге, поэтому обработка ПДн просто не возникает и cookie-consent (который в этом
монорепо покрывает именно передачу данных о посетителе третьей стороне — Яндекс.Метрика/Umami,
см. personal-data.md §5) на неё не распространяется. Реализация НЕ добавляет отдельного
уведомления/пункта в cookie-баннер — было бы избыточно для метрики без ПДн.

**Реализация:** вместо middleware-инкремента в каждом из ~30 приложений — единая точка на
инфраструктурном уровне, без изменений в apps/*: Nginx Proxy Manager и так пишет access-лог на
каждый proxy host (`infra/nginx-proxy-manager/data/logs/proxy-host-<id>_access.log`), новый код
только считает НОВЫЕ строки с прошлого запуска (инкрементальное чтение по byte offset через
`nsenter`, тот же паттерн, что `api/git/pull/route.ts`) — сами строки лога (с IP/UA) в БД
dashboard никогда не попадают, только число.

**Статус:** ✅ Готово

- [x] Модели `PageViewCount(date, domain, count)` + `PageViewLogOffset(domain, byteOffset)` в
      `schema.zmodel` — второй нужен для инкрементального парсинга без повторного чтения файла.
- [x] `src/lib/pageview-counter.ts` — `updatePageViewCounts()` (парсинг логов всех proxy hosts
      из NPM API, обработка ротации/усечения файла) + `getPageViewsSummary()` (агрегат для UI).
- [x] Cron-задача `s2-pageview-count` (`apps/dashboard-agent/src/lib/cron.ts`, каждые 10 минут,
      сервер s2) → `POST /api/cron/pageview-count` (dashboard, `verifyCronSecret`).
- [x] `GET /api/analytics/pageviews` (auth-gated) + `PageViewsCard` на `/analytics` — таблица
      домен/сегодня/7 дней с явной пометкой «включая ботов и повторные заходы, не уникальные
      посетители».
- [x] Не middleware в каждом приложении, а единая точка на уровне NPM — нулевые изменения в
      apps/* и нулевой рантайм-оверхед на каждый запрос.
- [x] `nx typecheck:tsgo`/`typecheck dashboard-agent`, `nx lint`, `nx build dashboard` — зелёные.

**Ограничение архитектуры:** один access-лог на proxy host, не на domain_name — если у хоста
несколько доменов, считается только первый (`domain_names[0]`). В летар сейчас нет хостов с
несколькими доменами на разные приложения (см. `infra/nginx-proxy-manager/README.md`), поэтому
не актуально; если появится — потребуется свой `log_format` с `$host` вместо файла на хост.

**Зависимости:** нет, чисто инфраструктурная задача dashboard + dashboard-agent.

---

### ✅ Fix: Telegram-уведомления не ходили с s1/s2 — обход через tg-proxy (v1.22.1)

**Найдено:** 2026-07-30, в логах после деплоя v1.22.0 — `Error sending Telegram notification:
[TypeError: fetch failed] ETIMEDOUT`. Причина уже задокументирована в
[deployment.md](/.claude/docs/deployment.md#telegram-api--прокси-через-mail-сервер): IP-диапазоны
`api.telegram.org` заблокированы провайдером ДЦ на s1/s2 (и хост, и Docker), решение —
обратный прокси на mail-сервере (`tg-proxy.letar.best`) через `TELEGRAM_API_ROOT`. Тот же паттерн
уже применён в `apps/kami` и `apps/grandslamcup`, но dashboard хардкодил `api.telegram.org`
в трёх местах — конфигурацию сделали (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`), а сам обход
блокировки для этого приложения тогда не завели.

**Статус:** ✅ Готово

- [x] `src/lib/notifications.ts` — `TELEGRAM_API = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'`,
      применено во всех трёх функциях (sendTelegramNotification, testTelegramNotification,
      sendHeartbeatTelegram)
- [x] `src/app/_actions/settings-actions.ts` (`testTelegramAction`) — тот же паттерн
- [x] `TELEGRAM_API_ROOT` в `.env.docker.example`
- [x] `docker-compose.production.yml` — `TELEGRAM_API_ROOT: ${TELEGRAM_API_ROOT:-https://tg-proxy.letar.best}`,
      дефолт на прокси прямо в compose — работает без правки `.env.docker.enc` на проде
- [x] `nx typecheck:tsgo`/`nx lint dashboard` — зелёные

**Файлы:** `src/lib/notifications.ts`, `src/app/_actions/settings-actions.ts`,
`.env.docker.example`, `docker-compose.production.yml`

---

### ✅ Интеграция с GitHub Actions (v1.22.0)

**Статус:** ✅ Готово

- [x] `src/lib/github-actions.ts` — клиент GitHub REST API (`/repos/kamiletar/letar/actions/runs`),
      опциональный `GITHUB_TOKEN` для повышения rate limit (60/час → 5000/час на публичном репо)
- [x] `GET /api/github/workflow-runs` — auth-gated роут (тот же паттерн, что `analytics/pageviews`)
- [x] `GithubActionsCard` на главной странице — последние 10 запусков CI, статус
      (успешно/ошибка/выполняется/отменено), ветка, ссылка на GitHub
- [x] `GITHUB_TOKEN` добавлен в `.env.docker.example` и `docker-compose.production.yml`
      (опционально, без значения по умолчанию работает анонимный доступ)
- [x] `nx typecheck:tsgo`/`nx lint dashboard` — зелёные

**Файлы:**

- `src/lib/github-actions.ts`
- `src/app/api/github/workflow-runs/route.ts`
- `src/app/_components/github/GithubActionsCard.tsx`
- `src/app/page.tsx`

**Ограничение:** только `kamiletar/letar` (публичный монорепо). Приватные submodule-репозитории
(`letar-private-*`) не покрыты — потребовался бы `GITHUB_TOKEN` с доступом к приватным репо,
осознанно не делалось в этом проходе (см. вопрос пользователю при планировании задачи).

---

### ✅ Мониторинг SSL сертификатов (v1.23.0)

**Статус:** ✅ Готово

**Найдено:** `/nginx/certificates` уже показывал цветные бейджи истечения (`CertificateCard`),
но это была чисто пассивная индикация — без захода на страницу истечение не обнаруживалось.

- [x] `src/lib/ssl-monitor.ts` — `checkSslCertificates()`: все сертификаты NPM с истечением
      ≤30 дней (или уже истёкшие) собираются в единый алерт `SSL_EXPIRING` (WARNING/ERROR/
      CRITICAL по худшему сроку), автоматическое разрешение алерта когда проблем не остаётся
- [x] `enum AlertType` — добавлено значение `SSL_EXPIRING` (`schema.zmodel` + миграция
      `add_ssl_expiring_alert_type`)
- [x] `POST /api/cron/ssl-check` — auth-gated роут (тот же паттерн, что `pageview-count`)
- [x] Cron-задача `s2-ssl-check` (`apps/dashboard-agent/src/lib/cron.ts`, ежедневно в 08:00, сервер s2)
- [x] `nx typecheck:tsgo dashboard`, `nx typecheck dashboard-agent`, `nx lint` — зелёные

**Ограничение:** дедупликация алерта — по типу, а не по домену (существующее системное
ограничение `createAlert`, тот же паттерн что `CONTAINER_DOWN`/`CRON_FAILED`), поэтому все
проблемные сертификаты идут одним алертом со списком доменов в сообщении, а не отдельными.

**Файлы:**

- `src/lib/ssl-monitor.ts`
- `src/app/api/cron/ssl-check/route.ts`
- `schema.zmodel`, `prisma/migrations/20260729232641_add_ssl_expiring_alert_type/`
- `apps/dashboard-agent/src/lib/cron.ts`
