# Тестирование Chakra UI Portal компонентов

## Проблема

Chakra UI использует Portal для overlay компонентов:

- Select (выпадающий список)
- Dialog / Drawer
- Menu
- Popover
- Tooltip

Эти элементы рендерятся **вне основного DOM** (в `<body>`), поэтому селекторы внутри формы их не находят.

## Решение: Глобальные селекторы

### Select / Combobox

```typescript
// ❌ НЕ РАБОТАЕТ — ищет внутри формы
const option = this.form.locator('[data-value="FEMALE"]')

// ✅ РАБОТАЕТ — глобальный поиск по ролям
const trigger = page.locator('select[name="gender"]')
await trigger.click()

const listbox = page.getByRole('listbox')
await listbox.waitFor({ state: 'visible', timeout: 10000 })

const option = page.getByRole('option', { name: 'Женский' })
await option.click()

// Ждём закрытия
await listbox.waitFor({ state: 'hidden', timeout: 5000 })
```

### Dialog

```typescript
// Открытие
await page.getByRole('button', { name: 'Открыть' }).click()

// Ждём появления
const dialog = page.getByRole('dialog')
await dialog.waitFor({ state: 'visible' })

// Взаимодействие внутри диалога
await dialog.getByRole('button', { name: 'Подтвердить' }).click()

// Ждём закрытия
await dialog.waitFor({ state: 'hidden' })
```

### Menu

```typescript
// Открытие
await page.getByRole('button', { name: 'Меню' }).click()

// Элементы меню
const menu = page.getByRole('menu')
await menu.waitFor({ state: 'visible' })

await page.getByRole('menuitem', { name: 'Удалить' }).click()
```

### Popover

```typescript
await page.getByRole('button', { name: 'Подробнее' }).click()

// Popover контент
const popover = page.locator('[data-chakra-popover-content]')
await popover.waitFor({ state: 'visible' })

await popover.getByText('Информация').click()
```

## Типичные ошибки

### 1. Поиск внутри формы

```typescript
// ❌
const option = form.locator('[data-value="option"]')

// ✅
const option = page.getByRole('option', { name: 'Опция' })
```

### 2. Отсутствие ожидания

```typescript
// ❌ Может не найти
await page.getByRole('option', { name: 'Опция' }).click()

// ✅ Ждём появления
const listbox = page.getByRole('listbox')
await listbox.waitFor({ state: 'visible' })
await page.getByRole('option', { name: 'Опция' }).click()
```

### 3. Отсутствие ожидания закрытия

```typescript
// ❌ Следующее действие может быть блокировано
await option.click()
await page.locator('input[name="email"]').fill('test@test.com')

// ✅ Ждём закрытия
await option.click()
await listbox.waitFor({ state: 'hidden' })
await page.locator('input[name="email"]').fill('test@test.com')
```

## Page Object паттерн

```typescript
class ProductFormPage {
  constructor(private page: Page) {}

  async selectCategory(name: string) {
    await this.page.locator('select[name="categoryId"]').click()

    const listbox = this.page.getByRole('listbox')
    await listbox.waitFor({ state: 'visible', timeout: 10000 })

    await this.page.getByRole('option', { name }).click()
    await listbox.waitFor({ state: 'hidden', timeout: 5000 })
  }

  async openDeleteDialog() {
    await this.page.getByRole('button', { name: 'Удалить' }).click()
    const dialog = this.page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })
    return dialog
  }

  async confirmDelete() {
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Подтвердить' }).click()
    await dialog.waitFor({ state: 'hidden' })
  }
}
```
