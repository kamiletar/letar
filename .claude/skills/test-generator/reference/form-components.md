# Тестирование @letar/forms

## Селекторы полей

TanStack Form использует стандартные имена полей:

```typescript
// По name атрибуту
page.locator('input[name="email"]')
page.locator('input[name="user.firstName"]') // вложенные

// По placeholder
page.getByPlaceholder('Введите email')

// По data-testid (самый надёжный)
page.locator('[data-testid="email-input"]')
```

## Заполнение полей

### Текстовые поля

```typescript
// ✅ ВСЕГДА click перед fill (для WebKit)
const input = page.locator('input[name="email"]')
await input.click()
await input.fill('test@example.com')
```

### Select

```typescript
// Открыть
await page.locator('select[name="category"]').click()

// Выбрать опцию (Portal!)
const listbox = page.getByRole('listbox')
await listbox.waitFor({ state: 'visible' })
await page.getByRole('option', { name: 'Категория 1' }).click()
await listbox.waitFor({ state: 'hidden' })
```

### Checkbox / Switch

```typescript
await page.locator('input[name="isActive"]').check()
await page.locator('input[name="isActive"]').uncheck()
```

### RadioGroup

```typescript
await page.getByRole('radio', { name: 'Мужской' }).click()
```

### Tags

```typescript
const tagsInput = page.locator('[data-testid="tags-input"]')
await tagsInput.click()
await tagsInput.fill('тег1')
await page.keyboard.press('Enter')
await tagsInput.fill('тег2')
await page.keyboard.press('Enter')
```

### FileUpload

```typescript
const fileInput = page.locator('input[type="file"]')
await fileInput.setInputFiles('./fixtures/test-image.png')
```

## Form.Group.List (массивы)

```typescript
// Добавить элемент
await page.getByRole('button', { name: 'Добавить' }).click()

// Заполнить последний добавленный
const items = page.locator('[data-testid="items-list"] > div')
const lastItem = items.last()
await lastItem.locator('input[name$=".name"]').fill('Item name')

// Удалить элемент
await lastItem.getByRole('button', { name: 'Удалить' }).click()
```

## Form.When (условные поля)

```typescript
// Выбрать тип
await page.getByRole('radio', { name: 'Компания' }).click()

// Проверить появление условных полей
await expect(page.locator('input[name="companyName"]')).toBeVisible()
await expect(page.locator('input[name="inn"]')).toBeVisible()
```

## Form.Steps (мультистеп)

```typescript
// Заполнить первый шаг
await page.locator('input[name="firstName"]').fill('Иван')
await page.locator('input[name="lastName"]').fill('Иванов')

// Перейти на следующий
await page.getByRole('button', { name: 'Далее' }).click()

// Проверить переход
await expect(page.getByText('Шаг 2')).toBeVisible()

// Заполнить второй шаг
await page.locator('input[name="email"]').fill('test@test.com')

// Завершить
await page.getByRole('button', { name: 'Сохранить' }).click()
```

## Валидация

```typescript
// Попытка submit с невалидными данными
await page.getByRole('button', { name: 'Сохранить' }).click()

// Проверка ошибок
await expect(page.getByText('Обязательное поле')).toBeVisible()
await expect(page.getByText('Некорректный email')).toBeVisible()

// Исправление
await page.locator('input[name="email"]').fill('valid@email.com')

// Ошибка исчезла
await expect(page.getByText('Некорректный email')).not.toBeVisible()
```

## Form.Errors

```typescript
// После submit
await page.getByRole('button', { name: 'Сохранить' }).click()

// Проверка сводки ошибок
const errorsBlock = page.locator('[data-testid="form-errors"]')
await expect(errorsBlock).toBeVisible()
await expect(errorsBlock.getByText('title: Обязательное поле')).toBeVisible()
```

## Page Object для форм

```typescript
class ProductFormPage {
  constructor(private page: Page) {}

  private async fillField(name: string, value: string) {
    const input = this.page.locator(`input[name="${name}"]`)
    await input.click()
    await input.fill(value)
  }

  async fillBasicInfo(data: { name: string; price: number }) {
    await this.fillField('name', data.name)
    await this.fillField('price', String(data.price))
  }

  async selectCategory(name: string) {
    await this.page.locator('select[name="categoryId"]').click()
    const listbox = this.page.getByRole('listbox')
    await listbox.waitFor({ state: 'visible' })
    await this.page.getByRole('option', { name }).click()
    await listbox.waitFor({ state: 'hidden' })
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Сохранить' }).click()
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible()
  }
}
```
