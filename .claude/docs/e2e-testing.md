# E2E тестирование (Playwright)

## Обзор

Проекты используют Playwright для E2E тестирования с поддержкой трёх браузеров:

- **Chromium** - основной браузер
- **Firefox** - альтернативный браузер
- **WebKit** - Safari-подобный браузер (самый проблемный)

## Критичные особенности WebKit

### 1. Click перед Fill обязателен

WebKit требует явного клика перед заполнением полей ввода. Без этого `fill()` может не сработать.

```typescript
// ❌ НЕ РАБОТАЕТ в WebKit
await page.locator('input[type="email"]').fill(email)

// ✅ РАБОТАЕТ во всех браузерах
const emailInput = page.locator('input[type="email"]')
await emailInput.click()
await emailInput.fill(email)
```

### 2. Используй pressSequentially для надёжного ввода

В сложных формах `fill()` может быть ненадёжен. Используй `pressSequentially`:

```typescript
// Для критичных полей
await input.clear()
await input.pressSequentially(text, { delay: 50 })
```

## Chakra UI и Portal

### Проблема: Overlay компоненты рендерятся вне основного DOM

Chakra UI использует Portal для:

- Select (выпадающий список)
- Dialog/Drawer
- Menu
- Popover
- Tooltip

### Решение: Используй глобальные селекторы

```typescript
// ❌ НЕ РАБОТАЕТ - ищет внутри формы
const option = this.form.locator('[data-value="FEMALE"]')

// ✅ РАБОТАЕТ - ищет глобально через роли
const listbox = this.page.getByRole('listbox')
await listbox.waitFor({ state: 'visible', timeout: 10000 })

const option = this.page.getByRole('option', { name: 'Женский' })
await option.click()

// Ждём закрытия
await listbox.waitFor({ state: 'hidden', timeout: 5000 })
```

### Проблема: клик по Chakra/Ark UI Checkbox (`@letar/forms` `Field.Checkbox`) не долетает до состояния формы

`Checkbox.Root` (Ark UI/Zag.js) — полностью кастомный интерактивный виджет: реальный toggle происходит через pointer/keyboard-обработчики Zag.js на `label[data-part="root"]`/`Checkbox.Control`, а не через нативные `click`/`change` на скрытом `<input>`. `getByRole('checkbox')` резолвится именно в этот скрытый `<input>` (нужен для HTML-форм/доступности).

`.check()` виснет таймаутом — видимый `Checkbox.Control` (aria-hidden) физически перехватывает pointer event по координатам скрытого input ("intercepts pointer events"). `.click({ force: true })` эту проверку обходит и клик "проходит", `input.checked` даже становится `true` в DOM — но `onCheckedChange` (и, соответственно, `field.handleChange` в TanStack Form) **не вызывается**, потому что Zag.js не слушает нативные события инпута. Итог — форма визуально выглядит валидной (чекбокс отмечен), но submit её как невалидную/неотмеченную не проходит, без единой ошибки в консоли.

```typescript
// ❌ ЗАВИСАЕТ — control перехватывает pointer event
await page.getByRole('checkbox', { name: /Согласен/ }).check()

// ❌ ОБМАНЧИВО "РАБОТАЕТ" — input.checked=true в DOM, но onCheckedChange не вызван,
// TanStack Form считает поле пустым/невалидным, submit тихо блокируется
await page.getByRole('checkbox', { name: /Согласен/ }).click({ force: true })

// ✅ РЕАЛЬНО РАБОТАЕТ — клик по видимому label/тексту, как это делает настоящий пользователь
await page.getByText('Согласен на обработку ПДн', { exact: false }).click()
```

Для Chakra `RadioCard` (не через `@letar/forms`, а прямой `Checkbox.Root`/`Radio.Root` с собственным `onCheckedChange`) `force: true` может быть уместен, если сам компонент слушает нативные события — проверяй по факту (наличие следующего сетевого запроса/смены состояния приложения), а не только по DOM-атрибуту `checked`/`[checked]` в snapshot.

