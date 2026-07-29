# Создание нового Next.js приложения

Создай новое Next.js приложение со всеми необходимыми настройками.

⚠️ **Electron-приложение (десктопное, не веб)?** Вся эта инструкция — про Next.js веб-приложения.
Для Electron есть отдельный генератор: `nx g @letar/generators:electron-app <name>` (см.
`libs/generators/README.md` и `.claude/rules/electron.md`). Раздел «Приватные приложения» ниже
(submodule) всё равно применим — сначала сгенерируй приложение, потом заведи submodule.

## Параметры

- **Имя приложения:** $ARGUMENTS (например: `my-app`)
- **Порт:** по умолчанию — следующий за максимальным занятым 3xxx (генератор сканирует `apps/*/.env`,
  `apps/*/.env.local` и `-p <порт>` в `apps/*/project.json`; 3000 не выдаётся — это дефолт Next.js)

## Шаг 1 — Генерация каркаса

```bash
nx g @letar/generators:new-app <name>
# с явным портом/именем/описанием/приватностью:
nx g @letar/generators:new-app <name> --port=3033 --displayName="Моё приложение" --private
```

Генератор раскладывает весь чистый каркас (Next.js App Router + Chakra UI v3 + MDX): `.env` (PORT),
`README.md`, `PLAN.md`, `PLAN_COMPLETED.md`, `PLAN_TESTING.md`, `CHANGELOG.md`, `package.json`,
`project.json` (typecheck/typecheck:tsgo/oxlint/lint/format/test), `vitest.config.ts` + `vitest.setup.tsx`,
`next.config.mjs` (MDX + Nx, без `output: 'standalone'` — это добавляется на этапе первого деплоя, см.
ниже), `tsconfig.json`, `eslint.config.mjs`, `src/app/layout.tsx` (Providers + UmamiScript, **без**
импорта `global.css`), `src/app/page.tsx`, `src/app/_components/providers.tsx`,
`src/mdx-components.tsx`, `src/theme/{index.ts,tokens/**,semanticTokens/**}` (placeholder-палитра —
замени под фирменный стиль). Никакого boilerplate, который обычно приходится вычищать руками после
`nx g @nx/next:application` (`global.css`, `.swcrc`, `next.config.js`, `api/hello`) — этого просто нет.

