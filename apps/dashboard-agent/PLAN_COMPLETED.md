# Выполненные задачи — Dashboard Agent

Детальное описание всех реализованных фич.

## Версия 0.5.2

### Алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` раньше только логировал провал задачи в in-memory `executionLogs` — никакого сигнала наружу не было. Теперь при не-2xx ответе или exception вызывается `POST /api/alerts` в dashboard (`CRON_FAILED`, заголовок `X-Cron-Secret`); ошибки самого уведомления не роняют выполнение задачи, только логируются.

Зарегистрировано приложение `dsperevod` в `APP_PORTS` (3019) / `APP_HOSTS` (`dsperevod-app`) + новая дефолтная задача `dsperevod-email-health-check` (`0 */6 * * *`, `server: 's2'`) — вызывает `dsperevod`'s `/api/cron/email-health-check` (`transporter.verify()` без реальной отправки письма).

**Файлы:**

- `src/lib/cron.ts` — `notifyDashboardAlert()`, вызов в обеих failure-ветках `executeJob()`, новые записи в `APP_PORTS`/`APP_HOSTS`/`DEFAULT_CRON_JOBS`

**Секреты:** `CRON_SECRET` сгенерирован (`openssl rand -base64 32`), прописан в `.env.docker.enc` — ранее не был настроен, `X-Cron-Secret` отправлялся с fallback-значением `'default-cron-secret'`.

## Версия 0.4.0

### Мониторинг cron задач

- Парсинг cron расписаний (cron-parser)
- Отслеживание выполнения задач
- Интеграция с node-cron

### Улучшения PostgreSQL

- Детальная статистика по базам
- Размер баз данных
- Количество подключений

---

## Версия 0.3.0

### PostgreSQL мониторинг

- Подключение к PostgreSQL через pg
- Сбор метрик: размер, подключения, активность
- Endpoint `/databases`

---

## Версия 0.2.0

### Docker мониторинг

- Интеграция с Docker через dockerode
- Список контейнеров со статусом
- Метрики CPU/Memory для контейнеров
- Endpoint `/containers`

### CORS

- Поддержка CORS для Dashboard UI
- @fastify/cors middleware

---

## Версия 0.1.0

### HTTP сервер

- Fastify 5 как основа
- Структурированные роуты
- JSON ответы

### Системные метрики

- systeminformation для сбора данных
- CPU: usage, cores, температура
- Memory: used, total, available
- Disk: used, total, filesystem

### API Endpoints

| Endpoint   | Описание            |
| ---------- | ------------------- |
| `/health`  | Health check        |
| `/metrics` | Все метрики системы |

---

**Последнее обновление:** 2026-02-02