Прецедент: `apps/dsperevod-e2e/src/callback-drawer.spec.ts` (Field.Checkbox согласия ПДн) — `force: true` давал ложно-зелёный DOM-снапшот, но submit молча не отправлялся.

## Формы и селекторы полей

### @letar/forms (рекомендуемый подход)

TanStack Form использует контролируемые компоненты со стандартными именами полей. Селекторы по атрибуту `name` работают корректно:

```typescript
// ✅ РАБОТАЕТ - стандартные имена полей
this.emailInput = page.locator('input[name="email"]')
this.nameInput = page.locator('input[name="user.name"]') // вложенные поля

// ✅ РАБОТАЕТ - по placeholder (более надёжно)
this.nameInput = page.getByPlaceholder('Введите название')

// ✅ РАБОТАЕТ - по data-testid (самый надёжный)
this.nameInput = page.locator('[data-testid="product-name-input"]')
```

## Next.js Server Actions и redirect

### Проблема: NEXT_REDIRECT unhandledRejection

Async функция `redirect()` выбрасывает специальную ошибку для прерывания выполнения.

### Решение: Всегда используй return перед redirect

```typescript
// ❌ ВЫЗЫВАЕТ unhandledRejection
export async function createProduct(prevState: unknown, formData: FormData) {
  // ...
  redirect('/admin/products')
}

// ✅ ПРАВИЛЬНО
export async function createProduct(prevState: unknown, formData: FormData) {
  // ...
  return redirect('/admin/products')
}
```

## URL паттерны с i18n

### Проблема: Trailing slash несоответствие

Next.js может добавлять trailing slash (`/products` vs `/products/`).

### Решение: Учитывай опциональный слеш

```typescript
// ❌ МОЖЕТ НЕ СОВПАСТЬ
await expect(page).toHaveURL(/\/admin\/products$/)

// ✅ РАБОТАЕТ с обоими вариантами
await expect(page).toHaveURL(/\/admin\/products\/?$/)
```

### Локализация в путях

Все пути должны учитывать префикс локали:

```typescript
const LOCALE_PREFIX = '/ru'

export function localePath(path: string): string {
  return `${LOCALE_PREFIX}${path}`
}

// Использование
await page.goto(localePath('/admin/products'))
```

## Пути к тестовым файлам

### Проблема: Неправильные пути к ресурсам

E2E проект находится отдельно от основного приложения.

### Решение: Используй path.resolve с правильным путём

```typescript
// ❌ НЕПРАВИЛЬНЫЙ путь (внутри e2e проекта)
const TEST_IMAGES_DIR = path.resolve(__dirname, '../fixtures/images')

// ✅ ПРАВИЛЬНЫЙ путь (к основному приложению)
const TEST_IMAGES_DIR = path.resolve(
  __dirname,
  '../../../../premium-rosstil/src/app/[locale]/catalog/_components/_images'
)
```

## Стратегия ожидания

### Используй правильные waitFor

```typescript
// Ждём появления элемента
await element.waitFor({ state: 'visible', timeout: 10000 })

// Ждём исчезновения элемента
await element.waitFor({ state: 'hidden', timeout: 5000 })

// Ждём загрузки страницы
await page.waitForLoadState('domcontentloaded')

// Ждём перехода (исключая определённые пути)
await page.waitForURL((url) => !url.pathname.startsWith(`${LOCALE_PREFIX}/auth/`), {
  timeout: 30000,
  waitUntil: 'domcontentloaded',
})
```

### ⚠️ `networkidle` не работает в dev-режиме Next.js

`page.waitForLoadState('networkidle')` **виснет на весь таймаут** (30с по умолчанию) на `next dev` —
HMR держит открытым WebSocket, поэтому «нет сетевой активности 500мс» никогда не наступает. Это не
флейк, а гарантированное зависание на каждом прогоне. Не используй `networkidle` ни для чего в
dev-режиме — только `domcontentloaded` или явное ожидание конкретного элемента/состояния.

### Гонка гидратации (SSR → hydrate race) при клике сразу после `page.goto()`

