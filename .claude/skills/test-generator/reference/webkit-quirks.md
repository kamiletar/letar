# WebKit особенности для E2E тестов

## Главная проблема: Click перед Fill

WebKit требует явного клика перед заполнением полей ввода.

```typescript
// ❌ НЕ РАБОТАЕТ в WebKit
await page.locator('input[type="email"]').fill(email)

// ✅ РАБОТАЕТ во всех браузерах
const emailInput = page.locator('input[type="email"]')
await emailInput.click()
await emailInput.fill(email)
```

## Надёжный ввод текста

В сложных формах `fill()` может быть ненадёжен:

```typescript
// Для критичных полей
const input = page.locator('input[name="title"]')
await input.click()
await input.clear()
await input.pressSequentially(text, { delay: 50 })
```

## Focus проблемы

```typescript
// ❌ Может не сработать
await input.focus()
await input.fill(value)

// ✅ Надёжнее
await input.click()
await input.fill(value)
```

## Select компоненты

```typescript
// ❌ Может не открыться
await select.click()

// ✅ Добавь ожидание
await select.click()
const listbox = page.getByRole('listbox')
await listbox.waitFor({ state: 'visible', timeout: 10000 })
```

## Анимации

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Отключить анимации
    animations: 'disabled',
  },
})
```

## Viewport

```typescript
// WebKit может вести себя иначе на маленьких экранах
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
  },
})
```

## Типичные flaky тесты

### 1. Dropdown не открывается

```typescript
// ❌
await select.click()
await option.click() // Dropdown ещё не открылся

// ✅
await select.click()
await listbox.waitFor({ state: 'visible' })
await option.click()
```

### 2. Input не заполняется

```typescript
// ❌
await input.fill(value) // WebKit игнорирует

// ✅
await input.click()
await input.fill(value)
```

### 3. Modal не закрывается

```typescript
// ❌
await closeButton.click()
// Следующее действие

// ✅
await closeButton.click()
await dialog.waitFor({ state: 'hidden' })
// Следующее действие
```

## Рекомендации

1. **Всегда click перед fill** — даже если в Chromium работает без
2. **Явные ожидания** — не полагайся на автоматические
3. **Отключай анимации** — источник flaky тестов
4. **Используй timeouts** — WebKit может быть медленнее
5. **Тестируй в WebKit регулярно** — проблемы выявляются только в нём

## Конфигурация проектов

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
```
