---
paths: 'apps/dashboard/**/*'
---

# Dashboard — Мониторинг сервера

## Описание

Dashboard — внутренняя панель мониторинга серверной инфраструктуры. Отображает метрики, логи, статус сервисов и аналитику.

## Структура

```
apps/dashboard/
├── app/
│   ├── page.tsx          # Главная (обзор)
│   ├── analytics/        # Аналитика Umami
│   ├── alerts/           # Алерты
│   ├── apps/             # Мониторинг приложений
│   ├── cron/             # Cron-задачи
│   ├── database/         # БД и бэкапы
│   ├── deploy/           # Деплой
│   ├── docker/           # Docker управление
│   ├── metrics/          # Метрики (CPU, RAM, Disk)
│   ├── nginx/            # Nginx Proxy Manager
│   ├── servers/          # Мульти-серверное управление
│   ├── settings/         # Настройки
│   └── api/
│       ├── analytics/    # Umami API (sites, stats, env)
│       ├── docker/       # Docker API
│       ├── deploy/       # Deploy API
│       ├── database/     # Database API
│       ├── nginx/        # NPM API
│       └── system/       # Системные метрики
└── lib/
    ├── docker/           # Docker API (декомпозирован)
    ├── deploy/           # Логика деплоя
    ├── cron/             # Cron-задачи
    ├── monitoring/       # Фоновый мониторинг
    └── system-metrics/   # Системные метрики
```

## Особенности

- **PostgreSQL** — все данные в БД через ZenStack ORM
- **Реестр приложений** — `DeployedApp` таблица как единственный источник правды (domain, containerName, port). Нет хардкоженных списков — добавляй в `prisma/seed.ts`
- **Real-time** — обновление через polling/SSE
- **Мульти-серверный** — s1 + s2 через dashboard-agent
- **Приватный** — только для внутреннего использования
- **nsenter** — выполнение команд на хосте (pid: host, privileged: true)

## Аналитика (Umami)

Dashboard проксирует запросы к Umami API (credentials в env):

```typescript
// Конфигурация в .env.docker
UMAMI_API_URL=https://stats.letar.best
UMAMI_API_USER=admin
UMAMI_API_PASSWORD=<пароль>

// API routes
GET  /api/analytics/sites       // Список сайтов из Umami
POST /api/analytics/sites       // Создать сайт в Umami
GET  /api/analytics/stats       // Статистика сайта (?websiteId=...&period=24h)
POST /api/analytics/env         // Записать Website ID в .env.docker через nsenter
```

## Docker интеграция

```typescript
import Docker from 'dockerode'

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

// Получить список контейнеров
const containers = await docker.listContainers()

// Получить статистику контейнера
const stats = await container.stats({ stream: false })
```

## Правила

- **MUST** использовать SSE для real-time обновлений
- **NEVER** выставлять наружу (только через VPN)
- **SHOULD** кэшировать метрики на 5-10 секунд
- **MUST** использовать nsenter для записи на хост (workspace :ro)

## Документация

- См. `apps/dashboard/README.md`
