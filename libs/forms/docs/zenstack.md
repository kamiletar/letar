# ZenStack интеграция

Интеграция @letar/forms с ZenStack для автоматической генерации форм из schema.zmodel.

## Обзор подходов

| Подход             | Библиотека                   | Когда использовать                   |
| ------------------ | ---------------------------- | ------------------------------------ |
| **Автоматический** | `@letar/zenstack-form-plugin` | 95% случаев — Single Source of Truth |
| **Ручной**         | `withUIMeta()`               | Сложные преобразования, legacy код   |

---

## @letar/zenstack-form-plugin — Автогенерация (рекомендуется)

ZenStack плагин генерирует Zod схемы с UI метаданными прямо из `schema.zmodel`.

### Подключение

```zmodel
// schema.zmodel
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
}
```

### Enum с метками

Doc-комментарии `///` перед значениями становятся метками:

```zmodel
enum RecipeType {
  /// Сладкое
  SWEET
  /// Солёное
  SALTY
}
```

Генерирует:

```typescript
export const RecipeTypeFormSchema = z.enum(['SWEET', 'SALTY']).meta({
  ui: {
    options: [
      { value: 'SWEET', label: 'Сладкое' },
      { value: 'SALTY', label: 'Солёное' },
    ],
  },
})

export const RecipeTypeLabels = {
  SWEET: 'Сладкое',
  SALTY: 'Солёное',
} as const
```

---

## @form.\* директивы

Используйте `///` doc-комментарии **ПЕРЕД** полем:

```zmodel
model Product {
  id          String   @id @default(cuid())

  /// @form.title("Название продукта")
  /// @form.placeholder("Введите название")
  title       String

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ min: 0, currency: "RUB" })
  price       Int

  /// @form.title("Рейтинг")
  /// @form.fieldType("rating")
  /// @form.props({ count: 5, allowHalf: true })
  rating      Float    @default(0)

  /// @form.title("Активен")
  /// @form.fieldType("switch")
  isActive    Boolean  @default(true)

  /// @form.title("Теги")
  /// @form.fieldType("tags")
  /// @form.placeholder("Добавить тег...")
  tags        String[]
}
```

### Поддерживаемые директивы

| Директива                  | Описание               | Пример                                       |
| -------------------------- | ---------------------- | -------------------------------------------- |
| `@form.title("...")`       | Заголовок поля (label) | `/// @form.title("Название")`                |
| `@form.placeholder("...")` | Placeholder            | `/// @form.placeholder("Введите...")`        |
| `@form.description("...")` | Описание (helperText)  | `/// @form.description("Подсказка")`         |
| `@form.fieldType("...")`   | Тип UI компонента      | `/// @form.fieldType("tags")`                |
| `@form.props({...})`       | Constraints + UI props | `/// @form.props({ min: 1, max: 100 })`      |
| `@form.relation({...})`    | Настройки relation     | `/// @form.relation({ labelField: "name" })` |
| `@form.exclude`            | Исключить из формы     | `/// @form.exclude`                          |

### Автоматическое разделение @form.props

**Zod constraints** (становятся методами схемы):

- `min`, `max`, `step` → `.min()`, `.max()`, `.multipleOf()`
- `minLength`, `maxLength` → `.min()`, `.max()` для строк
- `pattern` → `.regex()`
- `email`, `url`, `uuid` → `.email()`, `.url()`, `.uuid()`

**UI props** (остаются в `fieldProps`):

- `count`, `allowHalf` (для rating)
- `showValue`, `layout` (для slider, radioCard)

```zmodel
/// @form.props({ min: 1, max: 100, showValue: true })
portions Int
```

Генерирует:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { fieldProps: { showValue: true } } })
```

### Автоматически исключаемые поля

- `id` — первичные ключи
- `createdAt`, `updatedAt` — системные поля
- Поля с `@relation` (relation поля)
- Поля с `@form.exclude`

> **Важно:** FK поля (`categoryId`, `userId`) НЕ исключаются. Используйте `@form.relation` для select или `@form.exclude`.

### Использование схем

```tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas'

