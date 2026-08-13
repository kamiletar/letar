# App Router

App Router — основа маршрутизации в Next.js 16.

---

## File Conventions

| Файл            |                              Назначение |
| --------------- | --------------------------------------: |
| `page.tsx`      |      UI страницы (обязателен для роута) |
| `layout.tsx`    |          Shared layout, сохраняет state |
| `template.tsx`  |  Как layout, но re-render при навигации |
| `loading.tsx`   |    Loading UI (автоматический Suspense) |
| `error.tsx`     |   Error boundary (требует 'use client') |
| `not-found.tsx` |                            404 страница |
| `route.ts`      |            API endpoint (Route Handler) |
| `proxy.ts`      | Proxy для запросов (заменил middleware) |
| `default.tsx`   |            Fallback для parallel routes |

---

## Структура папок

```
app/
├── layout.tsx              # Root layout (html, body)
├── page.tsx                # Главная страница /
├── [locale]/               # Dynamic segment для i18n
│   ├── layout.tsx          # Layout с провайдерами
│   ├── page.tsx            # /{locale}
│   ├── (auth)/             # Route Group (без URL сегмента)
│   │   ├── sign-in/
│   │   │   └── page.tsx    # /{locale}/sign-in
│   │   └── sign-up/
│   │       └── page.tsx    # /{locale}/sign-up
│   ├── catalog/
│   │   ├── page.tsx        # /{locale}/catalog
│   │   ├── loading.tsx     # Suspense fallback
│   │   ├── error.tsx       # Error boundary
│   │   ├── [id]/           # Dynamic route
│   │   │   └── page.tsx    # /{locale}/catalog/123
│   │   └── _components/    # Приватная папка (не роут)
│   │       └── filters.tsx
│   └── admin/
│       ├── layout.tsx      # Admin layout
│       └── _actions/       # Server Actions
│           └── create.ts
└── api/                    # Route Handlers
    ├── products/
    │   └── route.ts        # GET /api/products
    └── auth/
        └── [...all]/
            └── route.ts    # Better Auth handlers
```

---

## Dynamic Routes

### Базовые паттерны

```typescript
// [id] — один сегмент
// /products/123 → params.id = "123"
app / products / [id] / page.tsx

// [...slug] — catch-all (обязательный)
// /docs/a/b/c → params.slug = ["a", "b", "c"]
app / docs / [...slug] / page.tsx

// [[...slug]] — optional catch-all
// /docs → params.slug = undefined
// /docs/a/b → params.slug = ["a", "b"]
app / docs / [[...slug]] / page.tsx
```

### Получение params (Next.js 16)

```typescript
// ⚠️ В Next.js 16 params — Promise!
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductView id={id} />
}
```

### generateStaticParams

```typescript
// Статическая генерация динамических страниц
export async function generateStaticParams() {
  const products = await db.product.findMany({
    select: { id: true },
  })
  return products.map((p) => ({ id: p.id }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)
  return <ProductView product={product} />
}
```

---

## Route Groups

Route Groups `(name)` организуют код без влияния на URL.

```
app/
├── (marketing)/           # Группа для маркетинга
│   ├── layout.tsx         # Свой layout
│   ├── about/page.tsx     # /about
│   └── blog/page.tsx      # /blog
├── (shop)/                # Группа для магазина
│   ├── layout.tsx         # Другой layout
│   ├── cart/page.tsx      # /cart
│   └── products/page.tsx  # /products
└── (auth)/                # Группа для auth
    ├── layout.tsx         # Минимальный layout
    ├── sign-in/page.tsx   # /sign-in
    └── sign-up/page.tsx   # /sign-up
```

---

## Parallel Routes

Параллельные роуты `@slot` для одновременного рендеринга нескольких страниц.

```
app/
├── layout.tsx
├── page.tsx
├── @modal/              # Slot для модалки
│   ├── default.tsx      # Fallback (пустой)
│   └── (.)photo/[id]/   # Intercepting route
│       └── page.tsx
└── photo/[id]/
    └── page.tsx
```

