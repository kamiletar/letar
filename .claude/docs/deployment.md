# Деплой

Этот документ описывает процесс деплоя всех приложений в монорепозитории.

## ⚠️ КРИТИЧНО: Где запускать деплой

**НИКОГДА не запускай `deploy-affected.sh` на локальной dev машине!**

Скрипт деплоя предназначен **ТОЛЬКО** для выполнения на production сервере:

```bash
# ❌ НЕПРАВИЛЬНО — на локальной машине
./deploy-affected.sh --app driving-school

# ✅ ПРАВИЛЬНО — подключиться к серверу и запустить там
ssh root@s2.letar.best
cd /home/deploy/letar
./deploy-affected.sh --app driving-school
```

**Почему нельзя локально:**

- Билд и Docker образы создаются на dev машине впустую
- Локальные контейнеры не связаны с production
- Тратится время и ресурсы без результата
- Git pull может привести к конфликтам с незакоммиченными изменениями

**Workflow:**

1. Закоммить и запушить изменения
2. Подключиться к нужному серверу по SSH
3. Запустить `./deploy-affected.sh` на сервере

## Production серверы

**Путь:** `/home/deploy/letar` — репозиторий на production серверах

> **Примечание:** Путь изменён с `/root/lena` для совместимости с backup-инструментами (relisio sync).
> Переменная `WORKSPACE_PATH` в `.env.docker` dashboard должна указывать на этот путь.

### Распределение приложений по серверам

| Сервер            | Приложения                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **s1.letar.best** | premium-rosstil, imot, dashboard-agent                                                                                                                                                                                 |
| **s2.letar.best** | dashboard, driving-school, animatrona-web, auth-hub, archetest, time, form-docs, form-example, grandslamcup, mandala, kami, pravda, animatrona-landing, animatrona-tracker, umami, kami-key-the-landing, letar-landing |

⚠️ **ВАЖНО:** При деплое убедись, что подключаешься к правильному серверу!

> **Каноничный источник:** `deploy-affected.sh` → массивы `S1_APPS` / `S2_APPS`

## Docker сети

Все веб-приложения используют Docker сети для коммуникации:

- **premium-network** - общая для premium-rosstil, dashboard и Nginx Proxy Manager
- **imot-network** - используется приложением imot
- **mandala-network** - используется приложением mandala (если есть)
- **driving-school-network** - используется приложением driving-school (если есть)
- **kami-network** - используется приложением kami (если есть)

## Конфигурация Nginx Proxy Manager

> **Полная документация:** [`infra/nginx-proxy-manager/README.md`](/infra/nginx-proxy-manager/README.md)
>
> **Docker Compose:** [`infra/nginx-proxy-manager/docker-compose.yml`](/infra/nginx-proxy-manager/docker-compose.yml)

NPM используется как обратный прокси. При добавлении нового приложения в NPM:

| Настройка             | Значение                                   |
| --------------------- | ------------------------------------------ |
| Scheme                | `http`                                     |
| Forward Hostname      | Имя контейнера (например, `dashboard-app`) |
| Forward Port          | Порт приложения (3000, 3001, 3002, и т.д.) |
| Websockets Support    | ✅ Включить                                |
| Block Common Exploits | ✅ Включить                                |

**Для SSE/real-time функций** (dashboard), добавь в Advanced tab:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400s;
```

### Текущие хосты (актуально на 2026-04-17)

#### s1.letar.best

| Домен              | Приложение          | Порт |
| ------------------ | ------------------- | ---- |
| premium.rosstil.ru | premium-rosstil-app | 3000 |
| integrelle.com     | imot-app            | 3001 |
| npm.s1.letar.best  | localhost           | 81   |

#### s2.letar.best

| Домен                         | Приложение               | Порт |
| ----------------------------- | ------------------------ | ---- |
| dash.letar.best               | dashboard-app            | 3002 |
| направа.рф                    | driving-school-app       | 3003 |
| mandala.letar.best            | mandala-app              | 3004 |
| kami.letar.best               | kami-app                 | 3005 |
| pravda.letar.best             | pravda-app               | 3007 |
| animatrona.letar.best         | animatrona-landing-app   | 3008 |
| animatrona-tracker.letar.best | animatrona-tracker-app   | 3009 |
| auth.letar.best               | auth-hub-app             | 3010 |
| anime.letar.best              | animatrona-web-app       | 3011 |
| kamikeythe.letar.best         | kami-key-the-landing-app | 3011 |
| archetest.letar.best          | archetest-app            | 3012 |
| time.letar.best               | time-app                 | 3013 |
| letar.best                    | letar-landing-app        | 3015 |
| gsc.letar.best                | grandslamcup-app         | 3016 |
| gsc-test.letar.best           | grandslamcup-staging-app | 3016 |
| forms-example.letar.best      | form-example-app         | 3022 |
| forms.letar.best              | form-docs-app            | 3020 |
| stats.letar.best              | umami-app                | 3033 |
| npm.s2.letar.best             | localhost                | 81   |

## Docker-based деплой (Next.js приложения)

Все Next.js приложения используют **Docker Compose** для production деплоя через скрипт `deploy-affected.sh`.

### Быстрый деплой

```bash
# Деплой всех затронутых приложений (сравнение с последним деплоем)
./deploy-affected.sh