// Вариант 1: Полная автогенерация
<Form.FromSchema
  schema={ProductCreateFormSchema}
  initialValue={defaultValues}
  onSubmit={handleSubmit}
/>

// Вариант 2: С кастомным layout
<Form schema={ProductCreateFormSchema} initialValue={data} onSubmit={submit}>
  <Form.AutoFields include={['title', 'price']} />
  <Form.Field.Auto name="rating" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### Сборка плагина

```bash
nx build zenstack-form-plugin --skip-nx-cache
nx zenstack:generate <app-name>
```

---

## withUIMeta — ручное обогащение схем (v0.48.0+)

Fallback когда плагин не подключен или нужны сложные преобразования:

```tsx
import { withUIMeta, enumMeta, relationMeta } from '@letar/forms'
import { ProductCreateInputSchema } from '@/generated/zod'

const ProductFormSchema = withUIMeta(ProductCreateInputSchema, {
  name: { title: 'Название', placeholder: 'Введите название' },
  price: { title: 'Цена', fieldType: 'currency', fieldProps: { currency: 'RUB' } },
  isActive: { title: 'Активен', fieldType: 'switch' },
})

<Form.FromSchema schema={ProductFormSchema} initialValue={data} onSubmit={save} />
```

### withUIMetaDeep — вложенные объекты

```tsx
import { withUIMetaDeep } from '@letar/forms'

const UserFormSchema = withUIMetaDeep(UserCreateInputSchema, {
  firstName: { title: 'Имя' },
  lastName: { title: 'Фамилия' },
  address: {
    _meta: { title: 'Адрес доставки' }, // meta для группы
    country: { title: 'Страна', fieldType: 'select' },
    city: { title: 'Город' },
    street: { title: 'Улица' },
  },
})
```

### Хелперы для типичных случаев

```tsx
import { booleanMeta, commonMeta, dateMeta, enumMeta, numberMeta, relationMeta, textMeta } from '@letar/forms'

const UserFormSchema = withUIMeta(UserCreateInputSchema, {
  ...commonMeta, // id, createdAt, updatedAt (readonly/disabled)

  role: enumMeta({
    title: 'Роль',
    fieldType: 'radioCard',
    labels: { ADMIN: 'Администратор', USER: 'Пользователь', GUEST: 'Гость' },
  }),

  categoryId: relationMeta({
    title: 'Категория',
    model: 'Category',
    labelField: 'name',
  }),

  bio: textMeta({ title: 'О себе', fieldType: 'richText' }),
  age: numberMeta({ title: 'Возраст', min: 18, max: 120 }),
  isActive: booleanMeta({ title: 'Активен', fieldType: 'switch' }),
  birthDate: dateMeta({ title: 'Дата рождения' }),
})
```

---

## RelationFieldProvider — автозагрузка опций (v0.49.0+)

Провайдер для автоматической загрузки опций relation полей:

```tsx
import { useFindManyCategory, useFindManyTag } from '@/generated/hooks'
import { RelationFieldProvider } from '@letar/forms'
;<RelationFieldProvider
  relations={[
    { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
    { model: 'Tag', useQuery: useFindManyTag, labelField: 'title' },
  ]}
>
  <Form schema={ProductFormSchema} initialValue={data} onSubmit={save}>
    <Form.AutoFields /> {/* categoryId автоматически получит options */}
  </Form>
</RelationFieldProvider>
```

### RelationConfig props

| Prop               | Тип                                | Default | Описание                                     |
| ------------------ | ---------------------------------- | ------- | -------------------------------------------- |
| `model`            | `string`                           | -       | Имя модели (должно совпадать с relationMeta) |
| `useQuery`         | `() => { data, isLoading, error }` | -       | React hook для загрузки данных               |
| `labelField`       | `string`                           | -       | Поле для отображения в option                |
| `valueField`       | `string`                           | `'id'`  | Поле для значения                            |
| `descriptionField` | `string`                           | -       | Поле для description (для RadioCard)         |
| `queryArgs`        | `object`                           | -       | Аргументы для useQuery (where, orderBy)      |