Клик по интерактивному элементу сразу после `page.goto('/')` может попасть в окно между тем, как
React-компонент отрендерился на сервере (DOM уже есть, элемент видим и проходит `toBeVisible()`), и
тем, как клиентский JS навесил обработчики (`onClick` ещё не подключён — клик проваливается в
никуда). Особенно заметно на первом посещении маршрута в dev-режиме (Turbopack ещё компилирует).
Симптом: `expect(dialog).toBeVisible()` падает по таймауту, хотя дальше по коду тот же элемент
прекрасно кликается вручную.

Фиксированная задержка (`page.waitForTimeout(500)`) — не решение: либо мало на медленной машине,
либо тратит время зря на быстрой. Рабочий паттерн — повторный клик внутри `expect(...).toPass()`,
идемпотентный (клик только если ожидаемое состояние ещё не достигнуто — иначе повторный клик по
toggle-элементу его же и закроет):

```typescript
const trigger = page.getByRole('button', { name: 'Открыть меню' })
const dialog = page.getByRole('dialog')

await expect(async () => {
  if (!(await dialog.isVisible())) {
    await trigger.click()
  }
  await expect(dialog).toBeVisible({ timeout: 1000 })
}).toPass({ timeout: 15000 })
```

### ⛔ `nx e2e <app>-e2e` зависает намертво в dev-режиме Next.js / игнорирует staging BASE_URL

Если у `apps/<app>-e2e` **нет собственного `project.json`**, таргет `e2e` собирается через
inferred `createNodes` плагина `@nx/playwright` (`nx.json` → `plugins: [{plugin:
"@nx/playwright/plugin"}]`). Этот инференс разбирает `playwright.config.ts`'s `webServer.command`
регексом (`node_modules/@nx/playwright/.../plugins/plugin.js`, `parseTaskFromCommand`) и матчит
**обе** формы вызова — `nx run <app>:dev` **и** короткую `nx <app> dev`/`nx dev <app>` — после
чего добавляет `dependsOn: [{project: '<app>', target: 'dev'}]`. Смена синтаксиса команды НЕ
помогает, только явный `project.json`.

Практические следствия:

1. **Локально:** `next dev` — процесс, который никогда не завершается сам по себе, поэтому вызов
   `nx e2e <app>-e2e` может застрять на этой «зависимости» на неопределённое время (в бою ловили
   зависания по 30-60 минут) — сама команда `playwright test` внутри при этом может вообще не
   успевать запуститься.
