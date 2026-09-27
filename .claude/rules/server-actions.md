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

## Паттерн Server Action (рекомендуемый: `ActionFailure`)

**Решение владельца (2026-09-27):** единственный рекомендуемый для новых server actions контракт
отказа — `ActionFailure` из `@letar/forms/server-errors` (`{ success: false; error: string; field?:
string }`), а не голый `{ data } / { error }` ниже. Причина: `ActionFailure` — единственный формат,
который понимает error-middleware декларативных форм `@letar/forms` (`unwrapActionResult` бросает
его как исключение, `Form`-компонент подсвечивает конкретное поле по `field`), и он же структурно
совместим с более простыми ad hoc контрактами (`{ error?: string }`), так что миграция в эту
сторону почти всегда не ломает вызывающий код.

```typescript
// app/_actions/product.actions.ts
'use server'

import { getDb } from '@/lib/db'
import { type ActionFailure, actionFailure, catchActionFailure, UserFacingError } from '@letar/forms/server-errors'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const CreateProductSchema = z
  .object({
    name: z.string().min(2),
    price: z.number().positive(),
  })
  .strip() // ⚠️ Всегда .strip()

// Разбор Zod-схемы — через общий хелпер, а не руками через safeParse + return { error }.
// ⚠️ parseActionInput сейчас временно живёт в apps/domwellbes/src/lib/catch-action-failure.ts —
// запрошен перенос в @letar/forms-core/server-errors (делегировано forms-coordinator-dev,
// см. .claude/rules/form-delegation.md), после переноса импорт меняется на `@letar/forms/server-errors`.
function parseProductInput(input: unknown): z.infer<typeof CreateProductSchema> | ActionFailure {
  const parsed = CreateProductSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return actionFailure(issue?.message ?? 'Некорректные данные товара', issue?.path[0]?.toString())
  }
  return parsed.data
}

export async function createProductAction(input: unknown): Promise<{ id: string } | ActionFailure> {
  const data = parseProductInput(input)
  if ('success' in data) { return data }

  return catchActionFailure(async () => {
    const db = await getDb()
    const existing = await db.product.findFirst({ where: { name: data.name } })
    if (existing) {
      throw new UserFacingError('Товар с таким названием уже есть')
    }
    const product = await db.product.create({ data })
    revalidatePath('/products')
    return { id: product.id }
  })
}
```

## Возвращаемые типы

```typescript
// Успех — форма самих данных, без обёртки { data: ... }
return { id: product.id }

// Отказ (валидация ИЛИ бизнес-правило) — единственный тип отказа
return actionFailure('Товар с таким названием уже есть', 'name')
// или throw new UserFacingError('...') внутри catchActionFailure — она сама превратит throw в ActionFailure
```

## Использование в формах

```tsx
// НЕ используй <form action={...}>
// Вызывай action напрямую в onSubmit формы @letar/forms

import { unwrapActionResult } from '@letar/forms'

async function onSubmit(value: ProductFormData) {
  const created = unwrapActionResult(await createProductAction(value))
  // unwrapActionResult бросает ActionFailure как исключение — middleware.onError формы
  // сама положит текст под нужное поле (по `field`) или в общую ошибку формы
  router.push(`/products/${created.id}`)
}
```

Вне формы `@letar/forms` (императивная кнопка, диалог) — проверка `'success' in result` (или
`isActionFailure(result)`) вручную, без исключения:

```tsx
const result = await createProductAction(input)
if ('success' in result) {
  toaster.error({ title: result.error })
  return
}
toaster.success({ title: 'Создано' })
```

## Legacy: `{ data } / { error }`

Простой контракт `{ data: X } | { error: string }` (без `ActionFailure`) — то, что использовалось
до 2026-09-27 и всё ещё встречается в части приложений (`studio`, `archetest`, `aprel8008`).
**Не расширять на новые actions**, но и не переписывать существующие только ради формы — миграция
имеет смысл только при следующем содержательном касании файла или отдельным осознанным решением
владельца (как это уже было сделано для `domwellbes`, см. `apps/domwellbes/PLAN.md`).

```typescript
// Успех
return { data: product }

// Ошибка валидации
return { error: parsed.error.flatten() }

// Бизнес ошибка
return { error: 'Сообщение' }
```

## Правила

- `'use server'` в начале файла
- Валидация через Zod с `.strip()`, разбор — через `actionFailure`/`parseActionInput`, не руками
- ZenStack `getDb()`/enhanced-клиент для access control
- `revalidatePath()` после мутаций
- Не используй `<form action>` — вызывай напрямую
- Отказ — значением (`ActionFailure`/`throw UserFacingError` под `catchActionFailure`), не голым
  `try/catch` с ручным `{ error: e.message }` — в production Next.js стирает текст исключения,
  брошенного из Server Action не через этот механизм
  (`.claude/docs/nextjs-server-action-thrown-error-message-stripped.md`)
