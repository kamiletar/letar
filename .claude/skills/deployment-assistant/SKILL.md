---
name: deployment-assistant
description: |
  Помощник по деплою приложений. Используй при:
  - Деплое через deploy-affected.sh
  - Настройке Docker и docker-compose
  - Конфигурации Nginx Proxy Manager
  - Диагностике проблем с контейнерами
  - Работе с .env.docker переменными
  - Миграциях БД на production
  - Настройке бекапов (cron, uploads, pg_dump)
---

# Deployment Assistant

Помощник по деплою приложений в монорепозитории.

## Когда использовать

- Деплой через `deploy-affected.sh`
- Настройка Docker и docker-compose
- Конфигурация Nginx Proxy Manager
- Диагностика проблем с контейнерами
- Работа с `.env.docker` переменными
- Миграции базы данных на production

## Workflow

1. **Подготовка**
   - Проверь `.env.docker` для целевого приложения
   - Убедись что `Dockerfile.production` существует
   - Проверь `docker-compose.production.yml`

2. **Деплой**

   ```bash
   # Все затронутые приложения
   ./deploy-affected.sh

   # Конкретное приложение
   ./deploy-affected.sh --app <app-name>

   # Без git pull
   ./deploy-affected.sh --skip-git

   # Принудительная пересборка
   ./deploy-affected.sh --app <app> --skip-cache

   # Чистая установка
   ./deploy-affected.sh --app <app> --clean
   ```

3. **Проверка**
   - Логи: `docker compose -f docker-compose.production.yml logs -f app`
   - Статус: `docker ps`
   - Сети: `docker network ls`

## ⚠️ Подводные камни (из опыта деплоев)

### DATABASE_URL в .env.docker

**Проблема:** `deploy-affected.sh` делает `source .env.docker`, затем формирует `DATABASE_URL` через `localhost:PORT` для билда. Но если `.env.docker` содержит `DATABASE_URL=...@container-db:5432`, то `source` ставит docker-hostname, а Next.js при билде не может зарезолвить container hostname.

**Решение:** **НИКОГДА не класть `DATABASE_URL` в `.env.docker`**. Он не нужен ни для чего:

- **При билде** — `deploy-affected.sh` сам формирует из `DB_PASSWORD` + docker-compose ports
- **В контейнере** — задаётся через `environment:` секцию `docker-compose.production.yml`:

```yaml
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:${POSTGRES_PASSWORD}@container-db:5432/dbname
```

### DB_PASSWORD vs POSTGRES_PASSWORD

`deploy-affected.sh` читает `DB_PASSWORD` (не `POSTGRES_PASSWORD`) для формирования DATABASE_URL. Нужны **оба** в `.env.docker`:

```bash
POSTGRES_PASSWORD=<hex>   # Для docker-compose → PostgreSQL контейнер
DB_PASSWORD=<hex>          # Для deploy-affected.sh → DATABASE_URL при билде
```

### output: 'standalone' в next.config

Без `output: 'standalone'` Next.js не создаёт standalone папку и Docker image не работает. **Обязательно** для любого Next.js приложения с Docker.

### Миграции до первого деплоя

`deploy-affected.sh` запускает `prisma migrate deploy` (не `db:push`). Если `prisma/migrations/` не существует — миграция не применится и таблицы не создадутся.

**Перед первым деплоем локально:**

```bash
# Сбросить dev БД если есть drift
cd apps/<app> && npx prisma migrate reset --schema src/generated/schema.prisma --force
# Создать initial migration
nx db:migrate <app> -- --name init
# Закоммитить
git add apps/<app>/prisma/migrations/ && git commit
```

### Turbopack strict mode в production build

Turbopack в production mode **не прощает**:

- Unused imports (`'Flex' is declared but never read`)
- Несуществующие экспорты (`LuGrid2x2` → должен быть `LuGrid2X2`)
- Type errors (`as Type[]` может потребовать `as unknown as Type[]`)

В dev mode эти ошибки — warnings, в production — **fatal errors**. Проверяй перед деплоем:

```bash
nx typecheck:tsgo <app>
```

## Приложения и порты