2. **На staging (`deploy_app(staging)` → `run_e2e`):** несмотря на переданный `BASE_URL` внешнего
   контейнера, Nx всё равно поднимает `dev`-зависимость ДО того, как Playwright's
   `reuseExistingServer`/`url`-проверка вообще успевает отработать — прогон тестирует **локальный
   dev-сервер раннера**, а не задеплоенный staging-контейнер, зелёный результат ничего не
   доказывает про реальный деплой (найдено 2026-07-19 на `time-e2e`, PLAN.md §18.7, msg #573).
   Раньше здесь было написано, что staging-пайплайн иммунен к этой проблеме («там нет `dependsOn:
dev`-таска вообще») — это верно **только** для приложений с explicit `project.json` (см. ниже),
   не для всех.

**Обходной путь для локального прогона:** не через `nx e2e`, а напрямую — поднять dev-сервер
вручную в фоне и вызвать Playwright из директории сьюта:

```bash
# 1. Поднять dev-сервер приложения в фоне (не nx e2e!)
nx run <app>:dev &

# 2. Дождаться "Ready in" в логе, затем прогнать playwright напрямую
cd apps/<app>-e2e
BASE_URL=http://localhost:<port> bunx playwright test --project=chromium

# 3. Остановить dev-сервер после прогона
kill %1
```

**Настоящий фикс для staging-гейта:** явный `apps/<app>-e2e/project.json` с executor
`@nx/playwright:playwright` (обходит inferred createNodes целиком, никакого регекс-парсинга
`webServer.command`) — паттерн уже используют `aboi-e2e`/`grandslamcup-e2e` (единственный реально
гейтованный staging-app на момент написания):

```json
{
  "name": "<app>-e2e",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/<app>-e2e/src",
  "tags": ["type:e2e", "scope:<app>", "owner:letar"],
  "implicitDependencies": ["<app>"],
  "targets": {
    "e2e": {
      "executor": "@nx/playwright:playwright",
      "outputs": ["{workspaceRoot}/playwright-report/{projectName}"],
      "options": { "config": "apps/<app>-e2e/playwright.config.ts" }
    }
  }
}
```

**Диагностика:** `nx show project <app>-e2e --json | jq '.targets.e2e'` — если `executor` не
`@nx/playwright:playwright` (например `nx:run-commands` + `options.command: "playwright test"`) и
`dependsOn` содержит `{target: "dev"}` — приложение уязвимо к этой проблеме на staging. Кэш Nx
может маскировать смену конфигурации — при подозрении сначала `nx daemon --stop && rm -rf
.nx/workspace-data .nx/cache`, иначе `nx show project` может отдавать стейл-результат даже после
`nx reset`.

⚠️ Генератор `@letar/generators:e2e-suite` (§18.7 Тираж N) скаффолдит `apps/<app>-e2e` — если его
шаблон не создаёт `project.json`, все его выходы (`animatrona-landing-e2e`, `animatrona-tracker-e2e`,
`kami-key-the-landing-e2e`, `letar-landing-e2e`, `studio-e2e`, `form-docs-e2e`) унаследуют эту же
уязвимость при подключении к staging-гейту (Тираж M) — проверить перед тем как гейтовать любой из
них.

## Отладка тестов

е### Запуск тестов

**ВАЖНО:** Аргументы Playwright передаются после `--`:

```bash
# Запуск конкретного проекта (setup, admin-chromium, guest-chromium и т.д.)
nx e2e premium-rosstil-e2e -- --project=setup

# Один тест по имени в конкретном браузере
nx e2e premium-rosstil-e2e -- --grep="название теста" --project=webkit

# С UI режимом
nx e2e premium-rosstil-e2e -- --ui

# С headed режимом (видимый браузер)
nx e2e premium-rosstil-e2e -- --headed

# Комбинация параметров
nx e2e premium-rosstil-e2e -- --project=admin-chromium --headed --grep="создание"
```

**БЕЗ `--` аргументы не передаются в Playwright!**

### Скриншоты при ошибках

Playwright автоматически сохраняет скриншоты в `test-results/` при падении тестов. Читай их для понимания состояния UI.

## Flaky тесты

### Причины нестабильности

1. **Анимации** - используй `{ animations: 'disabled' }` в config
2. **Сетевые запросы** - используй `waitForResponse`
3. **Асинхронные обновления** - добавляй явные ожидания
4. **WebKit специфика** - добавляй click перед fill

### Ретраи

```typescript
// В playwright.config.ts
{
  retries: process.env.CI ? 2 : 0,
}
```

## Next.js 16: proxy.ts вместо middleware.ts

### Важно для driving-school

В Next.js 16 файл `middleware.ts` переименован в `proxy.ts`, а экспорт `middleware` заменён на `proxy`:

```typescript
// src/proxy.ts (бывший middleware.ts)
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const protectedPaths = ['/profile', '/admin', '/orders']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Проверяем защищённые пути
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  if (isProtected) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/).*)'],
}
```

### Влияние на E2E тесты

Защита маршрутов работает через `proxy.ts`, а не middleware. При написании тестов на защищённые страницы:

```typescript
// ❌ НЕ ОЖИДАЙ middleware-редирект на клиенте
await expect(page).toHaveURL(/sign-in\//)

// ✅ Проверяй на уровне страницы или серверного компонента
// Страница сама проверяет сессию и показывает нужный контент
await expect(page.getByRole('heading', { name: 'Мой профиль' })).toBeVisible()
```

## Тесты на неавторизованный редирект

### Проблема: Тест проходит с авторизованным состоянием

В Playwright-проектах с общим `storageState` браузер наследует cookies, и тест на редирект неавторизованного пользователя будет работать с авторизованной сессией.

### Решение: Явно указывай storageState: undefined

```typescript
// ❌ НЕ РАБОТАЕТ - наследует cookies из проекта
test('неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/protected-page')
  await expect(page).toHaveURL(/sign-in/) // FAIL - сессия активна
})

// ✅ РАБОТАЕТ - явно без cookies
test('неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: undefined, // Явно без сохранённых cookies
  })
  const page = await context.newPage()
  await page.goto('/protected-page', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })
  await context.close()
})
```

## Селекторы Chakra UI компонентов

### Проблема: Несколько элементов с одинаковым текстом

При использовании `getByText()` для UI с множественными совпадениями (например, текст статуса в бейдже И в фильтре) тест падает из-за "strict mode violation".

### Решение: Используй более точные селекторы

```typescript
// ❌ НЕ РАБОТАЕТ - находит 2 элемента
await expect(page.getByText(/ожида|pending/i)).toBeVisible()

// ✅ РАБОТАЕТ - ищет конкретный элемент
await expect(page.getByRole('combobox')).toBeVisible() // Для select
await expect(page.getByText('Ожидают:').first()).toBeVisible() // Для бейджа
```

## E2E-логин без OIDC на staging: `NODE_ENV` не годится как индикатор окружения

### Проблема

`next build`/`next start` (production-билд, которым собирается и staging-, и прод-образ) **всегда**
выставляет `NODE_ENV=production` независимо от реального окружения. Роут вида
`/api/auth/dev-session`, охраняемый условием `if (process.env.NODE_ENV === 'production') return 403`,
работает в `nx dev` (dev-сервер), но **структурно не может сработать на любом собранном образе** —
включая staging, где он нужнее всего для e2e-логина без OIDC-провайдера.

### Решение — `createDevSessionRoute` из `@letar/auth/server`

Не пишите dev-session роут заново на каждое приложение — используйте общую фабрику с двойной
защитой (явный флаг `ALLOW_DEV_SESSION=true` + секретный `DEV_SESSION_TOKEN`, сравниваемый
constant-time):

```typescript
// apps/my-app/src/app/api/auth/dev-session/route.ts
import { prisma } from '@/lib/db'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma,
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  defaultEmail: 'admin@my-app.ru',
  defaultRedirect: '/admin',
})
```

Обе переменные (`ALLOW_DEV_SESSION`, `DEV_SESSION_TOKEN`) живут **только** в `.env.staging`,
никогда в `.env.docker` — см. [env-files.md](/.claude/rules/env-files.md).

### Ловушка в `global-setup.ts`: `waitForURL` даёт ложный успех

Не проверяйте успех логина через `page.waitForURL('**/admin**')`, если сам dev-session роут
принимает `redirect=/admin` в query-строке — этот паттерн совпадёт **и** с успешным редиректом,
**и** с URL самого неудачного (403) запроса, если он попал в query до ответа. Прецедент:
grandslamcup несколько прогонов подряд рапортовал «Admin авторизован» при фактическом 403 —
маскировало настоящую причину провала 7 admin-тестов.

```typescript
// ❌ Ложный успех — URL-паттерн совпадает независимо от реального результата
await page.goto(`${baseURL}/api/auth/dev-session?email=...&redirect=/admin`)
await page.waitForURL('**/admin**', { timeout: 30_000 })

// ✅ Проверяем факт — cookie сессии реально установлена
await page.goto(`${baseURL}/api/auth/dev-session?email=...&redirect=/admin&token=${devSessionToken}`)
const cookies = await context.cookies()
if (!cookies.find((c) => c.name === 'better-auth.session_token')) {
  throw new Error('dev-session не установил cookie — вероятно 403')
}
```

### Ручная проверка через Browser pane: смена email в открытой сессии требует явный sign-out

При ручной проверке dev-session роута агентом через Claude Browser pane (preview-инструменты,
не Playwright e2e) — повторный переход на `/api/auth/dev-session?email=...` с **другим** email
в рамках уже открытой сессии **не перезаписывает** cookie: браузер продолжает слать старую
сессию (например, от предыдущей проверенной роли), хотя запрос возвращает успешный редирект
(307) и в БД действительно создаётся новая запись `Session` для нового пользователя. Прямая
проверка `GET /api/auth/get-session` в этот момент покажет старого пользователя, а не нового —
из-за чего агент тихо продолжает тестировать под неверной ролью и получает
необъяснимые расхождения в правах доступа.

**Решение** — явный `sign-out` перед каждой сменой роли в рамках одной проверки:

```typescript
// Перед повторным вызовом /api/auth/dev-session с другим email
await fetch(`${baseURL}/api/auth/sign-out`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})
// Только теперь переходить на /api/auth/dev-session?email=<другая-роль>
```

## Чеклист перед написанием E2E тестов

- [ ] **Скаффолд нового сьюта — через генератор**, не копипастой:
      `nx g @letar/generators:e2e-suite <app>` (порт берётся из `apps/<app>/.env`, либо передай
      `--port=<число>` явно). Создаёт `apps/<app>-e2e` со всей конвенцией (package.json, tsconfig,
      eslint, playwright.config.ts, `.gitignore` для `playwright/.auth/`, стартовый smoke-тест).
      См. `libs/generators/README.md`.
- [ ] Click перед fill для всех input полей
- [ ] Глобальные селекторы для Portal компонентов
- [ ] Placeholder/test-id для полей форм
- [ ] return перед redirect в Server Actions
- [ ] Regex с `\/?` для URL с trailing slash
- [ ] Правильные пути к тестовым ресурсам
- [ ] Достаточные таймауты для ожиданий
- [ ] Учитывай proxy.ts (не middleware.ts) в Next.js 16
- [ ] `storageState: undefined` для тестов неавторизованного доступа
- [ ] Точные селекторы при множественных совпадениях текста

---

## Electron тестирование (Animatrona)

### Обзор

Electron приложение Animatrona тестируется через Playwright с использованием `electron-playwright-helpers`. Требует **production build**.

### Подготовка окружения

```bash
# 1. Собрать production build (обязательно!)
nx build:win animatrona

# 2. Создать тестовые видео
nx fixtures:create animatrona-e2e

# 3. Запустить тесты
nx e2e animatrona-e2e -- --project=electron
```

### Критичные особенности

#### 0. `shikimori.mock.ts` (`page.route()`) НЕ мокает запросы из main-процесса

`apps/animatrona-e2e/helpers/shikimori.mock.ts` перехватывает GraphQL-запросы к Shikimori через
`page.route()` — это работает **только** для сетевого стека рендерера (Chromium page context).
Часть Shikimori-вызовов (например, весь пайплайн импорта из Рутрекера —
`main/services/rutracker/rutracker-import.ts` → `main/services/shikimori/client.ts`) идёт из
**main-процесса** через `fetch`/`net.fetch`, а не из страницы — `page.route()` их не видит,
запрос реально уходит в интернет.

Для сценариев, где Shikimori-вызов гарантированно происходит из main-процесса:

- **Мокать успешный ответ пока нельзя** без dedicated test-mode hook в main (переменная
  окружения, которая подменяет клиент на фикстуру) — такого хука сейчас нет.
- **Единственный доступный без правки прод-кода seam** — `session.webRequest.onBeforeRequest`
  через `ctx.app.evaluate()`, но он умеет только `cancel`/`redirect`, не подмену тела ответа.
  Годится только для детерминированного тестирования ветки ошибки (см.
  `apps/animatrona-e2e/src/03-import/rutracker-import.electron.spec.ts`,
  `blockShikimoriNetwork()`).
- **Happy-path без реальной сети** для main-процессных вызовов Shikimori пока не покрыт нигде в
  сьюте — тестируется либо через реальный сетевой запрос (см. следующий пункт), либо требует
  добавления test-mode hook.

Перед тем как писать тест на Shikimori-сценарий — проверь, из какого процесса (main или
renderer) реально идёт вызов, прежде чем полагаться на `shikimori.mock.ts`.

#### 0.1 Тесты с реальной сетью — TUN-VPN может ронять Electron-специфичный сетевой стек

Если пишешь тест, который намеренно бьёт в реальный внешний API (например, для диагностики
сетевого бага) — учти [electron-net-fetch-tun-vpn.md](electron-net-fetch-tun-vpn.md): под
TUN-режимом VPN (Clash и т.п.) `net.fetch` (Chromium) и обычный `fetch`/сокет Node.js могут
проходить по-разному для одного домена. Если main-процессный код использует `net.fetch` — тест
может падать локально у одних разработчиков и проходить у других не из-за флейка, а из-за
разных сетевых условий.

#### 1. `app://` протокол НЕ работает для навигации

```typescript
// ❌ НЕ РАБОТАЕТ — Windows показывает системный диалог
await page.goto('app://./player')

// ✅ РАБОТАЕТ — используй UI навигацию
const nav = page.getByRole('navigation')
await nav.getByRole('link', { name: /плеер/i }).click()
```

#### 2. Изоляция user-data-dir

```typescript
// Каждый тест использует уникальную директорию
const userDataDir = path.join(os.tmpdir(), `animatrona-test-${Date.now()}`)

const app = await electron.launch({
  args: ['--user-data-dir=' + userDataDir, mainPath],
})
```

#### 3. Splash screen → Main window

```typescript
// Хелпер ждёт закрытия splash и появления main window
await waitForMainWindow(ctx, 60000) // 60 сек таймаут
```

#### 4. Stubbing native dialogs

```typescript
import { stubSelectFolderDialog } from '../../helpers/electron.helpers'

// До клика на кнопку, которая открывает диалог
await stubSelectFolderDialog(ctx.app, getFixturesPath('anime-folder'))

// Теперь клик откроет "диалог" и сразу вернёт stubbed путь
await page.getByRole('button', { name: 'Выбрать папку' }).click()
```

### Два режима тестирования

| Режим                              | Суффикс          | Когда использовать              |
| ---------------------------------- | ---------------- | ------------------------------- |
| **Dev** (`.dev.spec.ts`)           | HTTP сервер      | Разработка UI, быстрые итерации |
| **Electron** (`.electron.spec.ts`) | Production build | Перед релизом, CI/CD            |

### Структура тестов

```
apps/animatrona-e2e/src/
├── 01-smoke/        # Запуск app, базовая навигация
├── 02-library/      # Библиотека (dev режим)
├── 03-import/       # Import wizard (electron)
├── 04-player/       # Плеер (electron)
└── 05-integration/  # Полные user flows
```

### Чеклист для Electron тестов

- [ ] Production build свежий и существует
- [ ] Тестовые fixtures созданы
- [ ] НЕ использовать `page.goto('app://...')` — только UI навигация
- [ ] Уникальный `user-data-dir` для каждого теста
- [ ] `waitForMainWindow()` после запуска app
- [ ] Stubbing диалогов ДО действия, которое их вызывает
- [ ] Один воркер (`workers: 1`) для стабильности
- [ ] Достаточные таймауты (120 сек для FFmpeg операций)

### Полезные команды

```bash
# Только smoke тесты
nx e2e animatrona-e2e -- --project=smoke

# С UI Playwright
nx e2e animatrona-e2e -- --ui

# Headed режим
nx e2e animatrona-e2e -- --headed

# По grep паттерну
nx e2e animatrona-e2e -- --grep "Import"
```

→ Подробная документация: `apps/animatrona-e2e/README.md`

---

## E2E-ранер на s3 (188.127.235.141)

Все E2E-прогоны переезжают с локальной машины на выделенный сервер s3.

### Инфраструктура

| Сервис         | Контейнер            | Порт на хосте        |
| -------------- | -------------------- | -------------------- |
| PostgreSQL E2E | `e2e-postgres`       | 5499                 |
| Redis E2E      | `e2e-redis`          | 6380                 |
| Репозиторий    | `/home/deploy/letar` | —                    |
| Playwright     | Chromium headless    | установлен глобально |

Compose-файл: `/opt/e2e-infra/docker-compose.yml`

### Подключение и запуск

```bash
ssh deploy@188.127.235.141

# Запуск конкретного shard
cd /home/deploy/letar
nx e2e driving-school-e2e -- --project=shard-core

# Полный прогон всех приложений
nx run-many --target=e2e --parallel=3
```

### Настройка нового приложения для E2E

1. **Создать E2E базу данных:**

```bash
docker exec e2e-postgres psql -U e2e -d postgres -c "CREATE DATABASE e2e_<app>;"
```

2. **Создать `.env.local`** в директории приложения:

```bash
# apps/<app>/.env.local
DATABASE_URL="postgresql://e2e:e2e@localhost:5499/e2e_<app>?schema=public"
AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL=http://localhost:<port>
ADMIN_EMAIL=admin@e2e.test
```

3. **Применить миграции:**

```bash
nx db:migrate <app>
```

### Особенности s3-ранера

- `ELECTRON_SKIP_BINARY_DOWNLOAD=1` — обязателен при `bun install` (Electron не нужен на сервере)
- `bun` симлинкован через `/root/.bun/` — `/root` должен быть доступен для deploy (`chmod o+x /root`)
- Playwright system deps установлены от root, браузер — от deploy пользователя

### `DEV_SESSION_TOKEN` — общий секрет для ВСЕХ приложений, не per-app

**Не генерируй свой `DEV_SESSION_TOKEN` для нового приложения** — `dashboard-agent` на s3
передаёт в `nx e2e <app>-e2e` через `POST /api/e2e/run` **один и тот же** токен из **своего
собственного окружения** (`--preserve-env=BASE_URL,DEV_SESSION_TOKEN`), а не читает
`.env.staging`/`.env.local` конкретного приложения. Если сгенерировать уникальный токен per-app
(естественная на вид идея — «свой секрет для своего приложения») — `global-setup.ts` получит от
раннера чужой (общий) токен, `createDevSessionRoute` сравнит его со своим `DEV_SESSION_TOKEN` и
отклонит с 403 — тест упадёт на `dev-session не установил cookie`.

**Правильно:** взять уже существующее значение `DEV_SESSION_TOKEN` из окружения `dashboard-agent`
на s3 (тот же токен, что и у всех остальных приложений с dev-session e2e — например
`grandslamcup`) и прописать его в `.env.staging` нового приложения. Менять общий токен — только
синхронно во всех `.env.staging` + в самом окружении `dashboard-agent`, никогда по отдельности.

Прецедент: `auth-hub-e2e` (§18.6 Сессия J, 2026-07-14) — первый прогон падал именно из-за
уникального токена, сгенерированного по аналогии с `AUTH_SECRET`/`DEV_SESSION_TOKEN` из раздела
выше («Настройка нового приложения для E2E»). Тот раздел описывает **dev-server** паттерн
(локальный `nx dev`, свои секреты нормальны); staging-docker паттерн (`docker-compose.staging.yml`

- `run_e2e` через dashboard-agent) — это другой контур, где `DEV_SESSION_TOKEN` уже общий.

### Комментарии в `docker-compose.staging.yml`/`.production.yml`: НЕ между `ports:` и портом

`deploy-affected.sh` резолвит `DB_PORT` через `grep -A 1 "ports:"` — берёт буквально следующую
строку после `ports:`. Комментарий, вставленный между `ports:` и первой записью (`- '5455:5432'`),
перехватывает эту позицию — `DB_PORT` остаётся пустым, скрипт падает на дефолтный `5432`
(`Can't reach database server at localhost:5432`, хотя контейнер реально слушает другой порт).
Комментарии, поясняющие выбор порта, должны стоять НАД блоком `ports:`, не внутри него.

- `nx zenstack:generate` не работает без предварительной сборки `libs/zenstack-form-plugin` — используй уже сгенерированные файлы из репо

### Обновление репозитория

```bash
ssh deploy@188.127.235.141
cd /home/deploy/letar
GIT_SSH_COMMAND="ssh -i /home/deploy/.ssh/id_ed25519" git pull --recurse-submodules
ELECTRON_SKIP_BINARY_DOWNLOAD=1 bun install --frozen-lockfile
```

### Cron (ежедневный прогон)

```bash
# /etc/cron.d/e2e-runner
0 2 * * * deploy cd /home/deploy/letar && nx run-many --target=e2e --parallel=3
```
