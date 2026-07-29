# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

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

## [1.9.0] - 2026-01-15

### Changed

- **Миграция данных на PostgreSQL** — полный переход с файлов/памяти на БД
  - `alerts.ts` — Alert, AlertSettings модели через ZenStack ORM
  - `cron.ts` — CronExecutionLog модель (замена Map в памяти)
  - `app-metrics.ts` — HealthCheck модель (замена Map в памяти)
  - `system-metrics-history.ts` — SystemMetric модель с multi-tier storage
  - `audit-log.ts` — AuditLog модель (замена JSONL файла)
- Enum конвертация: DB (UPPERCASE) ↔ API (lowercase)
- BigInt для больших чисел (memory/disk sizes)
- Multi-tier storage для системных метрик (realtime, hourly, daily)
- Cleanup функции для устаревших данных

## [1.8.0] - 2026-01-03

### Fixed

- Исправлены все lint ошибки и warnings

### Changed

- Добавлен cron-jobs template pattern

## [1.7.0] - 2026-01-03

### Added

- **Cron: алерты при неудачном выполнении** — автоматические уведомления
  - Создание алерта AlertType.CRON_FAILED при ошибке задачи
  - Telegram уведомления при ошибках (если включены)
  - Автоматическое разрешение алертов при успешном выполнении
- **Метрики приложений** — мониторинг производительности
  - Health-check проверки для всех приложений
  - Response time (avg, min, max) с историей
  - Uptime и Error Rate в процентах
  - Страница `/metrics` с карточками метрик
  - API endpoints: `/api/apps/[app]/metrics`, `/api/monitoring/health-check`

### Changed

- Обновлён lib/cron.ts: интеграция с системой алертов и уведомлений
- Добавлена ссылка Метрики в Header навигацию

## [1.6.0] - 2026-01-03

### Added

- **Deploy: useOptimistic для Git Pull** — мгновенное обновление статуса
  - Оптимистичное обнуление счётчика incoming commits при нажатии Git Pull
  - Визуальный индикатор "Pulling..." в Git Status секции
  - Индикатор прогресса при пустом списке коммитов
  - useTransition для non-blocking UI

### Changed

- Рефакторинг deploy/page.tsx: useMutation → useOptimistic + useTransition

## [1.5.0] - 2026-01-03

### Added

- **DiskUsage: useOptimistic для очистки Docker cache** — мгновенное обновление размеров
  - Оптимистичное обновление Docker данных при очистке build cache
  - Размеры обновляются мгновенно до завершения операции
  - Визуальный индикатор операции (opacity + spinner)
  - Отображение "Очищено ✓" сразу после нажатия

### Changed

- Рефакторинг DiskUsage.tsx: useMutation → useOptimistic + useTransition

## [1.4.0] - 2026-01-03

### Added

- **Cron: редактирование расписания из UI** — визуальный конструктор расписания
  - CronScheduleDialog с визуальным конструктором (Select для каждого поля)
  - Предустановленные шаблоны (каждую минуту, каждый час, ежедневно и т.д.)
  - Валидация cron expressions через cron-parser
  - Предпросмотр следующих 5 запусков
  - Человеко-читаемое описание расписания
  - API endpoint `/api/cron/validate` для валидации

### Changed

- Обновлён lib/cron.ts: добавлены getNextRunDates(), validateCronExpression(), describeCronExpression()
- Добавлена кнопка редактирования в таблицу cron задач

### Dependencies

- Добавлен cron-parser@5.4.0 для парсинга и валидации cron expressions

## [1.3.0] - 2026-01-03

### Added

- **Управление Nginx Proxy Manager** — полная интеграция с NPM API
  - JWT аутентификация с кэшированием токенов
  - Страница Proxy Hosts с toggle enabled/disabled (useOptimistic)
  - Страница SSL Certificates с индикацией срока истечения
  - Страница Access Lists с количеством правил
  - API routes: `/api/nginx/status`, `/api/nginx/proxy-hosts`, `/api/nginx/certificates`, `/api/nginx/access-lists`
  - Server Actions с audit logging для всех операций
  - Карточки: ProxyHostCard, CertificateCard, AccessListCard
  - Навигация NginxNav (Proxy Hosts | Certificates | Access Lists)

### Changed

- Расширен AuditAction тип для NPM событий
- Добавлена ссылка Nginx в Header навигацию

## [1.2.0] - 2026-01-03

### Added

- **useOptimistic для NotificationsPopover** — мгновенное подтверждение алертов
  - Удаление алерта из списка без задержки
  - Мгновенное обновление счётчика в Badge
  - useTransition для non-blocking UI
- **useOptimistic для Backups** — визуальная индикация создания бэкапа
  - Placeholder row в таблице при создании
  - Состояние "creating" с spinner
  - Мгновенное обновление статистики

### Changed

- Рефакторинг NotificationsPopover: useMutation → useOptimistic
- Рефакторинг BackupsPage: useMutation → useOptimistic для createBackup

## [1.1.0] - 2026-01-03

### Added

- **Cron Task Management** — панель управления cron-задачами
  - REST API (`/api/cron/jobs/*`)
  - Server Actions для управления задачами
  - UI страница `/cron` с таблицей задач
  - История выполнения задач (диалог)
  - Audit log для всех действий
- **useOptimistic для Docker контейнеров** — мгновенная обратная связь
  - Состояния: Starting, Stopping, Restarting, Removing
  - Визуальный индикатор (spinner overlay)
- **useOptimistic для Settings** — отклик без задержки
  - Toggle: Alerts, Telegram, Auto-Cleanup
  - useTransition для non-blocking UI

### Changed

- Расширен AuditAction тип для cron и settings событий
- Добавлена ссылка Cron в навигацию

## [0.1.0] - 2025-12-24

### Added

- Первый релиз дашборда мониторинга
