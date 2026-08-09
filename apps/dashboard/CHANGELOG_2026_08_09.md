# Changelog (Архив до 2026-08-09)

> Продолжение основного CHANGELOG.md
> Версии: 0.1.0 — 1.9.0

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
