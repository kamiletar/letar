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

| Сервер            | Приложения                                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~s1.letar.best~~ | ~~выведен из эксплуатации~~                                                                                                                                                                                                                                    |
| **s2.letar.best** | dashboard, dashboard-agent, driving-school, animatrona-web, auth-hub, archetest, time, form-docs, form-example, grandslamcup, mandala, kami, pravda, animatrona-landing, animatrona-tracker, umami, kami-key-the-landing, letar-landing, premium-rosstil, imot |

⚠️ **ВАЖНО:** При деплое убедись, что подключаешься к правильному серверу!

> **Каноничный источник:** `deploy-affected.sh` → массивы `S1_APPS` / `S2_APPS`

## E2E-ранер и деплой — staging-gated пайплайн (PLAN.md §18)

**Обновлено сессия D:** ночной cron на s3 (`0 2 * * *`, полный прогон по SSH) остаётся как был —
это отдельный процесс, не про конкретный деплой. Отдельно появился **воркфлоу через `deploy-mcp`**,
завязанный на конкретный коммит и конкретное приложение:

```
deploy_app({ app, target: "staging" })                                  → s3: образ <app>:staging,
                                                                            контейнер на своём хостовом
                                                                            порту (docker-compose.staging.yml)
run_e2e({ app, baseUrl: "https://<app>-stage.s3.letar.best" })          → s3: nx e2e <app>-e2e против baseUrl
                                                                            (BASE_URL — конвенция всех
                                                                            playwright.config.ts)
                                                                            → пишет .last-e2e-status/<app>.json
deploy_app({ app })                                                      → target production (по умолчанию):
                                                                            deploy-mcp читает
                                                                            .last-e2e-status/<app>.json на s3.
```

**Два режима гейта одновременно** (2026-07-28, инцидент archetest v0.25.5):

- **Warn-only** (по умолчанию, для всех приложений вне списка ниже) — только ПРЕДУПРЕЖДАЕТ, не
  блокирует, если данных нет / прогон упал / коммит другой / старше 24ч.
- **Hard gate** (`HARD_GATED_APPS` в `libs/infra-config/src/index.ts`: `archetest`, `dsperevod`,
  `svoichuzhie`, `aboi`, `aprel8008`) — **ОТКАЗЫВАЕТ** в том же наборе случаев, fail-closed
  (включая ошибку самой проверки статуса — «не могу проверить» тоже блокирует, не пропускает).
  `deploy_app` в этом случае возвращает `isError` до вызова `/api/deploy/app` — деплой на прод
  не запускается вообще, ни на шаг.

`baseUrl` передаётся явно в `run_e2e` — намеренно, максимально близко к прод-окружению: **реальный
HTTPS-домен** `<app>-stage.s3.letar.best`, не `localhost`. Cookie/CORS/OIDC-редиректы на `localhost`
живут в другом security-контексте браузера (нет `Secure`-cookie, нет настоящего cross-origin между
staging-приложением и `auth.letar.best`) — тестирование против `localhost` не проверяет именно то,
что чаще всего ломается при релизе. Домен — **один лейбл** (`<app>-stage`, дефис, не точка) —
попадает под уже существующий DNS wildcard `*.s3 CNAME s3.letar.best` (`server-provision.md`),
новая DNS-запись не нужна (`<app>.stage.s3.letar.best`, с точкой, НЕ подходит — DNS-wildcard
матчит только один лейбл перед `.s3.letar.best`). NPM на s3 (уже поднят, порты 80/81/443
публичны) → Proxy Host на этот домен, TLS через стандартный Let's Encrypt HTTP-01 (не wildcard,
не DNS-01 — обычный флоу NPM, т.к. каждый staging-домен создаётся отдельным Proxy Host с
собственным сертификатом) → форвард на хостовый порт staging-контейнера через docker-хост-гейтвей
(`172.17.0.1:<port>` по умолчанию, а не имя контейнера — NPM и staging-compose в разных Docker
сетях, `docker network connect` ломает `compose down` staging-сети). Настройка Proxy Host'а —
задача BlackCove/владельца, deploy-mcp и dashboard-agent её не автоматизируют.

