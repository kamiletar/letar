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
  '../../../../premium-rosstil/src/app/[locale]/catalog/_components/_images',
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

## Чеклист перед написанием E2E тестов

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