### С фильтрацией и сортировкой

```tsx
<RelationFieldProvider
  relations={[
    {
      model: 'Category',
      useQuery: useFindManyCategory,
      labelField: 'name',
      queryArgs: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  ]}
>
```

### HOC withRelations

```tsx
import { withRelations } from '@letar/forms'

const ProductFormWithRelations = withRelations(ProductForm, [
  { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
])
```

### Хуки для кастомных компонентов

```tsx
import { useRelationFieldContext, useRelationOptions } from '@letar/forms'

function CustomCategorySelect() {
  const { options, isLoading, error } = useRelationOptions('Category')
  const context = useRelationFieldContext()
  const categoryState = context?.getState('Category')

  return <Select options={options} isLoading={isLoading} />
}
```

---

## Form с ZenStack API (v0.30.0+)

Интеграция с ZenStack хуками для автоматической загрузки и сохранения:

```tsx
<Form
  api={{
    id: productId, // пустой = создание, заполненный = редактирование
    query: {
      hook: useFindUniqueProduct,
      include: { category: true },
    },
    mutations: {
      create: useCreateProduct,
      update: useUpdateProduct,
    },
  }}
  schema={ProductSchema}
  onSubmit={(data) => router.push('/products')}
>
  <Form.Field.String name="name" />
  <Form.Field.Number name="price" />
  <Form.Errors />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Режимы:**

- `id` пустой → режим создания, использует `create` мутацию
- `id` заполнен → режим редактирования, загружает данные через `query`, использует `update` мутацию

**Автоматически:**

- Показывает loading spinner пока данные загружаются
- Заполняет форму данными из `query`
- Выбирает нужную мутацию при submit
- Показывает ошибки сервера в `Form.Errors`

---

## i18n для ZenStack схем

Плагин генерирует схемы с `i18nKey` при `i18n: true`:

```zmodel
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
  i18n = true
}
```

> Подробнее: [i18n документация](../zenstack-form-plugin/README.md#i18n-опционально)

---

## Обработка ошибок мутаций

При использовании ZenStack enhanced client ошибки мутаций содержат структурированную информацию. `mapServerErrors()` автоматически их распознаёт:

### Prisma ошибки (через ZenStack)

```typescript
// P2002 (unique constraint) — маппится на поле формы
try {
  await db.user.create({ data: { email: 'existing@mail.com', name: 'Test' } })
} catch (error) {
  const mapped = mapServerErrors(error)
  // → fieldErrors: [{ field: 'email', message: 'email уже существует' }]
}
```

### ZenStack access policy rejection

```typescript
// @@allow('create', auth() != null) — нарушение политики
try {
  await db.post.create({ data: { title: 'Test' } }) // без авторизации
} catch (error) {
  const mapped = mapServerErrors(error)
  // → formErrors: ['Нет доступа для выполнения этой операции']
}
```

### ZenStack db-query-error (обёртка Prisma)

```typescript
// ZenStack оборачивает Prisma ошибки в { reason: 'db-query-error', code: 'P2002', meta }
// mapServerErrors автоматически разворачивает и делегирует Prisma парсеру
```

### Использование в формах

```tsx
import { applyServerErrors, mapServerErrors } from '@letar/forms'

<Form schema={ProductSchema} onSubmit={async ({ value }) => {
  const db = getEnhancedPrisma(session?.user)
  try {
    await db.product.create({ data: value })
  } catch (error) {
    const mapped = mapServerErrors(error, {
      fieldMap: {
        name: { field: 'name', message: 'Товар с таким названием уже существует' },
      },
    })
    applyServerErrors(form, mapped)
  }
}}>
```

> Подробнее: [server-errors.md](./server-errors.md)

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [schema-generation.md](./schema-generation.md) — генерация из схемы
- [api-reference.md](./api-reference.md) — хуки и утилиты
- [@letar/zenstack-form-plugin](../zenstack-form-plugin/README.md) — полная документация плагина