### s1.letar.best

| Приложение      | Порт | Контейнер           | База данных |
| --------------- | ---- | ------------------- | ----------- |
| premium-rosstil | 3000 | premium-rosstil-app | PostgreSQL  |
| imot            | 3001 | imot-app            | PostgreSQL  |

### s2.letar.best

| Приложение           | Порт | Контейнер                | База данных | Домен                         |
| -------------------- | ---- | ------------------------ | ----------- | ----------------------------- |
| dashboard            | 3002 | dashboard-app            | PostgreSQL  | dash.letar.best               |
| driving-school       | 3003 | driving-school-app       | PostgreSQL  | направа.рф                    |
| auth-hub             | 3010 | auth-hub-app             | PostgreSQL  | auth.letar.best               |
| animatrona-web       | 3011 | animatrona-web-app       | Нет         | anime.letar.best              |
| archetest            | 3012 | archetest-app            | PostgreSQL  | archetest.letar.best          |
| grandslamcup         | 3016 | grandslamcup-app         | PostgreSQL  | gsc.letar.best                |
| time                 | 3013 | time-app                 | PostgreSQL  | time.letar.best               |
| form-example         | 3022 | form-example-app         | PostgreSQL  | forms.letar.best              |
| form-docs            | 3020 | form-docs-app            | Нет         | form-docs.letar.best          |
| letar-landing        | 3015 | letar-landing-app        | Нет         | letar.best                    |
| mandala              | 3004 | mandala-app              | PostgreSQL  | mandala.letar.best            |
| kami                 | 3005 | kami-app                 | PostgreSQL  | kami.letar.best               |
| pravda               | 3007 | pravda-app               | Нет         | pravda.letar.best             |
| animatrona-landing   | 3008 | animatrona-landing-app   | Нет         | animatrona.letar.best         |
| animatrona-tracker   | 3009 | animatrona-tracker-app   | PostgreSQL  | animatrona-tracker.letar.best |
| umami                | 3033 | umami-app                | PostgreSQL  | stats.letar.best              |
| kami-key-the-landing | 3011 | kami-key-the-landing-app | Нет         | kamikeythe.letar.best         |
| grandslamcup-staging | 3016 | grandslamcup-staging-app | PostgreSQL  | gsc-test.letar.best           |
| dsperevod            | 3019 | dsperevod-app            | PostgreSQL  | dsperevod.letar.best          |
| aboi                 | 3019 | aboi-app                 | PostgreSQL  | aboi.letar.best               |

## Переменная DOMAIN в .env.docker

Переменная `DOMAIN=` в `.env.docker` используется Dashboard для автозаполнения доменов при создании Nginx proxy host. Dashboard читает эту переменную из смонтированного secrets файла (`/secrets/<app>.env`).

```bash
# Формат — один или несколько доменов через запятую
DOMAIN=myapp.letar.best
DOMAIN=shop.rosstil.ru,www.shop.rosstil.ru
```

**Важно:** если `DOMAIN=` пустой или отсутствует, при создании proxy host домены придётся вводить вручную.

## ⚠️ ОБЯЗАТЕЛЬНО после первого деплоя нового приложения

После успешного первого деплоя нового приложения **ВСЕГДА** выполни шаги ниже — без этого:

- Приложение **не появится** в быстром выборе при создании Nginx Proxy Host
- БД приложения **не будет бэкапироваться** (если есть БД)

## Чеклист: добавление нового приложения в Dashboard

При добавлении нового приложения в инфраструктуру:

1. **`next.config`** — добавить `output: 'standalone'`
2. **`Dockerfile.production`** — создать (образец: `apps/archetest/Dockerfile.production`)
3. **`docker-compose.production.yml`** — создать с PostgreSQL + app (образец: `apps/archetest/docker-compose.production.yml`)
4. **Миграции** — создать initial migration **локально** перед первым деплоем:
   ```bash
   nx db:migrate <app> -- --name init
   git add apps/<app>/prisma/migrations/ && git commit
   ```
