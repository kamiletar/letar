# Caching

Кэширование и revalidation в Next.js 16.

---

## Изменения в Next.js 16

В Next.js 16 кэширование стало **opt-in** вместо opt-out:

| Версия             | По умолчанию      |
| ------------------ | ----------------- |
| Next.js 15 и ранее | Кэшируется        |
| **Next.js 16**     | **Не кэшируется** |

Теперь нужно явно указывать что кэшировать.

---

## Типы кэширования

### 1. Request Memoization

Автоматическая дедупликация одинаковых запросов в одном render pass.

```typescript
// Оба вызова выполнятся только 1 раз
async function ProductPage({ id }) {
  const product = await getProduct(id) // Запрос
  return <ProductDetails product={product} />
}

async function ProductSidebar({ id }) {
  const product = await getProduct(id) // Использует результат выше
  return <Sidebar product={product} />
}
```

Для Prisma/ORM используй `React.cache`:

```typescript
import { cache } from 'react'

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } })
})
```

### 2. Data Cache

Кэширование на уровне данных между запросами.

```typescript
// Не кэшируется (по умолчанию в Next.js 16)
const data = await fetch(url)

// Принудительное кэширование
const data = await fetch(url, { cache: 'force-cache' })

// Revalidation по времени
const data = await fetch(url, {
  next: { revalidate: 3600 }, // 1 час
})

// Revalidation по тегу
const data = await fetch(url, {
  next: { tags: ['products'] },
})
```

### 3. Full Route Cache

Кэширование HTML и RSC Payload на уровне роута.

```typescript
// Static generation (кэшируется при build)
export const dynamic = 'force-static'

// Dynamic (не кэшируется)
export const dynamic = 'force-dynamic'

// Revalidation по времени
export const revalidate = 3600 // 1 час
```

### 4. Router Cache (Client)

Кэширование на клиенте для мгновенной навигации.

```typescript
// Стандартная навигация использует Router Cache
<Link href="/products">Каталог</Link>

// Отключение prefetch
<Link href="/products" prefetch={false}>Каталог</Link>

// Инвалидация Router Cache
import { useRouter } from 'next/navigation'
const router = useRouter()
router.refresh()  // Очищает кэш текущего роута
```

---

## 'use cache' Directive (Next.js 16)

Новый способ кэширования в Next.js 16.

### Кэширование функции

```typescript
// lib/data.ts
'use cache'

export async function getProducts() {
  return db.product.findMany()
}

export async function getProduct(id: string) {
  return db.product.findUnique({ where: { id } })
}
```

### Кэширование компонента

```typescript
// components/product-list.tsx
'use cache'

export async function ProductList() {
  const products = await db.product.findMany()
  return (
    <ul>
      {products.map((p) => <li key={p.id}>{p.name}</li>)}
    </ul>
  )
}
```

### cacheLife (время жизни)

```typescript
import { cacheLife } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours') // Предустановленный профиль
  return db.product.findMany()
}
```

Профили cacheLife:

| Профиль   | stale | revalidate | expire     |
| --------- | ----- | ---------- | ---------- |
| `seconds` | -     | 1s         | 60s        |
| `minutes` | 5m    | 1m         | 1h         |
| `hours`   | 5m    | 1h         | 1d         |
| `days`    | 5m    | 1d         | 1w         |
| `weeks`   | 5m    | 1w         | 1mo        |
| `max`     | 5m    | 1mo        | indefinite |

### cacheTag (инвалидация)

```typescript
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.product.findMany()
}

export async function getProduct(id: string) {
  'use cache'
  cacheTag('products', `product-${id}`)
  return db.product.findUnique({ where: { id } })
}
```

---

## Revalidation

### revalidatePath

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function createProduct(data: ProductData) {
  await db.product.create({ data })

  // Инвалидировать страницу
  revalidatePath('/products')

  // Инвалидировать все роуты layout'а
  revalidatePath('/products', 'layout')

  // Инвалидировать всё
  revalidatePath('/', 'layout')
}
```

### revalidateTag

```typescript
'use server'

