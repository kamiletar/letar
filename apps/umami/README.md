# Umami Analytics

Self-hosted аналитика для проектов Letar.

## Конфигурация

| Параметр        | Значение           |
| --------------- | ------------------ |
| Домен           | `stats.letar.best` |
| Сервер          | s1.letar.best      |
| Host порт       | 3009               |
| Container порт  | 3000               |
| PostgreSQL порт | 5435               |

## Подключённые сайты

| Приложение         | Домен                 | Сервер |
| ------------------ | --------------------- | ------ |
| premium-rosstil    | premium.rosstil.ru    | s1     |
| imot               | integrelle.com        | s1     |
| mandala            | mandala.letar.best    | s1     |
| kami               | kami.letar.best       | s1     |
| pravda             | pravda.letar.best     | s1     |
| animatrona-landing | animatrona.letar.best | s1     |
| dashboard          | dash.letar.best       | s2     |
| driving-school     | направа.рф            | s2     |

## Деплой

1. Создать `.env.docker`:

   ```bash
   cp .env.docker.example .env.docker
   # Заполнить DB_PASSWORD и APP_SECRET
   ```

2. Запустить контейнеры:

   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.docker up -d
   ```

3. Настроить Nginx Proxy Manager:
   - Domain: `stats.letar.best`
   - Forward Hostname: `umami-app`
   - Forward Port: `3000` (внутренний порт)
   - SSL: Let's Encrypt

## Переинициализация

При необходимости полного сброса (потеря данных, смена сервера):

```bash
# 1. Перегенерировать ключи в .env.docker
DB_PASSWORD=$(openssl rand -base64 24)
APP_SECRET=$(openssl rand -base64 32)

# 2. Пересоздать контейнеры с удалением volume
docker compose -f docker-compose.production.yml --env-file .env.docker down -v
docker compose -f docker-compose.production.yml --env-file .env.docker up -d

# 3. Запустить скрипт инициализации (из корня монорепо)
bash scripts/umami-setup.sh
```

Скрипт `umami-setup.sh`:

- Ждёт healthcheck Umami
- Логинится с дефолтными credentials (admin/umami)
- Меняет пароль админа
- Создаёт все 8 сайтов через API
- Выводит Website ID для каждого приложения

## Интеграция с приложениями

Каждое приложение использует UmamiScript компонент в `layout.tsx`:

```tsx
// В layout.tsx
<UmamiScript />
```

Переменные окружения в `.env.docker`:

```bash
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<website-id>
```

## Управление через Dashboard

Страница `/analytics` в Dashboard позволяет:

- Просматривать сводную статистику всех сайтов
- Добавлять новые сайты в Umami
- Автоматически записывать Website ID в `.env.docker` приложения

## API

Umami API доступен по адресу `https://stats.letar.best/api/`.

Основные эндпоинты:

- `POST /api/auth/login` — авторизация
- `GET /api/websites` — список сайтов
- `POST /api/websites` — создать сайт
- `GET /api/websites/{id}/stats?startAt=&endAt=` — статистика сайта

## Логи

```bash
docker compose -f docker-compose.production.yml --env-file .env.docker logs -f app
docker compose -f docker-compose.production.yml --env-file .env.docker logs -f db
```

## Полезные ссылки

- [Umami Documentation](https://umami.is/docs)
- [Umami GitHub](https://github.com/umami-software/umami)

---

**Последнее обновление:** 2026-03-02
