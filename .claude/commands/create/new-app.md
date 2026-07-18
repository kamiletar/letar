# Создание нового Next.js приложения

Создай новое Next.js приложение со всеми необходимыми настройками.

⚠️ **Electron-приложение (десктопное, не веб)?** Вся эта инструкция — про Next.js веб-приложения.
Для Electron есть отдельный генератор: `nx g @letar/generators:electron-app <name>` (см.
`libs/generators/README.md` и `.claude/rules/electron.md`). Раздел «Приватные приложения» ниже
(submodule) всё равно применим — сначала сгенерируй приложение, потом заведи submodule.

## Параметры

- **Имя приложения:** $ARGUMENTS (например: `my-app`)
- **Порт:** Найди следующий доступный 3xxx порт

## Эталонные приложения

- **`apps/grandslamcup`** — публичный, минимальный «чистый» шаблон Next.js + Chakra v3 + Prisma/ZenStack + Docker. Бери его за основу для всех новых приложений.
- **`apps/driving-school`** — приватный submodule, расширенный эталон (Better Auth + Organizations, мультитенантность, ZenStack access policies, формы, темизация). Смотри сюда, когда нужен пример более сложной фичи.

⛔ **`apps/pravda` больше НЕ эталон** — там специфическая логика (документы/законы, MDX-компоненты Article/Penalty/Quote). Не копируй из неё, если только не делаешь похожий контент-сайт.

## Приватные приложения

Если новое приложение **должно быть приватным** (закрытый код, коммерческий продукт, NDA), создавай его как **git submodule** по паттерну `kamiletar/letar-private-<name>`:

```bash
# 1. Создать пустой приватный репо на GitHub
gh repo create kamiletar/letar-private-<name> --private --description "<name> app"

# 2. Инициализировать submodule в letar
mkdir -p apps/<name>
cd apps/<name>
git init -b main
git remote add origin git@github.com:kamiletar/letar-private-<name>.git
# ... генерация Nx через root (см. ниже)
git add . && git commit -m "chore: initial scaffold"
git push -u origin main

# 3. Связать как submodule в letar
cd C:/web/letar
git submodule add git@github.com:kamiletar/letar-private-<name>.git apps/<name>
git add .gitmodules apps/<name>
git commit -m "chore: add <name> as private submodule"
```

⚠️ **НЕ добавляй путь submodule в корневой `.gitignore`** — Nx сломается. Подробности: [repo-structure](/.claude/docs/repo-structure.md).

## Шаги создания

### 1. Генерация приложения

```bash
# Генерация через Nx
nx g @nx/next:application apps/<name> --directory=apps/<name> --e2eTestRunner=playwright --unitTestRunner=none --style=none --linter=eslint
```

### 2. Очистка сгенерированных файлов

После генерации удали ненужные файлы — за стили отвечает Chakra UI:

```bash
rm apps/<name>/src/app/global.css       # Chakra управляет стилями
rm apps/<name>/next.config.js           # Заменим на next.config.mjs
rm apps/<name>/.swcrc                   # Не нужен
rm apps/<name>/index.d.ts               # Не нужен
rm -rf apps/<name>/src/app/api/hello    # Дефолтный API route
```

В `layout.tsx` **НЕ** импортируй `global.css` — Chakra полностью управляет стилями.

### 3. Структура файлов

Создай следующую структуру:

```
apps/<name>/
├── .env                      # PORT=<next-port>
├── README.md                 # Документация
├── PLAN.md                   # Техническое задание
├── PLAN_COMPLETED.md         # Выполненные задачи
├── PLAN_TESTING.md           # План тестирования
├── CHANGELOG.md              # История изменений
├── package.json              # Только version + nx config
├── project.json              # Nx targets
├── vitest.config.ts          # Vitest конфигурация
├── vitest.setup.tsx          # Полифилы для тестов
├── next.config.mjs           # MDX + Nx
├── tsconfig.json             # TypeScript
├── src/
│   ├── app/
│   │   ├── _components/
│   │   │   └── providers.tsx # Chakra + ColorMode + theme
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── theme/
│   │   ├── index.ts          # createSystem + defineConfig
│   │   ├── tokens/
│   │   │   ├── index.ts
│   │   │   └── colors.ts     # defineTokens.colors
│   │   └── semanticTokens/
│   │       ├── index.ts
│   │       └── colors.ts     # defineSemanticTokens
│   └── mdx-components.tsx    # MDX + Chakra
```