### Staging-данные: анонимизированный снепшот прод, не seed-фикстуры

Публичные турнирные модели (`Player`/`Team`/`Match`/`Standings`/`Poem` и т.п. — везде
`@@allow('read', true)` в schema.zmodel) копируются из прод БД как есть: это ровно то, что должен
увидеть e2e/QA, и анонимизация тут не нужна и не имеет смысла. Приватные модели (аккаунты,
сессии, заявки с контактами) требуют дисциплины 152-ФЗ:

1. **`pg_dump` на s2 с исключением секретных таблиц** флагами `-T` — `Account`/`Session`/
   `Verification`/`consentLog`/`PushSubscription` не должны попадать в дамп вообще (OAuth-токены,
   session-токены, аудит согласий реальных пользователей — исключение на этапе дампа, не удаление
   после, минимизирует окно, когда сырые секреты вообще где-то лежат вне прод-БД).
2. Восстановление в `grandslamcup-staging-db` на s3 (после того как staging-деплой уже прогнал
   миграции — схема должна существовать до `pg_restore --data-only`).
3. **`bun apps/grandslamcup/scripts/anonymize-staging-db.ts`** (запускать с `DATABASE_URL`,
   указывающим на staging) — псевдонимизирует `User.email/name/image/telegramChatId`, чистит
   контактные поля неподтверждённых `RosterApplication`, и на всякий случай (defence in depth)
   ещё раз чистит секретные таблицы, если pg_dump их всё же затянул. Скрипт отказывается работать,
   если `DATABASE_URL` не похож на staging-хост — защита от случайного запуска на проде.

Это должно выполняться при каждом обновлении staging-снепшота (не только один раз) — задача для
BlackCove при первичной настройке пайплайна на новом приложении, кандидат на автоматизацию
отдельным шагом в будущем (не в скоупе Сессии D).

Gate живёт в `deploy-mcp` (`libs/deploy-mcp/src/server.ts`, `evaluateE2eGate()`) — это единственное
место, видящее оба сервера сразу. `deploy-affected.sh` по-прежнему не знает про e2e — вся логика
gate на уровне MCP-инструмента `deploy_app`.

⚠️ **Ограничение честно названо в PLAN.md §18:** из-за инлайна `NEXT_PUBLIC_*` в сборку gate
гарантирует «этот коммит прошёл e2e на staging-сборке», а не «этот конкретный production-артефакт
протестирован» (build once/promote — вне скоупа Фазы 1–2).

**Hard gate для `HARD_GATED_APPS` реализован 2026-07-28** (см. выше) — покрывает archetest,
dsperevod, svoichuzhie, aboi, aprel8008. Для `grandslamcup` (Фаза 3, `PLAN.md` §18.6) отдельное
решение о переводе на hard gate по-прежнему ждёт недели эксплуатации warn-only — эти два трека
независимы, `grandslamcup` в `HARD_GATED_APPS` не входит.