import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data })

  // Инвалидировать по тегу
  revalidateTag('products')
  revalidateTag(`product-${id}`)
}
```

### On-demand Revalidation (Route Handler)

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tag, path, secret } = await request.json()

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  if (tag) {
    revalidateTag(tag)
  }

  if (path) {
    revalidatePath(path)
  }

  return NextResponse.json({ revalidated: true })
}
```

---

## Static vs Dynamic

### Что делает страницу динамической

```typescript
// Динамические функции:
cookies()
headers()
searchParams
connection()

// Динамические данные:
fetch(url, { cache: 'no-store' })
const session = await auth() // Использует cookies()
```

### Force Static

```typescript
// Принудительно статическая страница
export const dynamic = 'force-static'

// Статическая генерация динамических роутов
export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } })
  return products.map((p) => ({ id: p.id }))
}
```

### Force Dynamic

```typescript
// Принудительно динамическая страница
export const dynamic = 'force-dynamic'

// Или через функции
export default async function Page() {
  const session = await auth() // Автоматически dynamic
  // ...
}
```

---

## Revalidate Interval

```typescript
// На уровне страницы
export const revalidate = 3600 // 1 час

// На уровне fetch
fetch(url, { next: { revalidate: 3600 } })

// На уровне layout (наследуется)
// app/products/layout.tsx
export const revalidate = 600 // 10 минут
```

---

## Паттерны проекта Letar

### ISR для каталога

```typescript
// app/[locale]/catalog/page.tsx
export const revalidate = 60 // 1 минута

export default async function CatalogPage() {
  const products = await db.product.findMany({
    where: { isPublished: true },
  })
  return <ProductGrid products={products} />
}
```

### Static Generation для статических страниц

```typescript
// app/[locale]/about/page.tsx
export const dynamic = 'force-static'

export default function AboutPage() {
  return <AboutContent />
}
```

### Dynamic для auth-зависимых страниц

```typescript
// app/[locale]/profile/page.tsx
// dynamic автоматически из-за auth()

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/sign-in')

  return <Profile user={session.user} />
}
```

### SSG для OG images

```typescript
// app/api/og/[id]/route.tsx
import { ImageResponse } from 'next/og'

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } })
  return products.map((p) => ({ id: p.id }))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const product = await getProduct(id)

  return new ImageResponse(
    <OGImageTemplate product={product} />,
    { width: 1200, height: 630 },
  )
}
```

---

## Debugging

### Проверка кэширования

```bash
# Dev сервер показывает статус кэша
# [cache: HIT] — из кэша
# [cache: MISS] — свежий запрос
# [cache: SKIP] — кэширование отключено
```

### Отключение кэша в dev

```typescript
// next.config.js
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
}
```

### Логирование fetch

```typescript
// next.config.js
module.exports = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

---

## Best Practices

### 1. Начинай без кэша

```typescript
// Сначала убедись что всё работает динамически
export default async function Page() {
  const data = await getData()
  return <View data={data} />
}

// Потом добавляй кэширование где нужно
export const revalidate = 60
```

### 2. Используй теги для связанных данных

```typescript
// Связанные данные — один тег
export async function getProduct(id) {
  'use cache'
  cacheTag('products', `product-${id}`)
  return db.product.findUnique({
    where: { id },
    include: { category: true },
  })
}

// Инвалидация каскадом
export async function updateCategory(id, data) {
  await db.category.update({ where: { id }, data })
  revalidateTag('products') // Инвалидирует все продукты
}
```

### 3. Granular revalidation

```typescript
// ❌ Слишком широкая инвалидация
revalidatePath('/', 'layout')

// ✅ Точечная инвалидация
revalidatePath('/products')
revalidateTag(`product-${id}`)
```

---

## См. также

- [data-fetching.md](data-fetching.md) — Загрузка данных
- [optimization.md](optimization.md) — Оптимизация
- [configuration.md](configuration.md) — next.config.js