**Не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с понятной ошибкой.
Подробности и что генератор делает под капотом: [libs/generators/README.md](/libs/generators/README.md#new-app).

Каркас **осознанно минимален** — без БД, форм, аутентификации, PWA, cookie-баннера. Это отправная точка,
а не копия эталонов ниже.

## Эталонные приложения (для более сложных фич)

- **`apps/grandslamcup`** — публичный, Chakra v3 + Prisma/ZenStack + Docker + PWA (Serwist). Смотри
  сюда, когда каркасу от генератора понадобится БД/PWA.
- **`apps/driving-school`** — приватный submodule, расширенный эталон (Better Auth + Organizations,
  мультитенантность, ZenStack access policies, формы, темизация). Смотри сюда для более сложной фичи.

⛔ **`apps/pravda` больше НЕ эталон** — там специфическая логика (документы/законы, MDX-компоненты
Article/Penalty/Quote). Не копируй из неё, если только не делаешь похожий контент-сайт.

## Шаг 2 — Проверить каркас

```bash
nx dev <name>              # проверь, что страница открывается
nx typecheck:tsgo <name>
nx lint <name>
nx test <name>
```

## Приватные приложения

Если новое приложение **должно быть приватным** (закрытый код, коммерческий продукт, NDA), создавай его как **git submodule** по паттерну `kamiletar/letar-private-<name>` — **после** генерации каркаса генератором из Шага 1:

```bash
# 1. Создать пустой приватный репо на GitHub
gh repo create kamiletar/letar-private-<name> --private --description "<name> app"

# 2. Перенести уже сгенерированный apps/<name> в submodule
cd apps/<name>
git init -b main
git remote add origin git@github.com:kamiletar/letar-private-<name>.git
git add . && git commit -m "chore: initial scaffold"
git push -u origin main

# 3. Связать как submodule в letar (сначала удали обычную папку, потом submodule add)
cd C:/web/letar
rm -rf apps/<name>
git submodule add git@github.com:kamiletar/letar-private-<name>.git apps/<name>
git add .gitmodules apps/<name>
git commit -m "chore: add <name> as private submodule"
```

⚠️ **Проверь, что `.gitignore` на месте перед первым `git add .`** (шаг 2). Корневой `.gitignore`
монорепо на вложенный репозиторий **не действует**, и без своего в initial commit уедут
`node_modules/`, `.next/`, `dist/`, `*.tsbuildinfo`. Генератор кладёт его сам при `--private`, но
если приложение генерировалось без флага — скопируй из любого существующего submodule
(`apps/domwellbes/.gitignore`). Разбор — [git.md](/.claude/rules/git.md) § «Каждому submodule нужен
СВОЙ `.gitignore`».

⚠️ **Windows: `rm -rf apps/<name>` падает с `Device or resource busy`** (шаг 3) — папку держит
Nx-демон или dev-сервер. `nx reset` помогает не всегда. Обход — удалить содержимое, потом саму
папку:

```bash
rm -rf apps/<name>/* apps/<name>/.[!.]* && rmdir apps/<name>
```

⚠️ **НЕ добавляй путь submodule в корневой `.gitignore`** — Nx сломается. Подробности: [repo-structure](/.claude/docs/repo-structure.md).

## Дальнейшие шаги (не автоматизированы генератором)

Сгенерированный каркас — это только Шаг 1 из полного пути приложения до продакшена. Дальше — ручные шаги,
намеренно не входящие в генератор (слишком специфичны/рискованны для автоматизации):

### Персональные данные (если приложение собирает ПД)

Если приложение собирает любые персональные данные пользователей (имя, email, телефон, адрес и т.д.) — **обязательно** изучи и выполни чеклист:

→ **[Персональные данные, Cookie-согласия и РКН](/.claude/docs/personal-data.md)**

Ключевые блокеры до публичного запуска:

- Сервер **в России** (ст. 18 ч. 5 ФЗ-152)
- Страница `/privacy` с политикой ПДн
- Cookie-баннер с opt-in + кнопка «Настройки cookie» в футере
- Чекбоксы согласия **не предотмечены** во всех формах сбора ПД
- Подача уведомления в РКН через pd.rkn.gov.ru (нужен аккаунт Госуслуг с ИП/ЮЛ)

### Регистрация в инфраструктуре Dashboard

При добавлении приложения на production, обязательно зарегистрируй его во всех местах (см. skill `deployment-assistant` → «Чеклист: добавление нового приложения в Dashboard»):

1. `deploy-affected.sh` → массив `S1_APPS` или `S2_APPS`
2. `apps/dashboard/prisma/seed.ts` → `s1Apps` или `s2Apps` (name, displayName, containerName, port, type, domain)
3. `apps/<name>/.env.docker` → создать с `DOMAIN=<domain>`
4. `apps/<name>/.env.docker.enc` → зашифровать и **закоммитить**:
   `sops --encrypt --output apps/<name>/.env.docker.enc apps/<name>/.env.docker`

⛔ В `scripts/sync-env-docker.sh` / `pull-env-docker.sh` приложение добавлять **не нужно** —
скрипты устарели с переходом на SOPS. Секреты доставляет деплой, расшифровывая `.enc`
(см. [secret-manager.md](/.claude/docs/secret-manager.md)).

### Настройка MCP postgres (если есть PostgreSQL)

Чтобы Claude Code мог ходить в БД приложения напрямую, добавь postgres MCP.
Подробная инструкция: **skill `mcp-postgres-setup`**.

Быстро:

1. Узнай порт локального контейнера: `docker ps --format "table {{.Names}}\t{{.Ports}}" | grep <app>`
2. Добавь `MCP_LOCAL_URL` в `apps/<app>/.env.local`
3. Добавь `postgres-<app>` в `.mcp.json` с указанием на pg-wrapper
4. Зарегистрируй в `settings.local.json` (allowlist + enabledMcpjsonServers)

### Настройка бэкапов (если есть БД или uploads)

⚠️ **Без этого шага данные НЕ бэкапятся!** См. skill `deployment-assistant` → «Чеклист: бекапы при деплое».

**Если приложение с PostgreSQL:**

1. `apps/dashboard-agent/src/lib/database.ts` → `APP_CONFIG` — добавить конфиг БД
2. `apps/dashboard-agent/src/lib/server-config.ts` → `SERVER_APPS` — маппинг на сервер
3. `apps/dashboard-agent/docker-compose.*.yml` — маунт `.env.docker` как секрет
4. `.claude/docs/backup-architecture.md` — добавить в таблицу
5. Задеплоить dashboard-agent

**Если приложение с uploads:**

- Обязательно bind mount `./uploads:/app/apps/<name>/uploads` в docker-compose (не anonymous volume!)

### Подключение к staging e2e-гейту (опционально, когда появится e2e-сьют)

`deploy_app(production)` может блокироваться, если коммит не прошёл e2e на стейдже — но только
для приложений из `E2E_GATED_APPS` (`libs/infra-config`). Подключение — не обязательный шаг при
создании приложения, а отдельный, более поздний тираж (см. PLAN.md §18.7 «Тираж M/N» — актуальный
статус там: какие приложения уже gated, какие ждут очереди). Когда появится первая фича, достойная
e2e-покрытия:

```bash
nx g @letar/generators:e2e-suite <name>
```

Дальше, когда придёт время подключать к гейту:

1. **`apps/<name>/docker-compose.staging.yml`** — по образцу `apps/grandslamcup/docker-compose.staging.yml`
   (или свежих примеров из §18.7 M1 — `apps/aboi`, `apps/time`, `apps/mandala` и т.д.). Хостовые порты
   (app/db) — следующие свободные в последовательности, см. актуальный список в PLAN.md §18.7 (там же
   комментарий-конвенция про порядок `ports:` для `deploy-affected.sh`-парсинга `DB_PORT`).
2. **`apps/<name>/.env.staging.example`** — шаблон секретов (не хранит реальные значения, они только
   в `.env.staging` на s3). Если приложение — `hub-client` (OIDC через Ключницу), добавь
   `OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET`/`OIDC_DISCOVERY_URL` и **staging redirect URI**
   (`https://<name>-stage.s3.letar.best/...`) в `apps/auth-hub/prisma/seed.ts` к существующему клиенту
   (не заводи новый — тот же клиент/секрет, что и у прод).
3. `playwright.config.ts` приложения-e2e обычно уже совместим (читает `BASE_URL` из env,
   `webServer.reuseExistingServer: true`) — правок, как правило, не требует.
4. **NPM proxy host + DNS** (`<name>-stage.s3.letar.best`, wildcard `*.s3 CNAME s3.letar.best` уже есть) и
   создание `.env.staging` на s3 с реальными секретами — задача BlackCove, не твоя (см.
   `.claude/rules/deploy-coordination.md`), отправь `deploy-request` через agent-mail.
5. Добавление в `E2E_GATED_APPS` — только после зелёного `deploy_app(staging)` → `run_e2e` → `e2e_status`,
   не раньше.

Подробности пайплайна и текущий список подключённых/ожидающих приложений — `.claude/docs/deployment.md`
и `PLAN.md` §18.7.

### Создать команду приложения (`.claude/commands/<name>.md`)

Создай файл `.claude/commands/<name>.md` по образцу `apps/grandslamcup.md`:

```markdown
# <DisplayName> - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/<name>/PLAN.md` для текущего состояния задач

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

\`\`\`
send_message(
project_key: "C:/web/letar",
sender_name: "<твоё-имя-агента>",
to: ["BlackCove"],
subject: "deploy-request: <name>",
body_md: "app: <name>\nreason: <что сделал>\ncommit: <hash>",
topic: "deploy",
importance: "high",
ack_required: true
)
\`\`\`

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## Проект

**Приложение:** <name>
**Порт:** <port>
**Домен prod:** <domain>
**Домен dev:** <name>.letar.best
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** <краткое описание>
```

> Для приватного submodule добавь строку `**Submodule:** kamiletar/letar-private-<name>`

### Порт нового приложения — записывать никуда не нужно

Таблицы портов в `CLAUDE.md` нет намеренно: источник истины — `.env` самого приложения, а список
занятых портов собирается командой из
[environment.md § Dev-порты приложений](/.claude/docs/environment.md#dev-порты-приложений).

## Деплой нового приложения

Используй скилл **`/infra:deploy`** — там полный чеклист первого деплоя.

Ключевые шаги перед первым деплоем:

- [ ] `next.config.mjs` — добавить `output: 'standalone'`
- [ ] Создать `Dockerfile.production` (образец: `apps/archetest/`)
- [ ] Создать `docker-compose.production.yml`
- [ ] Создать начальную миграцию: `nx db:migrate <name> -- --name init`
- [ ] Добавить в `deploy-affected.sh` → `S1_APPS` или `S2_APPS`
- [ ] Создать `.env.docker` с `DOMAIN`, `DB_PASSWORD`, `POSTGRES_PASSWORD` (пароли — только
      генератором, см. [security.md](/.claude/rules/security.md))
- [ ] Зашифровать и закоммитить `.env.docker.enc` (`sops --encrypt --output ...`)
- [ ] Зарегистрировать в Dashboard (SQL insert в `DeployedApp`)
- [ ] Настроить бэкапы в dashboard-agent