```typescript
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

---

## Intercepting Routes

Перехват роутов для модалок без полной навигации.

```
(.)   — перехват того же уровня
(..)  — на уровень выше
(..)(..) — на два уровня выше
(...) — от root
```

```
app/
├── feed/
│   └── page.tsx
├── @modal/
│   └── (.)photo/[id]/    # Перехват /photo/[id]
│       └── page.tsx      # Показывает в модалке
└── photo/[id]/
    └── page.tsx          # Полная страница (при refresh)
```

---

## Layouts

### Root Layout (обязательный)

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
```

### Nested Layout с провайдерами

```typescript
// app/[locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()

  return (
    <ColorModeProvider>
      <ChakraProvider>
        <SessionProvider session={session}>
          <QueryProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </QueryProvider>
        </SessionProvider>
      </ChakraProvider>
    </ColorModeProvider>
  )
}
```

---

## Loading и Error

### Loading (Suspense)

```typescript
// app/catalog/loading.tsx
export default function Loading() {
  return <ProductsSkeleton />
}
```

### Error Boundary

```typescript
// app/catalog/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Box textAlign="center" py={10}>
      <Heading size="lg">Что-то пошло не так</Heading>
      <Text color="gray.500">{error.message}</Text>
      <Button onClick={reset} mt={4}>
        Попробовать снова
      </Button>
    </Box>
  )
}
```

### Not Found

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <Box textAlign="center" py={20}>
      <Heading>404</Heading>
      <Text>Страница не найдена</Text>
      <Link href="/">На главную</Link>
    </Box>
  )
}

// Программный вызов
import { notFound } from 'next/navigation'

export default async function Page({ params }) {
  const product = await getProduct(params.id)
  if (!product) { notFound() }
  return <ProductView product={product} />
}
```

---

## Навигация

### Link компонент

```typescript
import Link from 'next/link'

<Link href="/products">Каталог</Link>
<Link href={`/products/${id}`}>Товар {id}</Link>
<Link href="/products" prefetch={false}>Без prefetch</Link>
<Link href="/products" replace>Заменить в истории</Link>
```

### Программная навигация

```typescript
'use client'
import { useRouter } from 'next/navigation'

export function NavigationButton() {
  const router = useRouter()

  return (
    <>
      <Button onClick={() => router.push('/products')}>
        Перейти
      </Button>
      <Button onClick={() => router.replace('/products')}>
        Заменить
      </Button>
      <Button onClick={() => router.back()}>
        Назад
      </Button>
      <Button onClick={() => router.refresh()}>
        Обновить данные
      </Button>
    </>
  )
}
```

### redirect (Server)

```typescript
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth()
  if (!session) { redirect('/sign-in') }

  return <Dashboard />
}
```

---

## Проекты Letar

### premium-rosstil

```
app/
├── layout.tsx                    # Минимальный root layout
├── [locale]/                     # next-intl
│   ├── layout.tsx                # Все провайдеры
│   ├── (auth)/sign-in/
│   ├── admin/
│   │   ├── layout.tsx            # Admin sidebar
│   │   ├── _actions/             # Server Actions
│   │   └── categories/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   └── catalog/
│       ├── page.tsx
│       ├── loading.tsx
│       └── [id]/page.tsx
└── api/
    └── auth/[...nextauth]/route.ts
```

### imot

```
app/
├── layout.tsx
├── [locale]/
│   ├── layout.tsx
│   ├── (auth)/
│   ├── therapist/                # Кабинет терапевта
│   └── client/                   # Кабинет клиента
└── api/
```

---

## См. также

- [components.md](components.md) — Server vs Client Components
- [data-fetching.md](data-fetching.md) — Загрузка данных
- [configuration.md](configuration.md) — next.config.js, proxy.ts
