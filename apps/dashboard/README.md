# Dashboard

Веб-приложение для мониторинга и управления продакшен сервером с Nx monorepo.

> **Текущая версия:** 1.16.0
> **Технологический стек:** Next.js 16, React 19, Chakra UI v3, TanStack Query

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Возможности

### Мониторинг системы

- CPU, RAM, диск в реальном времени
- Uptime и загрузка системы
- Графики использования ресурсов

### Мониторинг приложений

- Статус Docker контейнеров
- Использование CPU/RAM по контейнеру
- Размер статических файлов (uploads, static)
- Real-time логи

### Управление Docker

- Запуск/остановка/перезапуск контейнеров
- Просмотр образов и volumes
- Очистка неиспользуемых ресурсов (prune)

### Деплой

- Git статус и affected приложения
- Запуск деплоя с dry-run режимом
- Real-time прогресс и логи
- История деплоев

### База данных

- Статус PostgreSQL контейнеров
- Размер баз данных и таблиц
- Создание и восстановление бэкапов
- Выполнение миграций

### Уведомления

- Алерты при превышении порогов (CPU, RAM, диск)
- Telegram интеграция
- Страница истории алертов

### Аналитика (Umami)

- Сводная статистика всех сайтов (просмотры, посетители, bounce rate)
- Управление сайтами Umami (добавление с быстрым выбором приложений)
- Автозапись Website ID в `.env.docker` на сервере
- Прямые ссылки в Umami UI для детальной аналитики

### Безопасность

- Better Auth аутентификация
- Роли ADMIN/VIEWER
- Audit logging всех действий
- API Key защита

## Быстрый старт

### Требования

- Node.js 24+
- Docker 20.10+
- Доступ к Docker socket

### Установка

```bash
# В корне монорепозитория
bun install

# Создать .env.local
cp apps/dashboard/.env.local.example apps/dashboard/.env.local
```

### Настройка .env.local

```env
# Порт приложения
PORT=3002

# Better Auth
BETTER_AUTH_URL=http://localhost:3002
BETTER_AUTH_SECRET=your-secret-key

# Admin credentials
DASHBOARD_ADMIN_USERNAME=admin
DASHBOARD_ADMIN_PASSWORD=your-password

# Viewer credentials (опционально)
DASHBOARD_VIEWER_USERNAME=viewer
DASHBOARD_VIEWER_PASSWORD=your-password

# API Key для внешних запросов
DASHBOARD_SECRET_KEY=your-api-key
```

### Запуск

```bash
nx dev dashboard
# Доступ: http://localhost:3002

# Проверка типов
nx typecheck:tsgo dashboard  # Быстрая проверка типов (38x быстрее!) ⚡
nx typecheck dashboard       # Обычная проверка типов
```

## Продакшен деплой

### Docker

```bash
# Создать конфигурацию
cp apps/dashboard/.env.docker.example .env.docker
# Отредактировать .env.docker

# Запустить деплой
./deploy-affected.sh --app dashboard
```

### Nginx Proxy Manager

Настройки прокси:

- Scheme: `http`
- Forward Hostname: `dashboard-app`
- Forward Port: `3002`
- WebSocket Support: включен

Для SSE добавить в Advanced:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400s;
```

## API Endpoints

### Системные метрики

- `GET /api/system/cpu` - загрузка CPU
- `GET /api/system/memory` - использование RAM
- `GET /api/system/disk` - информация о дисках
- `GET /api/system/uptime` - uptime системы

### Приложения

- `GET /api/apps/list` - список приложений
- `GET /api/apps/[app]/status` - статус приложения
- `GET /api/apps/[app]/logs` - логи (SSE)
- `GET /api/apps/[app]/storage` - размер статики

### Docker

- `GET /api/docker/containers` - список контейнеров
- `GET /api/docker/images` - список образов
- `POST /api/docker/prune` - очистка

### Деплой

- `POST /api/deploy/start` - запуск деплоя
- `GET /api/deploy/status` - статус

### База данных

- `GET /api/database/status` - статус БД
- `POST /api/database/[db]/backup` - создать бэкап
- `GET /api/database/[db]/backups` - список бэкапов
- `POST /api/database/[db]/restore` - восстановить

### Аналитика (Umami)

- `GET /api/analytics/sites` - список сайтов Umami
- `POST /api/analytics/sites` - создать новый сайт
- `GET /api/analytics/stats?websiteId=...&period=24h` - статистика сайта
- `POST /api/analytics/env` - записать Website ID в `.env.docker`

### Алерты

- `GET /api/alerts` - список алертов
- `POST /api/alerts/[id]/acknowledge` - подтвердить

## Server Actions

Все действия требуют роль ADMIN:

### Docker

- `startContainer(containerId)`
- `stopContainer(containerId)`
- `restartContainer(containerId)`
- `removeContainer(containerId, force)`
- `pruneImages()`
- `removeImage(imageId, force)`

### Деплой

- `deployApp(app?, dryRun)`
- `stopDeploy(pid)`
- `getAffectedApps()`

### База данных

- `createBackup(dbName, type)`
- `restoreBackup(dbName, backupId)`
- `removeBackup(backupId)`
- `executeMigrations(appName)`

## Структура проекта

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Главная страница
│   │   ├── apps/                 # Мониторинг приложений
│   │   ├── docker/               # Docker управление
│   │   ├── deploy/               # Деплой и история
│   │   ├── database/             # БД и бэкапы
│   │   ├── analytics/             # Аналитика Umami
│   │   ├── alerts/               # История алертов
│   │   ├── audit-log/            # Audit logs
│   │   ├── settings/             # Настройки
│   │   ├── auth/                 # Аутентификация
│   │   ├── api/                  # API Routes
│   │   ├── _components/          # React компоненты
│   │   └── _actions/             # Server Actions
│   └── lib/
│       ├── system.ts             # Системные метрики
│       ├── docker.ts             # Docker API
│       ├── git.ts                # Git операции
│       ├── deploy.ts             # Логика деплоя
│       ├── database.ts           # БД утилиты
│       ├── backup.ts             # Бэкапы
│       ├── alerts.ts             # Система алертов
│       ├── notifications.ts      # Telegram
│       ├── monitoring.ts         # Фоновый мониторинг
│       ├── audit-log.ts          # Audit logging
│       └── host.ts               # Команды на хосте
├── Dockerfile.production
├── docker-compose.production.yml
└── .env.local.example
```

## Технологии

- **Framework:** Next.js 16
- **UI:** Chakra UI v3
- **Data Fetching:** TanStack Query
- **Charts:** Recharts
- **Auth:** Better Auth
- **Docker:** dockerode
- **Git:** simple-git
- **System Info:** systeminformation

## Troubleshooting

### Docker socket недоступен

```bash
# Проверить права
ls -la /var/run/docker.sock

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
```

### SSE не работает через Nginx

Добавить в конфигурацию Nginx:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400s;
```

### Бэкапы не создаются

Проверить:

1. Папка `backups/` существует в корне workspace
2. PostgreSQL контейнер запущен
3. Credentials к БД корректны

### Telegram уведомления не приходят

1. Проверить Bot Token
2. Убедиться что бот добавлен в чат
3. Получить Chat ID через @userinfobot
4. Нажать "Тест" в настройках

## Лицензия

Private - для внутреннего использования

---

**Последнее обновление:** 2026-03-02
