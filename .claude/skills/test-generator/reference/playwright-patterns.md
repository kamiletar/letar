# Playwright E2E паттерны

## Параллельное выполнение

⚠️ **ВАЖНО:** E2E тесты запускаются в несколько workers параллельно.

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : 2,
  fullyParallel: true,
})
```

### Изоляция данных

```typescript
import { randomUUID } from 'crypto'

// ❌ ПЛОХО — тесты конфликтуют
const testProduct = { name: 'Test Product' }

// ✅ ХОРОШО — уникальные данные
const testProduct = {
  name: `Product ${randomUUID().slice(0, 8)}`,
  sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
}

// ✅ ХОРОШО — через testInfo
test('создание товара', async ({ page }, testInfo) => {
  const uniqueName = `Product-${testInfo.workerIndex}-${testInfo.testId}`
})
```

### Правила

1. Генерируй UUID/timestamp для создаваемых сущностей
2. Каждый worker может иметь своего тест-юзера
3. Удаляй созданные данные в `afterEach`/`afterAll`
4. Не полагайся на порядок выполнения
5. Не проверяй "всего 5 товаров", проверяй "мой товар существует"

## Структура теста

```typescript
import { expect, test } from '@playwright/test'

test.describe('Продукты', () => {
  test('создание продукта', async ({ page }) => {
    await page.goto('/admin/products/create')

    await page.locator('input[name="name"]').click()
    await page.locator('input[name="name"]').fill('Test Product')

    await page.getByRole('button', { name: 'Сохранить' }).click()

    await expect(page).toHaveURL(/\/admin\/products\/?$/)
    await expect(page.getByText('Test Product')).toBeVisible()
  })
})
```

## Селекторы

### По ролям (предпочтительно)

```typescript
page.getByRole('button', { name: 'Сохранить' })
page.getByRole('heading', { name: 'Заголовок' })
page.getByRole('link', { name: 'Ссылка' })
page.getByRole('textbox', { name: 'Имя' })
page.getByRole('listbox')
page.getByRole('option', { name: 'Опция' })
```

### По тексту

```typescript
page.getByText('Точный текст')
page.getByText(/регулярка/i)
```

### По атрибутам

```typescript
page.locator('input[name="email"]')
page.locator('[data-testid="submit-button"]')
page.getByPlaceholder('Введите email')
```

## Ожидания

```typescript
// Появление
await element.waitFor({ state: 'visible', timeout: 10000 })

// Исчезновение
await element.waitFor({ state: 'hidden', timeout: 5000 })

// Загрузка страницы
await page.waitForLoadState('domcontentloaded')

// URL
await page.waitForURL(/\/products\/?$/)

// Сетевой запрос
await page.waitForResponse('**/api/products')
```

## Assertions

```typescript
await expect(page).toHaveURL(/\/products\//)
await expect(page).toHaveTitle('Products')
await expect(element).toBeVisible()
await expect(element).toHaveText('Text')
await expect(element).toHaveValue('value')
await expect(element).toBeEnabled()
await expect(element).toBeDisabled()
```

## WebKit особенности

```typescript
// ✅ ВСЕГДА click перед fill
const input = page.locator('input[name="email"]')
await input.click()
await input.fill('test@example.com')

// Для сложных случаев
await input.clear()
await input.pressSequentially(text, { delay: 50 })
```

## Trailing slash в URL

```typescript
// ✅ Учитывай опциональный слеш
await expect(page).toHaveURL(/\/admin\/products\/?$/)
```

## Локализация

```typescript
const LOCALE_PREFIX = '/ru'

export function localePath(path: string): string {
  return `${LOCALE_PREFIX}${path}`
}

await page.goto(localePath('/admin/products'))
```

## Команды

```bash
# Все тесты
nx e2e <app>-e2e

# Конкретный проект
nx e2e <app>-e2e -- --project=admin-chromium

# По имени теста
nx e2e <app>-e2e -- --grep="создание"

# UI режим
nx e2e <app>-e2e -- --ui

# Headed (видимый браузер)
nx e2e <app>-e2e -- --headed
```
