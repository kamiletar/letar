---
paths: apps/**/api/**
---

> ⚠️ **`paths:`-правила Claude Code инжектит только при чтении подходящего файла и НЕ инжектит
> при `Write`** ([claude-code#23478](https://github.com/anthropics/claude-code/issues/23478)) —
> то есть ровно в момент создания нового API-роута правило недоступно. Проверяемые пункты отсюда
> (валидация входа, access control, отсутствие сырого SQL) — кандидаты на semgrep-правило
> (`.semgrep/letar-rules.yml`), остальное работает как справочник при повторном чтении файла.

# Правила для API Routes

## Next.js Route Handlers

```typescript
// app/api/products/route.ts
import { getDb } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'

// GET /api/products
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  const db = await getDb()
  const products = await db.product.findMany({
    skip: (page - 1) * limit,
    take: limit,
  })

  return NextResponse.json({ data: products })
}

// POST /api/products
export async function POST(request: NextRequest) {
  const body = await request.json()

  const schema = z
    .object({
      name: z.string().min(2),
      price: z.number().positive(),
    })
    .strip()

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = await getDb()
  const product = await db.product.create({
    data: parsed.data,
  })

  return NextResponse.json({ data: product }, { status: 201 })
}
```

## Динамические роуты

```typescript
// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  const db = await getDb()
  const product = await db.product.findUnique({
    where: { id },
  })

  if (!product) {
    return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })
  }

  return NextResponse.json({ data: product })
}
```

## Обработка ошибок

```typescript
export async function POST(request: NextRequest) {
  try {
    // ... логика
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
```

## Правила

- Валидация через Zod с `.strip()`
- ZenStack `getDb()` для access control
- Логирование ошибок через `console.error`
- HTTP статусы: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Error)
- `await params` в Next.js 16+
- Формат ответа: `{ data }` или `{ error }`

## Когда использовать

| Случай               | Решение        |
| -------------------- | -------------- |
| Внутренние мутации   | Server Actions |
| Внешние API/webhooks | Route Handlers |
| Публичный API        | Route Handlers |
| Формы                | Server Actions |
