# Dashboard Agent

Легковесный агент мониторинга для удалённых серверов. Собирает метрики системы и Docker контейнеров, отправляет в Dashboard.

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Возможности

- Сбор системных метрик (CPU, RAM, Disk)
- Мониторинг Docker контейнеров
- Мониторинг PostgreSQL баз данных
- Мониторинг cron задач
- REST API для получения метрик
- Автоматическая отправка в Dashboard

## Технологический стек

| Компонент | Технология        |
| --------- | ----------------- |
| Runtime   | Node.js/Bun       |
| HTTP      | Fastify 5         |
| Docker    | Dockerode         |
| Metrics   | systeminformation |
| Database  | pg (PostgreSQL)   |
| Scheduler | node-cron         |

## Установка

```bash
# Сборка
nx build dashboard-agent

# Запуск (dev)
nx dev dashboard-agent

# Запуск (production)
nx start dashboard-agent
```

## Конфигурация

Переменные окружения:

| Переменная        | Описание                   | По умолчанию |
| ----------------- | -------------------------- | ------------ |
| `PORT`            | Порт HTTP сервера          | 3100         |
| `DASHBOARD_URL`   | URL Dashboard для отправки | —            |
| `DASHBOARD_TOKEN` | Токен авторизации          | —            |

## API

### GET /health

Проверка работоспособности агента.

### GET /metrics

Получение текущих метрик системы.

```json
{
  "cpu": { "usage": 45.2, "cores": 8 },
  "memory": { "used": 8192, "total": 16384 },
  "disk": { "used": 120, "total": 500, "unit": "GB" },
  "containers": [{ "name": "premium-rosstil", "status": "running", "cpu": 2.1 }]
}
```

### GET /containers

Список Docker контейнеров с детальной информацией.

### GET /databases

Состояние PostgreSQL баз данных.

## Структура

```
apps/dashboard-agent/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # Fastify сервер
│   ├── collectors/       # Сборщики метрик
│   │   ├── system.ts     # CPU, RAM, Disk
│   │   ├── docker.ts     # Контейнеры
│   │   └── postgres.ts   # Базы данных
│   └── scheduler.ts      # Cron задачи
└── dist/                 # Скомпилированный код
```

## Деплой

Агент устанавливается на каждый сервер, который нужно мониторить.

```bash
# На сервере
cd /opt/dashboard-agent
node dist/index.js
```

Рекомендуется запускать через systemd или PM2.

---

**Обновлено:** 2026-02-02
