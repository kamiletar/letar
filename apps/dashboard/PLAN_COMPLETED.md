# Выполненные задачи — Dashboard

Детальное описание всех реализованных фич.

## Версия 1.19.2

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