Полная инфраструктура e2e-ранера (контейнеры, порты, настройка нового приложения, обновление
репозитория на s3) — [e2e-testing.md § «E2E-ранер на s3»](/.claude/docs/e2e-testing.md#e2e-ранер-на-s3-188127235141).
API-роут `/api/e2e/run` + `/api/e2e/status` — `apps/dashboard-agent/src/routes/e2e.ts`,
MCP-инструменты `run_e2e`/`e2e_status` — `libs/deploy-mcp/README.md`.

## Docker сети

Все веб-приложения используют Docker сети для коммуникации:

- **kami-network** - общая сеть для большинства production-приложений на s2 (kami, dashboard,
  driving-school, archetest и др.) и Nginx Proxy Manager. Переименована из `premium-network`
  (название осталось от decommissioned `premium-rosstil`/`imot`, сняты с поддержки 2026-07-05).
- **imot-network** - использовалась приложением imot (decommissioned)
- **mandala-network** - используется приложением mandala (если есть)
- **driving-school-network** - используется приложением driving-school (если есть)

> ⚠️ Фактическое переименование Docker-сети на сервере (пересоздание сети + переподключение
> всех контейнеров) выполняется отдельным заходом через BlackCove — правки в коде (docker-compose,
> deploy-engine) сами по себе сеть на сервере не переименовывают.

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

### Текущие хосты (актуально на 2026-06-20)

#### s1.letar.best

| Домен             | Приложение | Порт |
| ----------------- | ---------- | ---- |
| npm.s1.letar.best | localhost  | 81   |

#### s2.letar.best

| Домен                         | Приложение               | Порт |
| ----------------------------- | ------------------------ | ---- |
| _(коммерческий домен)_        | premium-rosstil-app      | 3000 |
| _(коммерческий домен)_        | imot-app                 | 3001 |
| dash.letar.best               | dashboard-app            | 3002 |
| _(коммерческий домен)_        | driving-school-app       | 3003 |
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
| svoichuzhie.letar.best        | svoichuzhie-app          | 3021 |
| npm.s2.letar.best             | localhost                | 81   |

## Telegram API — прокси через mail сервер

**Проблема:** IP-диапазоны `api.telegram.org` (149.154.x, 91.108.x) заблокированы провайдером ДЦ на s1/s2 — как для хостовых процессов, так и для Docker контейнеров.

**Решение:** обратный прокси на **mail сервере (193.37.68.73)** через Nginx Proxy Manager.

### Домены прокси

| Домен                 | Назначение                             | Куда проксирует             |
| --------------------- | -------------------------------------- | --------------------------- |
| `tg-proxy.letar.best` | **Исходящие** запросы к Bot API        | `https://api.telegram.org`  |
| `tg-in.letar.best`    | **Входящие** webhook от Telegram Cloud | конкретное приложение на s2 |

### Использование в приложениях

Все приложения, отправляющие запросы к Telegram Bot API, должны использовать переменную:

```env
# .env.docker
TELEGRAM_API_ROOT=https://tg-proxy.letar.best
```

Вместо хардкода `api.telegram.org`:

```typescript
// ✅ Правильно — через прокси
const apiRoot = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'
await fetch(`${apiRoot}/bot${token}/sendMessage`, ...)

// ❌ Неправильно — прямой вызов не работает с s1/s2
await fetch(`https://api.telegram.org/bot${token}/sendMessage`, ...)
```

Библиотека **grammy** поддерживает через `apiRoot`:

```typescript
const bot = new Bot(token, { client: { apiRoot: process.env.TELEGRAM_API_ROOT } })
```

### Nginx конфиг (mail сервер)

Конфиг хранится в `/root/nginx-proxy-manager/data/nginx/custom/http.conf` на mail сервере.
При добавлении нового webhook-приложения — добавить location в этот файл.

### Кто использует

- `apps/grandslamcup` — `TELEGRAM_API_ROOT` + `TELEGRAM_WEBHOOK_URL=https://tg-in.letar.best/grandslamcup/...`
- `infra/canary` — `TELEGRAM_API_ROOT` для алертов

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
5. **Проверяет миграции** - `prisma migrate status`: если применять нечего — шаги 6–7 пропускаются
6. **Дамп перед миграцией** - `pg_dump | gzip` в `/home/deploy/pre-migrate-dumps/<app>-<sha>-<ts>.sql.gz` (ротация: последние 3 на приложение). Дамп не удался → **деплой приложения прерывается** (миграция без бэкапа запрещена; явный обход — `SKIP_PREMIGRATE_DUMP=1`)
7. **Применяет миграции** - `prisma migrate deploy`. Ошибка миграции → **деплой приложения прерывается**, старый контейнер не трогается (до 2026-07-09 был только warning и деплой продолжался — исправлено)
8. **Собирает приложение** - Использует Nx кэш: `nx build <app>`
9. **Собирает Docker образ** - Production образ из `Dockerfile.production`, два тега: `<app>:latest` (или `:staging`) **и `<app>:<short-sha>`** для отката (ретеншн: последние 3 sha-тега)
10. **Деплоит контейнеры** - Запускает `docker compose up -d --force-recreate app`
11. **Показывает логи** - Выводит логи контейнера для задеплоенного приложения

### Откат (rollback) без пересборки

Каждый успешный билд дополнительно тегируется git SHA (`<app>:<short-sha>`, хранятся последние 3):

```bash
# На сервере: посмотреть доступные версии
docker images <app>

# Откатиться на предыдущую версию (пример: driving-school на abc1234)
cd /home/deploy/letar/apps/<app>
docker compose -f docker-compose.production.yml --env-file .env.docker up -d --force-recreate app \
  # предварительно указав образ: проще всего временно перетегировать
docker tag <app>:<sha> <app>:latest && docker compose -f docker-compose.production.yml --env-file .env.docker up -d --force-recreate app
```

⚠️ Откат образа **не откатывает миграции БД** — если миграция уже применена, старый код должен быть с ней совместим (для этого миграции должны быть backward-compatible) либо восстанавливай БД из pre-migrate дампа (`/home/deploy/pre-migrate-dumps/`).

### ⚠️ Healthcheck — никогда `localhost`, только `127.0.0.1` или `0.0.0.0`

`/etc/hosts` внутри Docker-контейнера обычно резолвит `localhost` в `::1` (IPv6) **раньше**
`127.0.0.1`. Next.js по умолчанию слушает только `0.0.0.0` (IPv4) — IPv6-listener'а нет. Если
healthcheck-команда использует `wget http://localhost:<port>/...`, `busybox wget` (тот, что в
Alpine-образах) **не делает fallback на IPv4** при неудаче по IPv6 — здоровый, полностью рабочий
контейнер стабильно получает `connection refused` и уходит в `unhealthy`, при этом внешний трафик
через nginx (отдельный сетевой путь, IPv4 к опубликованному порту) продолжает работать нормально.

Прецедент: `svoichuzhie` был `unhealthy` в `docker ps` **4 дня подряд**, пока сайт реально работал
для пользователей — маскировало настоящую диагностику (потрачено время на гипотезы про memory
throttling/утечку event loop, прежде чем нашли одну строку). Правильная команда:

```yaml
# ❌ НЕ ТАК
healthcheck:
  test: ['CMD-SHELL', 'wget -qO- http://localhost:3021/api/health || exit 1']

# ✅ ТАК — 127.0.0.1 или 0.0.0.0, никогда localhost
healthcheck:
  test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:3021/api/health || exit 1']
```

### Необходимые файлы для каждого приложения

Каждое деплоируемое приложение требует:

- `Dockerfile.production` — Multi-stage Docker сборка
- `docker-compose.production.yml` — PostgreSQL + Next.js app сервисы (если есть БД)
- `.env.docker.enc` **или** `.env.docker` — переменные окружения

> **SOPS:** если для приложения есть `.env.docker.enc` в git, `deploy-affected.sh` автоматически
> расшифровывает его в `.env.docker` перед деплоем. Требует `SOPS_AGE_KEY_FILE` на сервере.
> Подробнее: [secret-manager.md](/.claude/docs/secret-manager.md)

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

#### ⚠️ Чеклист секции `db:` — обязательно для миграций

`deploy-affected.sh` прогоняет `prisma migrate deploy` **с хоста** (не изнутри контейнера) перед
пересборкой образа. Если секция `db:` не соответствует любому из пунктов ниже — деплой падает на
шаге миграций, а не на билде (найдено на `form-example`, 2026-07-15, три независимых бага за один
rollout — см. `apps/form-example/PLAN_COMPLETED.md`):

- [ ] **`ports:` обязателен и публикует уникальный host-порт** (`'<port>:5432'`) — скрипт
      парсит `ports:` секции регэкспом и коннектится на `localhost:$DB_PORT` для миграций.
      Без `ports:` (только внутренняя сеть) — `P1001: Can't reach database server at localhost:5432`.
      Не ставь комментарий МЕЖДУ `ports:` и первой строкой порта — парсер берёт следующую строку
      буквально (`grep -A 1 "ports:"`), комментарии — только НАД блоком `ports:`.
- [ ] **`.env.docker` содержит именно `DB_PASSWORD`**, не только `POSTGRES_PASSWORD` — скрипт
      строит `DATABASE_URL` для миграций из переменной `DB_PASSWORD` (даже если compose использует
      `POSTGRES_PASSWORD` для самого Postgres-сервиса). Разошедшиеся имена → пустой пароль в URL →
      `P1000: Authentication failed`. Если оба нужны — держи одинаковое значение в обеих переменных.
- [ ] **`prisma/migrations/` существует и не пуста** до первого `letar.rollout`/production-деплоя.
      Если схема раньше накатывалась через `prisma db push` (без истории миграций) — `migrate
  deploy` против непустой БД падает `P3005: database schema is not empty`. Нужен baseline:
      сгенерировать первую миграцию локально (`nx db:migrate <app> -- --name init`, при
      необходимости — `migrate dev --create-only` из текущей схемы), закоммитить, затем на
      проде выполнить `prisma migrate resolve --applied <migration_name>` (только пометка в
      `_prisma_migrations`, без реального DDL — схема там уже такая).

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

| Файл              | Назначение                                          | Git              |
| ----------------- | --------------------------------------------------- | ---------------- |
| `.env`            | **Минимальный** — только порт и публичные настройки | ✅ Отслеживается |
| `.env.local`      | Локальная разработка (секреты, API ключи)           | ❌ В gitignore   |
| `.env.docker`     | **Production** — все переменные для Docker          | ❌ В gitignore   |
| `.env.docker.enc` | Зашифрованная копия `.env.docker` (SOPS + age)      | ✅ Отслеживается |

**НИКОГДА не добавляй секреты в `.env`** — он коммитится в git!

Для приложений с `.env.docker.enc` — управлять секретами через SOPS.
Подробнее: [secret-manager.md](/.claude/docs/secret-manager.md)

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

## Добавление нового приложения в Dashboard

При создании нового приложения нужно зарегистрировать его в двух местах:

### 1. Реестр приложений Dashboard (DeployedApp)

Dashboard хранит список приложений в PostgreSQL (`DeployedApp` таблица). Без этого приложение не появится в выпадающем списке «Выберите приложение» при создании Proxy Host.

**Добавить в seed.ts** (`apps/dashboard/prisma/seed.ts`), в массив `s2Apps` или `s1Apps`:

```typescript
{
  name: 'my-app',               // имя приложения (уникальное)
  displayName: 'My App Name',   // отображаемое имя в UI
  containerName: 'my-app-app',  // имя Docker контейнера
  port: 3025,                   // внутренний порт контейнера
  type: 'WEB' as const,
  domain: 'my-app.letar.best',
},
```

После коммита и пуша — применить к production БД напрямую через psql:

```bash
# Получить server ID
docker exec dashboard-db psql -U dashboard_user -d dashboard \
  -c "SELECT id FROM \"Server\" WHERE name = 's2-letar';"

# Вставить приложение
docker exec dashboard-db psql -U dashboard_user -d dashboard -c "
INSERT INTO \"DeployedApp\" (id, name, \"displayName\", \"containerName\", port, type, domain, \"serverId\", \"createdAt\", \"updatedAt\")
VALUES (gen_random_uuid(), 'my-app', 'My App Name', 'my-app-app', 3025, 'WEB', 'my-app.letar.best', '<server_id>', NOW(), NOW())
ON CONFLICT (name, \"serverId\") DO UPDATE SET domain = EXCLUDED.domain;
"
```

> **Примечание:** seed.ts нельзя запустить напрямую с сервера (`bun prisma/seed.ts`) — нет сгенерированных типов Prisma. Используй прямой SQL через `docker exec`.

### 2. Nginx Proxy Manager

После добавления в реестр — создай Proxy Host в Dashboard UI (`dash.letar.best/nginx/proxy-hosts`):

- **Domain:** `my-app.letar.best`
- **Forward Host:** `my-app-app` (имя контейнера)
- **Port:** `3025` (внутренний порт)
- **SSL:** Let's Encrypt

Не забудь обновить таблицу в [nginx-proxy-manager/README.md](/infra/nginx-proxy-manager/README.md).

---

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

> **Каноничный источник истины** — эта таблица. При любом расхождении с кодом — исправляй код, не таблицу.

### Правила работы с портами

⚠️ **КРИТИЧНО: три правила которые нельзя нарушать:**

1. **HOST-порт в `docker-compose.production.yml` ОБЯЗАН совпадать с портом из таблицы ниже.**

   ```yaml
   # ✅ Правильно (svoichuzhie, порт 3021)
   ports:
     - '3021:3021' # HOST:CONTAINER — оба одинаковые

   # ❌ Неправильно — HOST 3023 ≠ зарегистрированный 3021
   ports:
     - '3023:3021'
   ```

2. **Перед добавлением нового приложения — зарезервируй порт в этой таблице** и только потом пиши docker-compose. Не бери "первый попавшийся".

3. **CONTAINER-порт должен совпадать с `PORT=` в `.env` приложения.** HOST-порт = порт из таблицы = то, что NPM видит при проксировании.

### Верификация перед деплоем

```bash
# Проверить нет ли конфликта на сервере перед деплоем
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s2.letar.best "ss -tlnp | grep <PORT>"

# Полная карта занятых портов
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s2.letar.best "docker ps --format '{{.Names}}\t{{.Ports}}' | sort"
```

### Таблица портов (актуально 2026-06-20, синхронизировано с `docker ps`)

| Приложение           | Внешний порт                                                                      | Внутренний порт | Сервер |
| -------------------- | --------------------------------------------------------------------------------- | --------------- | ------ |
| premium-rosstil      | 3000                                                                              | 3000            | s2     |
| imot                 | 3001                                                                              | 3001            | s2     |
| dashboard            | 3002                                                                              | 3002            | s2     |
| driving-school       | 3003–3004                                                                         | 3003–3004       | s2     |
| kami                 | 3005                                                                              | 3005            | s2     |
| pravda               | 3007                                                                              | 3007            | s2     |
| animatrona-landing   | 3008                                                                              | 3008            | s2     |
| umami                | 3009                                                                              | 3000            | s2     |
| auth-hub             | 3010                                                                              | 3010            | s2     |
| kami-key-the-landing | 3011                                                                              | 3011            | s2     |
| archetest            | 3012                                                                              | 3012            | s2     |
| time                 | 3013                                                                              | 3013            | s2     |
| letar-landing        | 3015                                                                              | 3015            | s2     |
| grandslamcup         | 3016                                                                              | 3016            | s2     |
| aira-web             | 3017                                                                              | 3017            | s2     |
| grandslamcup-staging | 3018                                                                              | 3016            | s2     |
| aboi                 | 3019                                                                              | 3018            | s2     |
| form-docs            | 3020                                                                              | 3020            | s2     |
| svoichuzhie          | 3021                                                                              | 3021            | s2     |
| form-example         | 3022                                                                              | 3022            | s2     |
| aprel8008            | 3023                                                                              | 3023            | s2     |
| mandala              | 3025                                                                              | 3004            | s2     |
| animatrona-tracker   | 3026                                                                              | 3010            | s2     |
| dsperevod            | ⚠️ **КОНФЛИКТ** — занял 3021 (svoichuzhie). Нужно назначить свободный порт (3027+) | 3019            | s2     |

### Свободные порты (s2)

`3006`, `3014`, `3024` (используется svoichuzhie временно), `3027`, `3028`, `3029`, `3030+`

> Следующее новое приложение → берёт первый свободный из этого списка и сразу регистрирует здесь.

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

### next build падает с EAI_AGAIN / ECONNREFUSED при prerender

**Причина:** `deploy-affected.sh` экспортирует `DATABASE_URL=localhost:<port>` для `prisma migrate deploy`. `next build` запускает prerender-воркеры как отдельные дочерние процессы — они **не наследуют** переменные окружения хост-процесса. Результат: `EAI_AGAIN svoichuzhie-db` или `ECONNREFUSED localhost:5446` в страницах с `generateStaticParams` или page-level DB-запросами.

**Диагностика:** `prisma migrate` проходит успешно, но `nx build` падает именно при prerender. Характерно для приложений, которые обращаются к БД напрямую на уровне страниц (не только внутри Server Actions).

**Решение — выбрать одно:**

1. **`force-dynamic`** (SSR, полностью SEO-совместимо — Googlebot получает полный HTML как при static):

   ```typescript
   export const dynamic = 'force-dynamic'
   ```

2. **ISR + try/catch fallback** (рекомендуется если нужен revalidate):
   ```typescript
   export const revalidate = 3600

   export async function generateStaticParams() {
     try {
       const posts = await db.post.findMany(...)
       return posts.map(p => ({ slug: p.slug }))
     } catch {
       return [] // build пройдёт без БД; страницы будут рендериться on-demand
     }
   }
   ```

**Обязательный критерий приёмки:** `nx build <app>` должен проходить **локально без запущенной БД** — это точный симулятор поведения prerender-воркеров.

> **SEO-справка:** `force-dynamic` ≠ CSR. Это SSR: Googlebot при каждом кроуле получает полностью готовый HTML (в отличие от CSR, где индексируется пустая оболочка). С SEO-точки зрения равнозначно статической странице.

---

### Submodule "not our ref" — git submodule update падает

**Симптом:** `deploy-affected.sh` завершается ошибкой вида `error: Server does not allow request for unadvertised object <sha>` или `fatal: not our ref <sha>`.

**Причина:** SHA коммита в `.gitmodules` / gitlink в letar указывает на коммит, который не был запушен в приватный submodule-репо. Это происходит когда коммит создан локально в submodule, letar уже зафиксировал этот SHA, но `git push` в приватный репо не был выполнен.

**Исправление:**

```bash
# Проверить какой SHA зафиксирован в letar
git submodule status

# Запушить конкретный SHA в приватный репо (fast-forward безопасен)
git -C apps/<submodule> push origin <sha>:refs/heads/main

# Убедиться что push прошёл
git -C apps/<submodule> log origin/main -1 --oneline
```

После этого деплой продолжится с `--skip-git` или обычным способом.

---

### Env-переменные пропадают при self-deploy через dashboard-agent (nsenter → sudo сбрасывает env)

**Симптом:** `deploy-affected.sh`, запущенный вручную по SSH под пользователем `deploy` с явным `export VAR=...`, работает; тот же деплой через `deploy_app` (dashboard-agent → `nsenter` на хосте) падает, как будто переменная не задана — даже если она явно передана в `env:` при спавне процесса в Node.

**Причина:** в начале `deploy-affected.sh` есть блок:

```bash
if [ "$(id -u)" = "0" ] && [ "${DEPLOY_AS_ROOT:-0}" != "1" ] && id deploy >/dev/null 2>&1; then
  exec sudo -u deploy -H -- bash "$0" "$@"
fi
```

Когда скрипт запускается через `nsenter` из контейнера dashboard-agent, эффективный uid = 0 (root внутри host-namespace) → срабатывает эта ветка → `sudo -u deploy` **сбрасывает окружение** (env reset — стандартное поведение sudo без `--preserve-env`/sudoers `env_keep`). Любая переменная, переданная в `env:` спавна из Node, теряется на этом переключении пользователя.

**Почему по SSH под `deploy` всегда работало:** `id -u` != 0 → ветка `if` не срабатывает, `sudo` не вызывается, переменные из SSH-сессии доживают без вмешательства.

**Исправление (уже применено, `1160e9e`):** дефолт-значение прямо в скрипте, после sudo-блока:

```bash
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/home/deploy/.age/letar-key.txt}"
```

`--preserve-env=VAR` в `sudo` — сознательно **не выбран**: без `SETENV` в sudoers он не игнорирует флаг, а **падает** («not allowed to preserve the environment»), рискуя уронить весь деплой. Дефолт в скрипте работает при любом способе запуска и не трогает sudoers на сервере.

**Правило на будущее:** любая новая env-переменная, нужная `deploy-affected.sh` при запуске через `dashboard-agent`/`deploy-mcp` (не только по прямому SSH), должна иметь дефолт в самом скрипте после sudo-блока — полагаться на проброс через `spawn(..., { env })` недостаточно.

---

### Self-деплой dashboard-agent обрывается на recreate-шаге

**Ключевой факт:** `deploy-mcp`/`deploy_app` работает через SSH-туннель (`:13100`) **в тот же самый контейнер dashboard-agent**, который выполняет и оркеструет деплой. Это не отдельная инфраструктура — деплой-агент деплоит сам себя.

**Симптом:** при `deploy_app(dashboard-agent, production)` скрипт доходит до `docker compose up -d` → останавливает старый контейнер `dashboard-agent` → в этот момент обрывается сам процесс `deploy-affected.sh` (он жил внутри старого контейнера) → новый контейнер остаётся в статусе `Created`, но не стартует. `deploy_status` после этого падает с `Не удалось достучаться до агента на s2 (туннель :13100): fetch failed` — потому что обслуживающий туннель контейнер только что убит.

**Починка (ручная, до системного фикса):**

```bash
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s2.letar.best \
  "cd /home/deploy/letar/apps/dashboard-agent && export SOPS_AGE_KEY_FILE=/home/deploy/.age/letar-key.txt && docker compose -f docker-compose.production.yml --env-file .env.docker up -d"
```

Проверить `docker ps -a --filter name=dashboard-agent` — если новый контейнер `Created`, а старый `Exited`, это тот самый обрыв, а не ошибка сборки.

**Правило на будущее:** деплой dashboard-agent на прод **всегда** рискует зависнуть на этом шаге — закладывать это как ожидаемый риск, не как аномалию. Системный фикс не применён (возможные варианты: `docker compose up -d --wait`, health-check-retry с большим таймаутом в `deploy-affected.sh`, либо запуск оркестрации через отдельный процесс/watchdog, не убиваемый вместе с самим контейнером).

---

### Submodule на сервере отстаёт — untracked-файлы блокируют checkout

**Симптом:** `git pull --recurse-submodules` обновляет основной репо, но для отдельных submodule падает:

```
error: The following untracked working tree files would be overwritten by checkout:
	next-env.d.ts
Please move or remove them before you switch branches.
Aborting
fatal: Unable to checkout '<sha>' in submodule path 'apps/<submodule>'
```

**Причина:** внутри submodule на сервере накопились untracked-файлы (артефакты сборки/тестов — `next-env.d.ts`, `playwright/.auth/*.json` и т.п.), которые git не может молча перезаписать при смене SHA submodule.

**Где встречалось:** `driving-school`/`driving-school-e2e` на s3 (2026-07-10) — не блокирует деплой других приложений (submodule обновляется независимо), но сам submodule остаётся на старом коммите до ручной чистки.

**Исправление (вручную на сервере):**

```bash
cd apps/<submodule>
git status --short          # найти untracked-файлы
git clean -fd <файл>         # или rm -f <файл>, если это точно артефакт, не рабочая правка
cd ../..
git submodule update --recursive
```

⚠️ Перед `git clean`/`rm` — убедиться, что файл действительно generated-артефакт (e2e-фикстуры, `.next`-типы), а не чья-то незакоммиченная работа на сервере.

---

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
docker network create kami-network

# Подключить контейнер к сети
docker network connect kami-network <container_name>
```
