# От БД до UI за 5 минут: ZenStack -> Zod -> React-форма

> **Уровень сложности:** Сложный

**TL;DR:**

- `@form.*` директивы в `schema.zmodel` позволяют описать UI-метаданные прямо в модели БД — одно изменение обновляет всё
- Pipeline: schema.zmodel -> `zenstack:generate` -> Zod-схемы с `.meta()` -> `Form.FromSchema` — полный CRUD за 10 минут
- Relation Fields автоматически превращаются в Combobox с загрузкой опций из БД через `RelationFieldProvider`

**Кому полезно:**

- Junior: понять full-stack pipeline от БД до формы и перестать описывать сущность в трёх местах
- Middle: освоить @form.\* директивы и паттерн CRUD с Server Actions + сгенерированными схемами
- Senior: оценить архитектуру single source of truth через ZenStack и стратегию Relation Fields

---

> Восьмая статья из цикла «@letar/forms — от боли к декларативным формам». Полный pipeline: описываете модель в `schema.zmodel` -> добавляете `@form.*` директивы -> получаете готовую CRUD-форму с валидацией.

---

## Проблема: три описания одной сущности

Когда вы создаёте CRUD для модели Product, вы описываете её минимум трижды:

1. **БД**: Prisma/ZenStack schema (`schema.zmodel`)
2. **Валидация**: Zod-схема
3. **UI**: React-компоненты с label, placeholder, типами полей

Добавили поле `sku` в базу → обновите Zod-схему → обновите форму. Три места, три шанса забыть.

---

## Решение: @form.\* директивы в schema.zmodel

ZenStack уже генерирует Zod-схемы из моделей БД. Мы расширили генератор директивами `@form.*`:

```zmodel
model Product {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  /// @form.title("Название продукта")
  /// @form.placeholder("Введите название")
  title       String

  /// @form.title("Описание")
  /// @form.fieldType("richText")
  description String?

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ currency: "RUB", min: 0 })
  price       Int

  /// @form.title("Категория")
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  String

  /// @form.title("В наличии")
  inStock     Boolean  @default(true)

  /// @form.title("Рейтинг")
  /// @form.fieldType("rating")
  /// @form.props({ max: 5 })
  rating      Float?

  /// @form.title("SKU")
  /// @form.placeholder("ART-001")
  sku         String   @unique
}
```

Запускаем генерацию:

```bash
nx zenstack:generate my-app
```

Получаем:

```
src/generated/form-schemas/
├── Product.form.ts        # Zod-схема с UI-метаданными
├── ProductCreate.form.ts  # Схема для создания
├── ProductUpdate.form.ts  # Схема для обновления
└── index.ts               # Реэкспорт
```

---

## Сгенерированная схема

```typescript
// src/generated/form-schemas/ProductCreate.form.ts (автогенерация)
import { z } from 'zod/v4'

export const ProductCreateFormSchema = z.object({
  title: z
    .string()
    .min(1)
    .meta({ ui: { title: 'Название продукта', placeholder: 'Введите название' } }),

  description: z
    .string()
    .optional()
    .meta({ ui: { title: 'Описание', fieldType: 'richText' } }),

  price: z
    .number()
    .int()
    .meta({ ui: { title: 'Цена', fieldType: 'currency', fieldProps: { currency: 'RUB', min: 0 } } }),

  categoryId: z.string().meta({
    ui: {
      title: 'Категория',
      fieldType: 'combobox',
      fieldProps: { relation: { model: 'Category', labelField: 'name' } },
    },
  }),

  inStock: z
    .boolean()
    .default(true)
    .meta({ ui: { title: 'В наличии' } }),

  rating: z
    .number()
    .optional()
    .meta({ ui: { title: 'Рейтинг', fieldType: 'rating', fieldProps: { max: 5 } } }),

  sku: z
    .string()
    .min(1)
    .meta({ ui: { title: 'SKU', placeholder: 'ART-001' } }),
})
```

Всё автоматически: типы, опциональность, значения по умолчанию, UI-метаданные.

---

