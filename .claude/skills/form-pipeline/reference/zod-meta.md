# Zod .meta({ ui: {...} }) паттерны

## Основная идея

Вся логика форм в одном месте — Zod схема:

```typescript
const Schema = z.object({
  title: z
    .string()
    .min(2)
    .meta({
      ui: {
        title: 'Название',
        placeholder: 'Введите название',
        description: 'Минимум 2 символа',
      },
    }),
})
```

## Структура ui meta

```typescript
interface UIMeta {
  // Основные
  title?: string // label поля
  placeholder?: string // placeholder
  description?: string // helperText

  // Тип поля
  fieldType?: string // 'rating' | 'switch' | 'richText' | ...

  // Дополнительные props
  fieldProps?: Record<string, unknown>

  // Tooltip
  tooltip?: {
    title?: string
    description: string
    example?: string
    impact?: string
  }

  // Для enum
  options?: Array<{ value: string; label: string }>

  // Для relation
  relation?: {
    model: string
    labelField: string
    valueField?: string
  }
}
```

## Автоматические constraints

Zod методы автоматически применяются к HTML и UI:

| Zod метод                      | Результат                  |
| ------------------------------ | -------------------------- |
| `.min(n)` / `.max(n)` (string) | `minLength` / `maxLength`  |
| `.min(n)` / `.max(n)` (number) | `min` / `max`              |
| `.int()`                       | `step={1}`                 |
| `.multipleOf(n)`               | `step={n}`                 |
| `.email()`                     | `type="email"`             |
| `.url()`                       | `type="url"`               |
| `.regex()`                     | `pattern`                  |
| `.min(date)` / `.max(date)`    | `min` / `max` (YYYY-MM-DD) |
| `.min(n)` / `.max(n)` (array)  | `minItems` / `maxItems`    |

```typescript
const Schema = z.object({
  title: z.string().min(2).max(100), // → minLength=2, maxLength=100
  rating: z.number().min(1).max(10), // → min=1, max=10
  email: z.string().email(), // → type="email"
  quantity: z.number().int(), // → step=1
})
```

## Автоматические helperText

Если не указан, генерируется из constraints:

- Строки: "Максимум 100 символов", "От 2 до 50 символов"
- Числа: "От 1 до 10", "Минимум 0"
- Массивы: "Максимум 5 элементов"

## fieldType примеры

```typescript
// Rating (звёзды)
z.number().meta({
  ui: {
    title: 'Рейтинг',
    fieldType: 'rating',
    fieldProps: { count: 5, allowHalf: true },
  },
})

// Switch вместо checkbox
z.boolean().meta({
  ui: {
    title: 'Активен',
    fieldType: 'switch',
  },
})

// RichText
z.string().meta({
  ui: {
    title: 'Контент',
    fieldType: 'richText',
    fieldProps: { minHeight: '200px' },
  },
})

// Slider
z.number().meta({
  ui: {
    title: 'Громкость',
    fieldType: 'slider',
    fieldProps: { showValue: true },
  },
})
```

## Enum с options

```typescript
// В schema.zmodel
enum RecipeType {
  /// Сладкое
  SWEET
  /// Солёное
  SALTY
}

// Генерируется:
export const RecipeTypeFormSchema = z.enum(['SWEET', 'SALTY']).meta({
  ui: {
    options: [
      { value: 'SWEET', label: 'Сладкое' },
      { value: 'SALTY', label: 'Солёное' },
    ],
  },
})
```

## withUIMeta — обогащение схем

Для случаев когда @form.\* директивы не используются:

```typescript
import { enumMeta, relationMeta, withUIMeta } from '@letar/forms'

const ProductFormSchema = withUIMeta(ProductCreateInputSchema, {
  name: { title: 'Название', placeholder: 'Введите' },
  price: { title: 'Цена', fieldType: 'currency' },
  category: enumMeta({
    title: 'Категория',
    labels: { FOOD: 'Еда', DRINK: 'Напитки' },
  }),
  supplierId: relationMeta({
    title: 'Поставщик',
    model: 'Supplier',
    labelField: 'name',
  }),
})
```

## Tooltip

```typescript
z.string().meta({
  ui: {
    title: 'Марка автомобиля',
    tooltip: {
      description: 'Укажите марку учебного автомобиля.',
      example: 'Hyundai, Kia, Volkswagen',
      impact: 'Ученики часто ищут по марке авто',
    },
  },
})
```

## Приоритет props

Props компонента > meta схемы:

```tsx
// Schema: z.number().max(100)
<Form.Field.Number name="rating" max={50} />
// Использует max=50 (props), не max=100 (schema)
```