5. **`deploy-affected.sh`** — добавить имя приложения в массив `S1_APPS` или `S2_APPS`
6. **`apps/dashboard/prisma/seed.ts`** — добавить запись в `s1Apps` или `s2Apps` (name, displayName, containerName, port, type, domain)
7. **`.env.docker`** — создать файл (**⚠️ БЕЗ `DATABASE_URL`** — скрипт сам формирует):
   ```bash
   DOMAIN=app.letar.best
   POSTGRES_PASSWORD=<openssl rand -hex 24>
   DB_PASSWORD=<тот же пароль>       # для deploy-affected.sh
   BETTER_AUTH_SECRET=<openssl rand -hex 32>
   NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=     # создаётся в Umami после деплоя
   ```
8. **Зашифровать секреты** — `.env.docker` не коммитится, на сервер он попадает расшифровкой:

   ```bash
   sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker
   git add apps/<app>/.env.docker.enc
   ```

   ⛔ В `scripts/sync-env-docker.sh` / `pull-env-docker.sh` ничего добавлять не надо — они
   устарели с переходом на SOPS (доставку делает `decrypt_sops_env()` в `deploy-affected.sh`).
   Подробности: [secret-manager.md](/.claude/docs/secret-manager.md).

9. **Зарегистрировать в Dashboard** (seed через SQL, т.к. `bun prisma db seed` не работает на production — нет Prisma client в standalone build):

   ```bash
   # Узнать server ID
   ssh root@<server> 'docker exec dashboard-db psql -U dashboard_user -d dashboard \
     -c "SELECT id, name FROM \"Server\";"'

   # Вставить приложение (подставить server ID)
   ssh root@<server> 'docker exec dashboard-db psql -U dashboard_user -d dashboard -c "
   INSERT INTO \"DeployedApp\" (id, name, \"displayName\", \"containerName\", port, type, domain, \"serverId\", \"createdAt\", \"updatedAt\")
   VALUES (gen_random_uuid(), '\''<app>'\'', '\''Display Name'\'', '\''<app>-app'\'', <port>, '\''WEB'\'', '\''<app>.letar.best'\'', '\''<server-id>'\'', now(), now());
   "'
   ```

   После этого приложение появится в выборе при создании Proxy Host.

10. **Бекапы** — если приложение с БД и/или uploads, см. секцию «Чеклист: бекапы при деплое»

**Примечание:** Реестр приложений хранится в БД (`DeployedApp`). Seed в `apps/dashboard/prisma/seed.ts` нужен только для consistency — при переразвёртывании Dashboard он применится автоматически. Для добавления одного приложения используй SQL insert выше.

## Бекапы

### Автоматические бекапы (cron)

Dashboard-agent автоматически запускает cron-задачи по расписанию. Конфигурация: `/home/deploy/letar/cron-jobs.json`.

**Бекапы по умолчанию:**

| Задача             | Расписание | Что делает                           | Сервер |
| ------------------ | ---------- | ------------------------------------ | ------ |
| s1-database-backup | 02:00 UTC  | pg_dump всех БД на s1                | s1     |
| s2-database-backup | 02:00 UTC  | pg_dump всех БД на s2                | s2     |
| nginx-backup       | 03:00 UTC  | tar.gz данных + SSL сертификатов NPM | s1     |
| nginx-backup-s2    | 03:00 UTC  | аналогично для s2                    | s2     |

**Хранилище:** `/home/deploy/letar/backups/` → реплицируется через Resilio Sync.

**Управление:** Dashboard UI → `/cron` — включение/выключение, ручной запуск, история.

### Бекапы БД (pg_dump)