## Форма за одну строку

```tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas' // Автогенерация
<Form.FromSchema
  schema={ProductCreateFormSchema}
  initialValue={{}}
  onSubmit={createProduct}
  submitLabel="Создать продукт"
  exclude={['id', 'createdAt']}
/>
```

Или с ручной вёрсткой:

```tsx
<Form schema={ProductCreateFormSchema} initialValue={{}} onSubmit={createProduct}>
  <VStack gap={4}>
    <HStack>
      <Form.Field.String name="title" />
      <Form.Field.String name="sku" />
    </HStack>
    <Form.Field.RichText name="description" />
    <HStack>
      <Form.Field.Currency name="price" />
      <Form.Field.Rating name="rating" />
    </HStack>
    <Form.Field.Combobox name="categoryId" />
    <Form.Field.Switch name="inStock" />
    <Form.Button.Submit>Создать</Form.Button.Submit>
  </VStack>
</Form>
```

Обратите внимание: `Field.RichText`, `Field.Currency`, `Field.Rating` — библиотека знает тип каждого поля из `.meta({ ui: { fieldType } })`. Label и placeholder — тоже из схемы.

---

## Полный CRUD за 10 минут

### 1. Модель в schema.zmodel (уже есть выше)

### 2. Server Actions

```typescript
// app/products/_actions.ts
'use server'
import { getDb } from '@/lib/db'

export async function createProduct(data) {
  const db = await getDb()
  return db.product.create({ data })
}

export async function updateProduct(id, data) {
  const db = await getDb()
  return db.product.update({ where: { id }, data })
}
```

### 3. Страница создания

```tsx
// app/products/new/page.tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { createProduct } from '../_actions'

export default function NewProductPage() {
  return (
    <Form.FromSchema
      schema={ProductCreateFormSchema}
      initialValue={{}}
      onSubmit={createProduct}
      submitLabel="Создать продукт"
    />
  )
}
```

### 4. Страница редактирования

```tsx
// app/products/[id]/edit/page.tsx
import { ProductUpdateFormSchema } from '@/generated/form-schemas'
import { updateProduct } from '../../_actions'

export default async function EditProductPage({ params }) {
  const db = await getDb()
  const product = await db.product.findUnique({ where: { id: params.id } })

  return (
    <Form.FromSchema
      schema={ProductUpdateFormSchema}
      initialValue={product}
      onSubmit={(data) => updateProduct(params.id, data)}
      submitLabel="Сохранить"
    />
  )
}
```

**Итого:** Модель + 2 action + 2 страницы. Полный CRUD с валидацией, типобезопасностью и UI-метаданными.

---

## Доступные @form.\* директивы

| Директива           | Описание                | Пример                                       |
| ------------------- | ----------------------- | -------------------------------------------- |
| `@form.title`       | Label поля              | `/// @form.title("Имя пользователя")`        |
| `@form.placeholder` | Placeholder             | `/// @form.placeholder("Введите...")`        |
| `@form.description` | Подсказка (helperText)  | `/// @form.description("Макс 100 символов")` |
| `@form.fieldType`   | Тип компонента          | `/// @form.fieldType("richText")`            |
| `@form.props`       | Кастомные пропсы        | `/// @form.props({ currency: "RUB" })`       |
| `@form.hidden`      | Скрыть из формы         | `/// @form.hidden`                           |
| `@form.readonly`    | Только для чтения       | `/// @form.readonly`                         |
| `@form.order`       | Порядок в автогенерации | `/// @form.order(1)`                         |

---

## Pipeline: одно изменение → всё обновляется

```
schema.zmodel  →  zenstack:generate  →  Zod-схемы  →  Form.FromSchema
    ↑                                      ↑              ↑
 Добавили поле              Автоматически   Автоматически
```

Добавили `color String?` в модель Product с `@form.title("Цвет")` и `@form.fieldType("colorPicker")` → перегенерировали → форма автоматически содержит новое поле `ColorPicker`.

Ноль ручной работы на уровне UI.

---

## Relation Fields: Select из базы данных

