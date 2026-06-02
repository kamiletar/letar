# Data Fetching

Паттерны загрузки данных в Next.js 16.

---

## Обзор подходов

| Подход                | Где    | Когда использовать |
| --------------------- | ------ | ------------------ |
| Server Component + DB | Сервер | Основной способ    |
| Server Actions        | Сервер | Мутации данных     |
| Route Handlers        | Сервер | REST API           |
| React Query           | Клиент | Polling, real-time |

---

## Server Components

### Прямой доступ к БД

```typescript
// app/products/page.tsx
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

export default async function ProductsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const db = getEnhancedPrisma(session?.user)

  // ZenStack применяет access control автоматически
  const products = await db.product.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })

  return <ProductList products={products} />
}
```

### С params (Next.js 16)

```typescript
// app/products/[id]/page.tsx
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params // ⚠️ await обязателен в Next.js 16
  const session = await auth.api.getSession({ headers: await headers() })
  const db = getEnhancedPrisma(session?.user)

  const product = await db.product.findUnique({
    where: { id },
    include: { category: true, images: true },
  })

  if (!product) notFound()

  return <ProductView product={product} />
}
```

### С searchParams

```typescript
// app/products/page.tsx
interface Props {
  searchParams: Promise<{ category?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { category, page = '1' } = await searchParams

  const products = await db.product.findMany({
    where: category ? { categoryId: category } : undefined,
    skip: (parseInt(page) - 1) * 20,
    take: 20,
  })

  return <ProductList products={products} />
}
```

---

## Server Actions

Мутации данных с `'use server'` директивой.

### Базовый паттерн

```typescript
// app/admin/categories/_actions/create.ts
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createCategory(formData: FormData) {
  // 1. Проверка авторизации (Better Auth)
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Валидация данных
  const name = formData.get('name') as string
  if (!name || name.length < 2) {
    throw new Error('Название должно быть минимум 2 символа')
  }

  // 3. Мутация БД
  const db = getEnhancedPrisma(session.user)
  await db.category.create({
    data: { name },
  })

  // 4. Инвалидация кэша
  revalidatePath('/admin/categories')

  // 5. Редирект (опционально)
  redirect('/admin/categories')
}
```

### Использование в форме

```typescript
// app/admin/categories/new/page.tsx
import { createCategory } from '../_actions/create'

export default function NewCategoryPage() {
  return (
    <form action={createCategory}>
      <Input name="name" placeholder="Название категории" />
      <Button type="submit">Создать</Button>
    </form>
  )
}
```

### С @letar/forms

```typescript
// app/admin/categories/new/page.tsx
'use client'

import { CategoryFormSchema } from '@/generated/form-schemas/Category.form'
import { ChakraFormField, FormGroup, FormRoot, useAppForm } from '@letar/forms'
import { createCategory } from '../_actions/create'

export function CategoryForm() {
  const form = useAppForm({
    schema: CategoryFormSchema,
    defaultValues: { name: '' },
  })

  return (
    <FormRoot form={form} action={createCategory}>
      <FormGroup>
        <ChakraFormField
          form={form}
          name="name"
          label="Название"
          placeholder="Введите название"
        />
      </FormGroup>
      <Button type="submit">Создать</Button>
    </FormRoot>
  )
}
```

### С useTransition (оптимистичные обновления)

```typescript
'use client'

import { useOptimistic, useTransition } from 'react'
import { deleteProduct } from '../_actions/delete'

export function ProductList({ products }: { products: Product[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticProducts, removeOptimistic] = useOptimistic(
    products,
    (state, productId: string) => state.filter((p) => p.id !== productId),
  )

  const handleDelete = (productId: string) => {
    startTransition(async () => {
      removeOptimistic(productId)
      await deleteProduct(productId)
    })
  }

  return (
    <List>
      {optimisticProducts.map((product) => (
        <ListItem key={product.id}>
          {product.name}
          <Button
            onClick={() => handleDelete(product.id)}
            loading={isPending}
          >
            Удалить
          </Button>
        </ListItem>
      ))}
    </List>
  )
}
```

---

## Route Handlers

REST API endpoints в `app/api/`.

### GET

```typescript
// app/api/products/route.ts
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  const db = getEnhancedPrisma(session?.user)

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const products = await db.product.findMany({
    where: category ? { categoryId: category } : undefined,
  })

  return NextResponse.json(products)
}
```

