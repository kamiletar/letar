# TanStack Query интеграция

ZenStack автоматически генерирует типизированные хуки для TanStack Query.

## Установка

```bash
bun add @tanstack/react-query @zenstackhq/tanstack-query
```

## Настройка провайдера

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 минута
          refetchOnWindowFocus: false,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

## Генерируемые хуки

### useFindMany — список записей

```typescript
import { useFindManyOrder } from '@/generated/hooks'

function OrderList() {
  const { data, isLoading, error } = useFindManyOrder({
    where: { status: 'PENDING' },
    include: { user: true, items: true },
    orderBy: { createdAt: 'desc' },
  })

  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />

  return (
    <ul>
      {data?.map((order) => <li key={order.id}>{order.orderNumber}</li>)}
    </ul>
  )
}
```

### useFindUnique — одна запись

```typescript
import { useFindUniqueOrder } from '@/generated/hooks'

function OrderDetails({ id }: { id: string }) {
  const { data: order } = useFindUniqueOrder({
    where: { id },
    include: { items: true },
  })

  return <div>{order?.orderNumber}</div>
}
```

### useInfiniteQuery — бесконечный скролл

```typescript
import { useInfiniteFindManyProduct } from '@/generated/hooks'

function ProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFindManyProduct({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  }, {
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 20) return undefined
      return pages.length * 20 // offset
    },
  })

  const products = data?.pages.flatMap((page) => page) ?? []

  return (
    <>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Загрузка...' : 'Ещё'}
        </button>
      )}
    </>
  )
}
```

### useCount — количество записей

```typescript
import { useCountOrder } from '@/generated/hooks'

function OrderStats() {
  const { data: pendingCount } = useCountOrder({
    where: { status: 'PENDING' },
  })

  return <Badge>{pendingCount} ожидает</Badge>
}
```

## Мутации

### useCreateMutation

```typescript
import { useCreateOrder } from '@/generated/hooks'

function CreateOrderForm() {
  const createOrder = useCreateOrder()

  const handleSubmit = async (data: OrderInput) => {
    await createOrder.mutateAsync({
      data: {
        ...data,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### useUpdateMutation

```typescript
import { useUpdateOrder } from '@/generated/hooks'

function EditOrder({ orderId }: { orderId: string }) {
  const updateOrder = useUpdateOrder()

  const handleUpdate = async (data: Partial<Order>) => {
    await updateOrder.mutateAsync({
      where: { id: orderId },
      data,
    })
  }

  return (
    <button onClick={() => handleUpdate({ status: 'SHIPPED' })}>
      Отправить
    </button>
  )
}
```

### useDeleteMutation

```typescript
import { useDeleteOrder } from '@/generated/hooks'

function DeleteButton({ orderId }: { orderId: string }) {
  const deleteOrder = useDeleteOrder()

  return (
    <button
      onClick={() => deleteOrder.mutate({ where: { id: orderId } })}
      disabled={deleteOrder.isPending}
    >
      Удалить
    </button>
  )
}
```

## Optimistic Updates

```typescript
import { useFindManyOrder, useUpdateOrder } from '@/generated/hooks'
import { useQueryClient } from '@tanstack/react-query'

function OrderStatus({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const updateOrder = useUpdateOrder()

  const handleStatusChange = async (newStatus: string) => {
    // Optimistic update
    queryClient.setQueryData(
      ['Order', 'findMany', {/* same params */}],
      (old: Order[]) => old?.map((o) => o.id === order.id ? { ...o, status: newStatus } : o),
    )

    try {
      await updateOrder.mutateAsync({
        where: { id: order.id },
        data: { status: newStatus },
      })
    } catch {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['Order'] })
    }
  }

  return <Select onChange={handleStatusChange} value={order.status}>...</Select>
}
```

## Auto-invalidation

Мутации автоматически инвалидируют связанные запросы:

```typescript
const createOrder = useCreateOrder({
  // После создания — обновить списки
  onSuccess: () => {
    // Автоматически инвалидируется ['Order', 'findMany', ...]
  },
})
```

## Кастомизация запросов

```typescript
import { useFindManyOrder } from '@/generated/hooks'

const { data } = useFindManyOrder(
  { where: { status: 'PENDING' } },
  {
    // TanStack Query options
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchInterval: 30 * 1000, // Каждые 30 сек
    enabled: isAuthenticated, // Условный запрос
    select: (data) => data.filter((o) => o.total > 100), // Трансформация
  },
)
```

## Prefetching

```typescript
import { prefetchFindManyOrder } from '@/generated/hooks'

// В Server Component или loader
await prefetchFindManyOrder(queryClient, {
  where: { status: 'PENDING' },
  take: 10,
})
```

---

## tRPC интеграция (v3.2.0+)

Для проектов использующих tRPC доступен community package `zenstack-trpc`.

### Возможности

- Автоматическое создание tRPC роутеров из ZenStack схем
- Полная type-safety между клиентом и сервером
- Интеграция с access control policies

### Установка

```bash
bun add zenstack-trpc @trpc/server @trpc/client
```

### Использование

```typescript
// server/routers/_app.ts
import { getEnhancedPrisma } from '@/lib/db'
import { createZenStackRouter } from 'zenstack-trpc'

export const appRouter = createZenStackRouter({
  getDb: async (ctx) => getEnhancedPrisma(ctx.session?.user),
})
```

### Документация

- GitHub: https://github.com/nicnocquee/zenstack-trpc
- Автор: @nicnocquee

> **Примечание:** В текущем проекте tRPC не используется — используем TanStack Query хуки напрямую с ZenStack.