В примере выше `categoryId` — это внешний ключ. Откуда берутся варианты для выбора?

Сгенерированная схема содержит подсказку в `fieldProps.relation`:

```typescript
categoryId: z.string().meta({
  ui: {
    title: 'Категория',
    fieldType: 'combobox',
    fieldProps: { relation: { model: 'Category', labelField: 'name' } },
  },
})
```

Для автоматической загрузки опций используется `RelationFieldProvider`:

```tsx
import { RelationFieldProvider, useRelationOptions } from '@letar/forms'
<RelationFieldProvider
  model="Category"
  labelField="name"
  queryFn={() => db.category.findMany({ select: { id: true, name: true } })}
>
  <Form.FromSchema schema={ProductCreateFormSchema} initialValue={{}} onSubmit={save} />
</RelationFieldProvider>
```

`Combobox` автоматически получает options из провайдера. При вводе — фильтрация на клиенте. При 100+ записях — серверная фильтрация через `searchFn`.

Подробнее — в [документации Relation Fields](https://forms.letar.best/docs/guides/relation-fields).

---

## Загрузка данных: TanStack Query

Для edit-форм нужно загрузить текущие данные. Рекомендуемый паттерн — TanStack Query:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'

function EditProductPage({ params }: { params: { id: string } }) {
  const { data: product } = useSuspenseQuery({
    queryKey: ['product', params.id],
    queryFn: () => db.product.findUnique({ where: { id: params.id } }),
  })

  return (
    <Form.FromSchema
      schema={ProductUpdateFormSchema}
      initialValue={product}
      onSubmit={(data) => updateProduct(params.id, data)}
      submitLabel="Сохранить"
    />
  )
}
```

TanStack Query даёт кэширование, дедупликацию запросов и автоматическую инвалидацию после мутации. В сочетании с ZenStack `getEnhancedPrisma()` — доступ к данным с учётом access policies.

Подробнее — в [документации TanStack Query Integration](https://forms.letar.best/docs/guides/tanstack-query).

---

## Итоги

| Что                    | Как                               |
| ---------------------- | --------------------------------- |
| UI-метаданные в модели | `/// @form.title("...")`          |
| Тип поля               | `/// @form.fieldType("currency")` |
| Генерация              | `nx zenstack:generate app`        |
| Форма создания         | `ProductCreateFormSchema`         |
| Форма редактирования   | `ProductUpdateFormSchema`         |

Принцип: **модель БД — единственный источник правды**. Zod-схемы и формы — производные.

### No-code: менеджер строит формы

ZenStack генерирует Zod-схему из модели БД. А `FormBuilder` генерирует форму из JSON-конфига. Вместе — от модели данных до UI без единой строчки JSX:

```tsx
import { FormBuilder } from '@letar/forms'

// JSON-конфиг можно хранить в БД и подгружать через API
const formConfig = await fetch('/api/form-config/feedback').then((r) => r.json())

<FormBuilder
  config={formConfig}
  initialValue={{}}
  onSubmit={submitFeedback}
/>
```

Менеджер описывает поля в админке, конфиг сохраняется в БД, `FormBuilder` рендерит форму. Разработчик не трогает код при добавлении нового поля — достаточно обновить JSON. Подробнее о `FormBuilder` — в [статье 7](07-from-schema.md).

---

## Попробовать

- **ZenStack формы:** [forms-example.letar.best/examples/zenstack](https://forms-example.letar.best/examples/zenstack)
- **CRUD Products:** [forms-example.letar.best/products](https://forms-example.letar.best/products)
- **Исходный код:** [zenstack](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/zenstack/page.tsx) | [products](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/products/page.tsx)
- **Клонировать:** `git clone https://github.com/kamiletar/letar-forms-example && cd letar-forms-example && npm install && npm run dev`

В следующей статье — offline-first формы: как сохранять данные локально, когда интернет пропал, и синхронизировать при восстановлении.

---

_Это восьмая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: FromSchema](07-from-schema.md) | [Следующая: Offline-first формы](09-offline-first.md)._