### 4. package.json

```json
{
  "name": "@letar/<name>",
  "version": "0.1.0",
  "private": true,
  "nx": {
    "name": "<name>",
    "implicitDependencies": ["chakra-provider", "ui", "analytics"]
  }
}
```

### 5. project.json targets

Добавь стандартные targets:

- `typecheck` — tsc --noEmit
- `typecheck:tsgo` — tsgo --noEmit (быстрый)
- `oxlint` — bunx oxlint src
- `lint` — dependsOn: ["oxlint"] (ESLint после oxlint)
- `lint:fix` — eslint . --fix
- `format` — bunx dprint fmt
- `format:check` — bunx dprint check
- `test` — @nx/vitest:test

### 6. vitest.config.ts

```typescript
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/<name>',
  test: {
    name: '<name>',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/<name>',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

### 7. vitest.setup.tsx

Скопируй из `apps/grandslamcup/vitest.setup.tsx` (или `apps/driving-school/vitest.setup.ts`):

- TextEncoder/TextDecoder полифилы
- structuredClone полифил
- ResizeObserver/IntersectionObserver моки
- Next.js navigation/link/image моки

### 8. Тема (src/theme/)

Создай структуру темы по образцу `apps/grandslamcup/src/theme/` (минимальный публичный шаблон) или `apps/driving-school/src/theme/` (расширенный с recipes/slot recipes):

- `tokens/colors.ts` — brand, accent, gray, success, warning, error, info
- `semanticTokens/colors.ts` — bg, fg, border + все палитры с \_light/\_dark
- `index.ts` — createSystem(defaultConfig, appConfig)

### 9. Umami аналитика

В `layout.tsx` подключи `<UmamiScript />` из `@letar/analytics` перед `</body>`:

```tsx
import { UmamiScript } from '@letar/analytics'

// ... в return:
        <UmamiScript />
      </body>
```

В `tsconfig.json` добавь path alias:

```json
"@letar/analytics": ["../../libs/analytics/src/index.ts"]
```

В `package.json` добавь в `implicitDependencies`:

```json
"implicitDependencies": ["chakra-provider", "ui", "analytics"]
```

В `.env.docker` добавь (website ID создаётся позже в Umami):

```env
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

### 10. Providers (src/app/\_components/providers.tsx)

```tsx
'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

export function Providers({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
```

### 11. MDX (next.config.mjs)

```javascript
import createMDX from '@next/mdx'
import { composePlugins, withNx } from '@nx/next'

const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  nx: {},
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

const plugins = [withNx, withMDX]

export default composePlugins(...plugins)(nextConfig)
```

### 12. mdx-components.tsx

Скопируй из `apps/grandslamcup/src/mdx-components.tsx` (если есть) или `apps/driving-school/src/mdx-components.tsx`:

- Heading, Text, Link, Code компоненты
- Pre с chakra styling

### 13. README.md шаблон

```markdown
# <Name>

Описание приложения.

## Версия и стек

| Параметр    | Значение           |
| ----------- | ------------------ |
| **Версия**  | 0.1.0              |
| **Порт**    | <port>             |
| **Next.js** | 16.1               |
| **React**   | 19                 |
| **UI**      | Chakra UI v3       |
| **Формы**   | @letar/forms + Zod |

## Быстрый старт

\`\`\`bash
nx dev <name> # Разработка
nx format <name> # Форматирование
nx lint <name> # oxlint → ESLint
nx typecheck:tsgo <name> # Проверка типов
nx test <name> # Тесты
\`\`\`
```

### 14. Создать команду приложения (.claude/commands/<name>.md)

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

### 15. Обновить CLAUDE.md

Добавь новое приложение в таблицу портов.

### 15. Персональные данные (если приложение собирает ПД)

Если приложение собирает любые персональные данные пользователей (имя, email, телефон, адрес и т.д.) — **обязательно** изучи и выполни чеклист:

→ **[Персональные данные, Cookie-согласия и РКН](/.claude/docs/personal-data.md)**

Ключевые блокеры до публичного запуска:

