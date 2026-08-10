---
description: Создание нового Server Action или API endpoint по паттернам монорепо
---

# New API - Создание API endpoint

Создай новый Server Action или API endpoint.

## Когда использовать

- CRUD операции с данными
- Бизнес-логика на сервере
- Интеграции с внешними API

## Паттерн: Server Actions (рекомендуется)

### 1. Создать action файл

```typescript
// app/_actions/product.actions.ts
'use server'

import { getDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// Схема валидации
const CreateProductSchema = z
  .object({
    name: z.string().min(2, 'Минимум 2 символа'),
    price: z.number().positive('Цена должна быть положительной'),
    categoryId: z.string().cuid(),
  })
  .strip()

type CreateProductInput = z.infer<typeof CreateProductSchema>

// Action
export async function createProductAction(input: CreateProductInput) {
  // 1. Валидация
  const parsed = CreateProductSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  // 2. Получить db с access control
  const db = await getDb()

  // 3. Выполнить операцию
  try {
    const product = await db.product.create({
      data: parsed.data,
    })

    // 4. Инвалидировать кэш
    revalidatePath('/products')

    return { data: product }
  } catch (e) {
    return { error: 'Не удалось создать продукт' }
  }
}
```

### 2. Использование в форме

```tsx
'use client'

import { createProductAction } from '@/app/_actions/product.actions'
import { toaster } from '@/app/_components/ui/toaster'
import { Form } from '@letar/forms'

function CreateProductForm() {
  const handleSubmit = async (data: CreateProductInput) => {
    const result = await createProductAction(data)

    if (result.error) {
      toaster.error({ title: 'Ошибка', description: result.error })
      return
    }

    toaster.success({ title: 'Продукт создан' })
    router.push('/products')
  }

  return (
    <Form initialValue={defaultValues} schema={Schema} onSubmit={handleSubmit}>
      <Form.Field.String name="name" />
      <Form.Field.Number name="price" />
      <Form.Button.Submit>Создать</Form.Button.Submit>
    </Form>
  )
}
```

## Паттерн: ZenStack v3 API

```typescript
// app/_actions/product.actions.ts
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function getProducts() {
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)

  // Access control применяется автоматически через PolicyPlugin
  return db.product.findMany({
    include: { category: true },
  })
}
```

## Структура файлов

```
app/
├── _actions/
│   ├── product.actions.ts
│   ├── user.actions.ts
│   └── order.actions.ts
├── _schemas/
│   ├── product.schema.ts
│   └── user.schema.ts
└── products/
    └── page.tsx
```

## Возвращаемые типы

```typescript
// Успех
return { data: product }

// Ошибка валидации
return { error: parsed.error.flatten() }

// Бизнес ошибка
return { error: 'Сообщение об ошибке' }

// Null для "не найдено"
return { data: null }
```

## Чеклист

- [ ] Валидация через Zod с `.strip()`
- [ ] ZenStack v3 getEnhancedPrisma() для access control
- [ ] Обработка ошибок (try/catch)
- [ ] revalidatePath() после мутаций
- [ ] Типизация input/output

## Документация

- [data-fetching.md](/.claude/docs/data-fetching.md) — паттерны загрузки
- [database.md](/.claude/docs/database.md) — работа с ZenStack
- [forms.md](/.claude/docs/forms.md) — интеграция с формами
