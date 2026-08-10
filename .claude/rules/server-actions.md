---
paths: apps/**/_actions/**
---

> ⚠️ **`paths:`-правила Claude Code инжектит только при чтении подходящего файла и НЕ инжектит
> при `Write`** ([claude-code#23478](https://github.com/anthropics/claude-code/issues/23478)) —
> то есть ровно в момент создания нового server action правило недоступно. Проверяемые пункты
> отсюда (валидация Zod + `.strip()`, access control) — кандидаты на semgrep-правило
> (`.semgrep/letar-rules.yml`), остальное работает как справочник при повторном чтении файла.

# Правила для Server Actions

## Структура

```
app/
├── _actions/
│   ├── product.actions.ts
│   ├── user.actions.ts
│   └── order.actions.ts
└── _schemas/
    ├── product.schema.ts
    └── user.schema.ts
```

## Паттерн Server Action

```typescript
// app/_actions/product.actions.ts
'use server'

import { getDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// 1. Схема валидации
const CreateProductSchema = z
  .object({
    name: z.string().min(2),
    price: z.number().positive(),
  })
  .strip() // ⚠️ Всегда .strip()

// 2. Action
export async function createProductAction(input: unknown) {
  // Валидация
  const parsed = CreateProductSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  // База данных с access control
  const db = await getDb()

  try {
    const product = await db.product.create({
      data: parsed.data,
    })

    // Инвалидация кэша
    revalidatePath('/products')

    return { data: product }
  } catch (e) {
    return { error: 'Не удалось создать продукт' }
  }
}
```

## Возвращаемые типы

```typescript
// Успех
return { data: product }

// Ошибка валидации
return { error: parsed.error.flatten() }

// Бизнес ошибка
return { error: 'Сообщение' }

// Не найдено
return { data: null }
```

## Использование в формах

```tsx
// НЕ используй <form action={...}>
// Вызывай action напрямую в onSubmit

const handleSubmit = async (data: FormData) => {
  const result = await createProductAction(data)

  if (result.error) {
    toaster.error({ title: result.error })
    return
  }

  toaster.success({ title: 'Создано' })
}
```

## Правила

- `'use server'` в начале файла
- Валидация через Zod с `.strip()`
- ZenStack `getDb()` для access control
- `revalidatePath()` после мутаций
- Не используй `<form action>` — вызывай напрямую
- Обработка ошибок через try/catch