- Сервер **в России** (ст. 18 ч. 5 ФЗ-152)
- Страница `/privacy` с политикой ПДн
- Cookie-баннер с opt-in + кнопка «Настройки cookie» в футере
- Чекбоксы согласия **не предотмечены** во всех формах сбора ПД
- Подача уведомления в РКН через pd.rkn.gov.ru (нужен аккаунт Госуслуг с ИП/ЮЛ)

### 15. Регистрация в инфраструктуре Dashboard

При добавлении приложения на production, обязательно зарегистрируй его во всех местах (см. skill `deployment-assistant` → «Чеклист: добавление нового приложения в Dashboard»):

1. `deploy-affected.sh` → массив `S1_APPS` или `S2_APPS`
2. `apps/dashboard/prisma/seed.ts` → `s1Apps` или `s2Apps` (name, displayName, containerName, port, type, domain)
3. `apps/<name>/.env.docker` → создать с `DOMAIN=<domain>`
4. `scripts/sync-env-docker.sh` → массив `APPS`
5. `scripts/pull-env-docker.sh` → `S1_APPS`/`S2_APPS` и `ALL_APPS`

### 16. Настройка MCP postgres (если есть PostgreSQL)

Чтобы Claude Code мог ходить в БД приложения напрямую, добавь postgres MCP.
Подробная инструкция: **skill `mcp-postgres-setup`**.

Быстро:

1. Узнай порт локального контейнера: `docker ps --format "table {{.Names}}\t{{.Ports}}" | grep <app>`
2. Добавь `MCP_LOCAL_URL` в `apps/<app>/.env.local`
3. Добавь `postgres-<app>` в `.mcp.json` с указанием на pg-wrapper
4. Зарегистрируй в `settings.local.json` (allowlist + enabledMcpjsonServers)

### 17. Настройка бэкапов (если есть БД или uploads)

⚠️ **Без этого шага данные НЕ бэкапятся!** См. skill `deployment-assistant` → «Чеклист: бекапы при деплое».

**Если приложение с PostgreSQL:**

1. `apps/dashboard-agent/src/lib/database.ts` → `APP_CONFIG` — добавить конфиг БД
2. `apps/dashboard-agent/src/lib/server-config.ts` → `SERVER_APPS` — маппинг на сервер
3. `apps/dashboard-agent/docker-compose.*.yml` — маунт `.env.docker` как секрет
4. `.claude/docs/backup-architecture.md` — добавить в таблицу
5. Задеплоить dashboard-agent

**Если приложение с uploads:**

- Обязательно bind mount `./uploads:/app/apps/<name>/uploads` в docker-compose (не anonymous volume!)

### 18. Подключение к staging e2e-гейту (опционально, когда появится e2e-сьют)

`deploy_app(production)` может блокироваться, если коммит не прошёл e2e на стейдже — но только
для приложений из `E2E_GATED_APPS` (`libs/infra-config`). Подключение — не обязательный шаг при
создании приложения, а отдельный, более поздний тираж (см. PLAN.md §18.7 «Тираж M/N» — актуальный
статус там: какие приложения уже gated, какие ждут очереди). Когда у приложения появится
Playwright-сьют (`apps/<name>-e2e`) и придёт время подключать его к гейту:

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

## После создания

1. Запусти `nx dev <name>` — проверь что работает
2. Запусти `nx typecheck:tsgo <name>` — проверь типы
3. Запусти `nx test <name>` — проверь тесты
4. Закоммить изменения

## Деплой нового приложения

Используй скилл **`/infra:deploy`** — там полный чеклист первого деплоя.

Ключевые шаги перед первым деплоем:

- [ ] `next.config.mjs` — добавить `output: 'standalone'`
- [ ] Создать `Dockerfile.production` (образец: `apps/archetest/`)
- [ ] Создать `docker-compose.production.yml`
- [ ] Создать начальную миграцию: `nx db:migrate <name> -- --name init`
- [ ] Добавить в `deploy-affected.sh` → `S1_APPS` или `S2_APPS`
- [ ] Создать `.env.docker` с `DOMAIN`, `DB_PASSWORD`, `POSTGRES_PASSWORD`
- [ ] Добавить в `scripts/sync-env-docker.sh` и `pull-env-docker.sh`
- [ ] Зарегистрировать в Dashboard (SQL insert в `DeployedApp`)
- [ ] Настроить бэкапы в dashboard-agent