### POST

```typescript
// app/api/products/route.ts
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const db = getEnhancedPrisma(session.user)

  try {
    const product = await db.product.create({ data: body })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}
```

### Dynamic Route

```typescript
// app/api/products/[id]/route.ts
interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params

  const product = await db.product.findUnique({ where: { id } })
  if (!product) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params

  await db.product.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

---

## React Query (Client)

Для polling, real-time и сложного кэширования на клиенте.

### Setup

```typescript
// components/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 минута
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Использование

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function ProductList() {
  const queryClient = useQueryClient()

  // Запрос данных
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
    staleTime: 5 * 1000, // 5 секунд
  })

  // Мутация с инвалидацией
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  if (isLoading) return <Spinner />

  return (
    <List>
      {products?.map((product) => (
        <ListItem key={product.id}>
          {product.name}
          <Button
            onClick={() => deleteMutation.mutate(product.id)}
            loading={deleteMutation.isPending}
          >
            Удалить
          </Button>
        </ListItem>
      ))}
    </List>
  )
}
```

### Polling

```typescript
const { data } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: fetchStats,
  refetchInterval: 5000, // Каждые 5 секунд
})
```

---

## Streaming с Suspense

### loading.tsx

```typescript
// app/products/loading.tsx
export default function Loading() {
  return (
    <Grid columns={3} gap={4}>
      {[...Array(6)].map((_, i) => <Skeleton key={i} height="200px" />)}
    </Grid>
  )
}
```

### Suspense для частей страницы

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <Grid columns={2} gap={4}>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </Grid>
  )
}

// Каждый компонент загружается независимо
async function DashboardStats() {
  const stats = await getStats()
  return <StatsCards stats={stats} />
}

async function RevenueChart() {
  const data = await getRevenueData()
  return <Chart data={data} />
}
```

---

## Parallel Data Fetching

### Promise.all

```typescript
export default async function ProductPage({ params }: Props) {
  const { id } = await params

  // Параллельные запросы
  const [product, reviews, relatedProducts] = await Promise.all([
    getProduct(id),
    getProductReviews(id),
    getRelatedProducts(id),
  ])

  return (
    <>
      <ProductDetails product={product} />
      <ReviewsList reviews={reviews} />
      <RelatedProducts products={relatedProducts} />
    </>
  )
}
```

### Независимые Suspense

```typescript
export default async function ProductPage({ params }: Props) {
  const { id } = await params

  return (
    <>
      {/* Основные данные загружаются первыми */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={id} />
      </Suspense>

      {/* Отзывы могут подгрузиться позже */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews id={id} />
      </Suspense>
    </>
  )
}
```

---

## Request Memoization

Next.js автоматически дедуплицирует одинаковые fetch запросы.

```typescript
// Эти вызовы будут выполнены только 1 раз
async function ProductDetails({ id }: { id: string }) {
  const product = await getProduct(id) // Запрос #1
  return <div>{product.name}</div>
}

async function ProductPrice({ id }: { id: string }) {
  const product = await getProduct(id) // Использует результат #1
  return <div>{product.price}</div>
}
```

### React.cache для ORM

```typescript
import { cache } from 'react'

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } })
})

export const getProducts = cache(async () => {
  return db.product.findMany()
})
```

---

## Гибридный подход (Letar)

В проекте Letar используется гибридный подход:

| Сценарий                      | Подход                        |
| ----------------------------- | ----------------------------- |
| Страницы каталога             | Server Components + Prisma    |
| Формы создания/редактирования | Server Actions + @letar/forms |
| Admin dashboard stats         | React Query с polling         |
| Infinite scroll               | React Query + Route Handler   |

```typescript
// Server Component для начальных данных
export default async function CatalogPage() {
  const products = await db.product.findMany({ take: 20 })
  return <ProductGrid initialProducts={products} />
}

// Client Component для infinite scroll
'use client'
function ProductGrid({ initialProducts }) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['products'],
    queryFn: ({ pageParam }) => fetch(`/api/products?cursor=${pageParam}`).then((r) => r.json()),
    initialData: { pages: [initialProducts], pageParams: [null] },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  // ...
}
```

---

## См. также

- [components.md](components.md) — Server vs Client Components
- [caching.md](caching.md) — Кэширование и revalidation
- [app-router.md](app-router.md) — Структура роутов
