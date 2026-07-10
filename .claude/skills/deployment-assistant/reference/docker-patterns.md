# Docker паттерны

## Структура docker-compose.production.yml

### С базой данных (premium-rosstil, imot, mandala, etc.)

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: ${APP_NAME}-db
    restart: unless-stopped
    ports:
      - '${DB_PORT}:5432'
    environment:
      POSTGRES_USER: lena_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U lena_user -d ${DB_NAME}']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ${APP_NAME}:latest
    container_name: ${APP_NAME}-app
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - '${APP_PORT}:3000'
    environment:
      DATABASE_URL: postgresql://lena_user:${DB_PASSWORD}@db:5432/${DB_NAME}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
    networks:
      - ${APP_NAME}-network
      - premium-network # Если нужен доступ к NPM

volumes:
  postgres_data:

networks:
  ${APP_NAME}-network:
    driver: bridge
  premium-network:
    external: true
```

### Без базы данных (dashboard)

```yaml
services:
  app:
    image: dashboard:latest
    container_name: dashboard-app
    restart: unless-stopped
    ports:
      - '3002:3000'
    pid: 'host' # Доступ к процессам хоста
    privileged: true # Для nsenter
    environment:
      WORKSPACE_DIR: ${WORKSPACE_PATH:-/home/deploy/letar}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Docker API
      - ${WORKSPACE_PATH:-/home/deploy/letar}:/workspace:ro
    networks:
      - premium-network

networks:
  premium-network:
    external: true
```

## Dockerfile.production (Multi-stage)

```dockerfile
# Этап 1: Зависимости
FROM node:24-alpine AS deps
WORKDIR /app
RUN npm install -g bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Этап 2: Сборка
FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Сборка уже выполнена Nx, копируем результат
COPY dist/apps/${APP_NAME}/.next ./.next
COPY dist/apps/${APP_NAME}/public ./public

# Этап 3: Production
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Непривилегированный пользователь
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

## Docker сети

```bash
# Создание сетей
docker network create premium-network
docker network create imot-network
docker network create mandala-network

# Просмотр сетей
docker network ls

# Просмотр контейнеров в сети
docker network inspect premium-network

# Подключение контейнера к сети
docker network connect premium-network nginx-proxy-manager
```

## Основные команды

```bash
# Запуск
docker compose -f docker-compose.production.yml up -d

# Остановка
docker compose -f docker-compose.production.yml down

# Пересборка
docker compose -f docker-compose.production.yml up -d --build --force-recreate

# Логи
docker compose -f docker-compose.production.yml logs -f app
docker compose -f docker-compose.production.yml logs -f db

# Перезапуск сервиса
docker compose -f docker-compose.production.yml restart app

# Статус
docker compose -f docker-compose.production.yml ps

# Войти в контейнер
docker compose -f docker-compose.production.yml exec app sh
docker compose -f docker-compose.production.yml exec db psql -U lena_user -d <db_name>
```

## Очистка

```bash
# Удалить остановленные контейнеры
docker container prune

# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые тома (⚠️ ОСТОРОЖНО!)
docker volume prune

# Полная очистка (⚠️ ОПАСНО!)
docker system prune -a --volumes
```

## Порты PostgreSQL

⚠️ **ВАЖНО:** Каждое приложение использует свой уникальный порт PostgreSQL!

| Приложение      | Порт PostgreSQL | Порт App |
| --------------- | --------------- | -------- |
| premium-rosstil | 5432            | 3000     |
| imot            | 5433            | 3001     |
| mandala         | 5434            | 3004     |
| driving-school  | 5435            | 3003     |
| kami            | 5436            | 3005     |

Это нужно потому что каждый PostgreSQL контейнер экспонирует порт на хост для прямого доступа (Prisma Studio, backup, etc.).

```yaml
# docker-compose.production.yml
services:
  db:
    ports:
      - '5433:5432' # Внешний порт уникален, внутренний всегда 5432
```

## .env.docker шаблон

```bash
# === База данных ===
DB_PASSWORD=<secure-random-password>
DB_NAME=app_production
DB_PORT=5433  # ⚠️ УНИКАЛЬНЫЙ для каждого приложения!

# === Auth (Better Auth) ===
BETTER_AUTH_SECRET=<random-32-char-string>
BETTER_AUTH_URL=https://your-domain.com

# === OAuth провайдеры ===
VK_CLIENT_ID=
VK_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=

# === Приложение ===
APP_PORT=3000  # 3001, 3002, etc.
NODE_ENV=production
```

## Healthcheck

```yaml
# PostgreSQL
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U lena_user -d ${DB_NAME}']
  interval: 10s
  timeout: 5s
  retries: 5

# Next.js приложение
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```
