# План развития Dashboard

> **Версия:** 1.21.0
> **Последнее обновление:** 2026-07-30

---

## Текущие возможности

- Мониторинг системы (CPU, RAM, диск)
- Управление Docker контейнерами
- Деплой приложений
- Управление базами данных и бэкапами
- Система алертов с Telegram
- Audit logging
- Управление Cron-задачами
- Optimistic UI для Docker контейнеров
- Optimistic UI для Settings
- Optimistic UI для уведомлений (NotificationsPopover)
- Optimistic UI для создания бэкапов
- Управление Nginx Proxy Manager (proxy hosts, сертификаты, access lists)
- Cron: редактирование расписания из UI с визуальным конструктором
- DiskUsage: мгновенное обновление размеров при очистке Docker cache
- Deploy: оптимистичный Git Pull с мгновенным обновлением статуса
- Cron: алерты при неудачном выполнении с Telegram уведомлениями
- Метрики приложений: response time, error rate, uptime
- PostgreSQL + ZenStack инфраструктура (Фаза 1)
- Миграция данных на PostgreSQL (Фаза 2)
- Автозапуск cron планировщика при старте приложения
- Мульти-серверная архитектура (s1 + s2 + dashboard-agent)
- Аналитика Umami (сводная статистика, управление сайтами, автозапись env)
- Централизованный реестр приложений (поле domain в DeployedApp, AddSiteDialog из БД)
- Запись env на SiteCard с мульти-серверной маршрутизацией (s1 agent + s2 nsenter)

---

## Реализованные функции

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

## Примечания по деплою

### Конфигурация Cron

- `cron-jobs.example.json` — шаблон в репозитории
- `cron-jobs.json` — локальный файл (в .gitignore)
- При первом деплое создаётся автоматически из шаблона
- Изменения расписания через UI сохраняются локально

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

## В работе (v1.14.0)

### ✅ Деплой через deploy-affected.sh для удалённых серверов

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

### ✅ Git Status для удалённых серверов

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

### ✅ Исправить управление приложениями

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

## Запланировано

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

## Идеи на будущее

- Интеграция с GitHub Actions
- Мониторинг SSL сертификатов