# Деплой конкретного приложения
./deploy-affected.sh --app premium-rosstil
./deploy-affected.sh --app imot
./deploy-affected.sh --app dashboard
./deploy-affected.sh --app mandala
./deploy-affected.sh --app driving-school
./deploy-affected.sh --app kami

# Dry run (показать что будет задеплоено)
./deploy-affected.sh --dry-run

# Пропустить git pull
./deploy-affected.sh --skip-git

# Принудительная пересборка (пропустить Nx кэш)
./deploy-affected.sh --app dashboard --skip-cache

# Чистая установка (удалить node_modules, переустановить)
./deploy-affected.sh --app dashboard --clean

# Деплой + запуск seed после успешного деплоя
./deploy-affected.sh --app aboi --seed
```

### Процесс деплоя

Скрипт `deploy-affected.sh` автоматически:

1. **Определяет изменения** - Использует Nx affected для поиска изменённых приложений с последнего деплоя
2. **Устанавливает зависимости** - Запускает `bun install --frozen-lockfile`
3. **Генерирует схемы** - Запускает `nx zenstack:generate <app>` и `nx db:generate <app>` (если есть БД)
4. **Запускает базу данных** - Поднимает PostgreSQL контейнер если не запущен
5. **Применяет миграции** - Запускает `prisma migrate deploy` перед сборкой (если есть БД)
6. **Собирает приложение** - Использует Nx кэш: `nx build <app>`
7. **Собирает Docker образ** - Создаёт production образ из `Dockerfile.production`
8. **Деплоит контейнеры** - Запускает `docker compose up -d --force-recreate app`
9. **Показывает логи** - Выводит логи контейнера для задеплоенного приложения

### Необходимые файлы для каждого приложения

Каждое деплоируемое приложение требует:

- `Dockerfile.production` - Multi-stage Docker сборка
- `docker-compose.production.yml` - PostgreSQL + Next.js app сервисы (если есть БД)
- `.env.docker` - Переменные окружения (не в git)

### Сервисы Docker Compose

Пример для приложения с базой данных:

```yaml
services:
  db:
    image: postgres:17-alpine
    ports: ['<port>:5432'] # Разный порт для каждого приложения
    volumes: ['postgres_data:/var/lib/postgresql/data']

  app:
    image: <app-name>:latest
    depends_on: [db]
    ports: ['<port>:3000'] # Разный порт для каждого приложения
    environment:
      - DATABASE_URL=postgresql://lena_user:${DB_PASSWORD}@db:5432/${DB_NAME}
```

Для приложений без БД (dashboard):

```yaml
services:
  app:
    image: dashboard:latest
    ports: ['3002:3000']
    environment:
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
```

### Переменные окружения

⚠️ **ВАЖНО: Конвенция .env файлов**

| Файл          | Назначение                                          | Git              |
| ------------- | --------------------------------------------------- | ---------------- |
| `.env`        | **Минимальный** — только порт и публичные настройки | ✅ Отслеживается |
| `.env.local`  | Локальная разработка (секреты, API ключи)           | ❌ В gitignore   |
| `.env.docker` | **Production** — все переменные для Docker          | ❌ В gitignore   |

**НИКОГДА не добавляй секреты в `.env`** — он коммитится в git!

Для `NEXT_PUBLIC_*` переменных (встраиваются при билде):

- На production билд происходит на сервере, где `.env.docker` копируется или используется
- Локально используй `.env.local`

Создай `.env.docker` в директории каждого приложения:

```bash
# База данных (если есть)
DB_PASSWORD=<secure-password>
DB_NAME=<app_name>

# Auth (Better Auth)
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=https://your-domain.com

# OAuth провайдеры (если используются)
VK_CLIENT_ID=<vk-id>
VK_CLIENT_SECRET=<vk-secret>
# ... и т.д.
```

### Состояния деплоя

Скрипт отслеживает деплои в `.last-deploy-commit` для определения затронутых приложений при последующих запусках.

### Ручные команды

```bash
# Просмотр логов
cd apps/premium-rosstil # или apps/imot, apps/dashboard
docker compose -f docker-compose.production.yml logs -f app

# Перезапуск конкретного сервиса
docker compose -f docker-compose.production.yml restart app

# Остановка всех сервисов
docker compose -f docker-compose.production.yml down