```bash
# Ручной бекап через dashboard-agent
curl -X POST http://localhost:3100/api/database/backup \
  -H "Authorization: Bearer $AGENT_TOKEN"

# Просмотр бекапов
curl http://localhost:3100/api/database/backups \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

Dashboard-agent определяет контейнер и credentials для каждого приложения автоматически из `/secrets/<app>.env`.

### Настройка расписания

Dashboard UI → `/database/backups` → Настройки:

- `daily` — 03:00 UTC
- `twice_daily` — 03:00 + 15:00 UTC
- `weekly` — воскресенье 03:00 UTC
- `custom` — произвольное cron-выражение

### Папка uploads

Приложения с загрузкой файлов хранят их в `uploads/` внутри контейнера, смонтированной как Docker volume.

**Приложения с uploads:**

| Приложение      | Путь в контейнере | Что хранится          |
| --------------- | ----------------- | --------------------- |
| premium-rosstil | `/app/uploads/`   | Фото товаров, аватары |
| mandala         | `/app/uploads/`   | Изображения мандал    |
| imot            | `/app/uploads/`   | Аватары пользователей |
| grandslamcup    | `/app/uploads/`   | Фото матчей           |

**Бекап:** Resilio Sync автоматически реплицирует `/home/deploy/letar/apps/<app>/uploads/` на Windows и pinner2. Отдельный cron не нужен.

**⚠️ КРИТИЧНО — bind mount в docker-compose.production.yml:**

```yaml
services:
  app:
    volumes:
      - ./uploads:/app/uploads # ✅ bind mount — Resilio видит файлы
      # - /app/uploads          # ❌ anonymous volume — файлы ПОТЕРЯЮТСЯ
```

Без bind mount данные останутся внутри Docker, Resilio их не увидит, и при пересоздании контейнера файлы будут потеряны навсегда.

## Чеклист: бекапы при деплое нового приложения

⚠️ **КРИТИЧНО:** Dashboard-agent **НЕ подхватывает** новые БД автоматически! Без ручной регистрации данные НЕ бэкапятся.

При добавлении приложения с БД и/или uploads:

1. **БД** — зарегистрировать в dashboard-agent (4 файла):
   - [ ] `apps/dashboard-agent/src/lib/database.ts` → `APP_CONFIG` — добавить запись с `secretsPath`, `containerName`, `defaults` (host, port, database, user)
   - [ ] `apps/dashboard-agent/src/lib/server-config.ts` → `SERVER_APPS` — маппинг `'<app>': 's1'` или `'s2'`
   - [ ] `apps/dashboard-agent/docker-compose.production.yml` — добавить volume mount секретов: `- ${WORKSPACE_PATH:-/home/deploy/letar}/apps/<app>/.env.docker:/secrets/<app>.env:ro`
   - [ ] Если на s2 и приложение НЕ в `driving-school-network` — убедиться что `kami-network` подключён
   - [ ] `.claude/docs/backup-architecture.md` — добавить строку в таблицу БД
   - [ ] Задеплоить dashboard-agent на целевой сервер
   - [ ] Проверить бэкап: `curl -X POST http://localhost:3100/api/database/backup?db=<app>`
2. **Uploads** (если приложение загружает файлы):
   - [ ] В `docker-compose.production.yml` — **обязательно bind mount**:
     ```yaml
     volumes:
       - ./uploads:/app/apps/<app>/uploads # ✅ Resilio увидит файлы
     ```
   - [ ] Проверить что папка `uploads/` создаётся при первом деплое
   - [ ] Убедиться что Resilio Sync реплицирует `apps/<app>/uploads/`
3. **Проверить** что cron-задача бекапа БД включена: Dashboard UI → `/cron`
4. **Обновить описания** в `cron-jobs.json` — добавить имя приложения в description задачи бэкапа

## Reference

### Основные

- `reference/docker-patterns.md` — Docker и docker-compose паттерны
- `reference/nginx-config.md` — Настройка Nginx Proxy Manager
- `reference/troubleshooting.md` — Решение типичных проблем

### Продвинутые

- `reference/ci-cd.md` — GitHub Actions, автодеплой, кэширование
- `reference/db-migrations-prod.md` — Миграции БД на production
- `reference/health-checks.md` — Liveness/readiness проверки
- `reference/rollback.md` — Процедуры отката
- `reference/monitoring.md` — Логи, метрики, алерты

## Ключевые файлы

- `deploy-affected.sh` — Главный скрипт деплоя
- `apps/<app>/Dockerfile.production` — Multi-stage сборка
- `apps/<app>/docker-compose.production.yml` — Сервисы
- `apps/<app>/.env.docker` — Переменные окружения
- `.last-deploy/` — Коммиты последних деплоев