# Пересборка и редеплой
docker compose -f docker-compose.production.yml up -d --build --force-recreate
```

## Заметки по Dashboard

Dashboard имеет специальные требования к деплою:

- **Нет базы данных** - использует Better Auth с credentials из env переменных
- **Доступ к Docker socket** - требует монтирования `/var/run/docker.sock`
- **Доступ к воркспейсу** - требует монтирования директории воркспейса в read-only
- **Команды хоста** - использует `nsenter` для выполнения команд на хосте (требует `pid: host` и `privileged: true`)
- **Auth:** Роли ADMIN и VIEWER настраиваются через env переменные `DASHBOARD_ADMIN_*` и `DASHBOARD_VIEWER_*`
- **Self-deploy:** Dashboard может деплоить себя через кнопку; использует `systemd-run` для надёжного перезапуска контейнера
- **Автозапуск мониторинга:** `/api/monitoring/auto-start` - публичный эндпоинт, вызывается после перезапуска контейнера

Пример docker-compose.production.yml для dashboard:

```yaml
services:
  app:
    image: dashboard:latest
    ports: ['3002:3000']
    pid: 'host'
    privileged: true
    environment:
      WORKSPACE_DIR: ${WORKSPACE_PATH:-/home/deploy/letar}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${WORKSPACE_PATH:-/home/deploy/letar}:/workspace:ro
```

## Порты приложений

Распределение портов на production сервере:

| Приложение           | Порт | Сервер |
| -------------------- | ---- | ------ |
| premium-rosstil      | 3000 | s1     |
| imot                 | 3001 | s1     |
| dashboard            | 3002 | s2     |
| driving-school       | 3003 | s2     |
| mandala              | 3004 | s2     |
| kami                 | 3005 | s2     |
| pravda               | 3007 | s2     |
| animatrona-landing   | 3008 | s2     |
| animatrona-tracker   | 3009 | s2     |
| auth-hub             | 3010 | s2     |
| animatrona-web       | 3011 | s2     |
| kami-key-the-landing | 3011 | s2     |
| archetest            | 3012 | s2     |
| time                 | 3013 | s2     |
| letar-landing        | 3015 | s2     |
| grandslamcup         | 3016 | s2     |
| form-docs            | 3020 | s2     |
| form-example         | 3022 | s2     |
| umami                | 3033 | s2     |

## Бэкапы

⚠️ **Dashboard-agent НЕ подхватывает новые БД автоматически!** Каждое приложение с PostgreSQL нужно вручную зарегистрировать.

**Полная документация:** [backup-architecture.md](/.claude/docs/backup-architecture.md)

**При добавлении нового приложения с БД** — обязательно выполнить чеклист из `deployment-assistant` → «Чеклист: бекапы при деплое». Вкратце:

1. Добавить в `APP_CONFIG` (`apps/dashboard-agent/src/lib/database.ts`)
2. Добавить в `SERVER_APPS` (`apps/dashboard-agent/src/lib/server-config.ts`)
3. Маунт `.env.docker` как секрет в docker-compose dashboard-agent
4. Задеплоить dashboard-agent

**При добавлении uploads** — обязательно bind mount `./uploads:/app/apps/<app>/uploads` (не anonymous volume!). Resilio Sync бэкапит автоматически.

## Troubleshooting

## Seed базы данных

`nx db:seed` нельзя запускать напрямую на сервере — скрипт не найдёт `DATABASE_URL`, потому что `.env.docker` доступен только внутри контейнера.

### ✅ Правильный способ: флаг --seed при деплое

```bash
./deploy-affected.sh --app aboi --seed
```

Скрипт сам построит корректный `DATABASE_URL` из `.env.docker` + `docker-compose.production.yml` и передаст его в `nx db:seed`.

### ✅ Запуск seed вручную (без деплоя)

Нужно явно передать `DATABASE_URL`, собранный из реальных credentials:

```bash
# 1. Узнать DB_PASSWORD из .env.docker
grep DB_PASSWORD apps/<app>/.env.docker

# 2. Узнать POSTGRES_USER и POSTGRES_DB из docker-compose.production.yml
grep -E 'POSTGRES_USER|POSTGRES_DB' apps/<app>/docker-compose.production.yml

# 3. Узнать внешний порт БД
grep -A1 'ports:' apps/<app>/docker-compose.production.yml | grep '5432'

# 4. Запустить seed с явным DATABASE_URL
DATABASE_URL='postgresql://<user>:<password>@localhost:<port>/<db>' nx db:seed <app>
```

**Пример для aboi:**

```bash
DATABASE_URL='postgresql://aboi_user:<DB_PASSWORD>@localhost:5444/neyroaboi_prod' nx db:seed aboi
```

### ❌ Не работает

```bash
nx db:seed aboi              # DATABASE_URL не определён → SASL auth error
nx run aboi:db:seed          # То же самое
```

### Проблемы с базой данных

```bash
# Проверить логи PostgreSQL
docker compose -f docker-compose.production.yml logs -f db

# Подключиться к базе данных
docker compose -f docker-compose.production.yml exec db psql -U lena_user -d <db_name>

# Пересоздать контейнер БД (⚠️ потеря данных!)
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
```

### Проблемы с миграциями

```bash
# Применить миграции вручную
cd apps/<app-name>
docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy

# Просмотреть статус миграций
docker compose -f docker-compose.production.yml exec app npx prisma migrate status
```

### Проблемы с сетями

```bash
# Список сетей Docker
docker network ls

# Создать сеть вручную
docker network create premium-network

# Подключить контейнер к сети
docker network connect premium-network <container_name>
```
