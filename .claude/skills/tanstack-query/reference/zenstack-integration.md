# ZenStack интеграция

В проекте Letar хуки TanStack Query **генерируются автоматически через ZenStack**.

## Генерируемые хуки

ZenStack создаёт типизированные хуки для каждой модели в `schema.zmodel`:

| Операция  | Хук                          | Пример                                  |
| --------- | ---------------------------- | --------------------------------------- |
| Список    | `useFindMany<Model>`         | `useFindManyOrder()`                    |
| Один      | `useFindUnique<Model>`       | `useFindUniqueOrder({ where: { id } })` |
| First     | `useFindFirst<Model>`        | `useFindFirstOrder({ where: {...} })`   |
| Count     | `useCount<Model>`            | `useCountOrder({ where: {...} })`       |
| Infinite  | `useInfiniteFindMany<Model>` | `useInfiniteFindManyProduct()`          |
| Create    | `useCreate<Model>`           | `useCreateOrder()`                      |
| Update    | `useUpdate<Model>`           | `useUpdateOrder()`                      |
| Delete    | `useDelete<Model>`           | `useDeleteOrder()`                      |
| Upsert    | `useUpsert<Model>`           | `useUpsertOrder()`                      |
| Aggregate | `useAggregate<Model>`        | `useAggregateOrder()`                   |
| GroupBy   | `useGroupBy<Model>`          | `useGroupByOrder()`                     |

## Импорт

```typescript
import {
  useCountOrder,
  useCreateOrder,
  useDeleteOrder,
  useFindManyOrder,
  useFindUniqueOrder,
  useInfiniteFindManyProduct,
  useUpdateOrder,
} from '@/generated/hooks'
```

## Примеры использования

### Список с фильтрацией

```typescript
function OrderList() {
  const { data, isLoading, error } = useFindManyOrder({
    where: {
      status: 'PENDING',
      createdAt: { gte: new Date('2024-01-01') },
    },
    include: {
      user: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <ul>
      {data?.map((order) => <OrderCard key={order.id} order={order} />)}
    </ul>
  )
}
```

### Одна запись

```typescript
function OrderDetails({ id }: { id: string }) {
  const { data: order, isLoading } = useFindUniqueOrder({
    where: { id },
    include: {
      user: true,
      items: {
        include: { product: true },
      },
    },
  })

  if (isLoading) return <Spinner />
  if (!order) return <NotFound />

  return <OrderView order={order} />
}
```

### Бесконечный скролл

```typescript
function ProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFindManyProduct(
    {
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 20) return undefined
        return allPages.length * 20 // offset
      },
    },
  )

  const products = data?.pages.flatMap((page) => page) ?? []

  return (
    <>
      <ProductGrid products={products} />
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Загрузить ещё
        </Button>
      )}
    </>
  )
}
```

### Create мутация

```typescript
function CreateOrderForm() {
  const createOrder = useCreateOrder()
  const queryClient = useQueryClient()

  const handleSubmit = async (data: OrderInput) => {
    await createOrder.mutateAsync({
      data: {
        ...data,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })

    // Инвалидировать список
    queryClient.invalidateQueries({ queryKey: ['Order'] })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <Button loading={createOrder.isPending}>Создать</Button>
    </form>
  )
}
```

### Update мутация

```typescript
function EditOrderStatus({ order }: { order: Order }) {
  const updateOrder = useUpdateOrder()
  const queryClient = useQueryClient()

  const handleStatusChange = async (newStatus: string) => {
    await updateOrder.mutateAsync({
      where: { id: order.id },
      data: { status: newStatus },
    })

    // Инвалидировать и список, и деталь
    queryClient.invalidateQueries({ queryKey: ['Order'] })
  }

  return (
    <Select
      value={order.status}
      onChange={handleStatusChange}
      disabled={updateOrder.isPending}
    />
  )
}
```

### Delete мутация

```typescript
function DeleteOrderButton({ orderId }: { orderId: string }) {
  const deleteOrder = useDeleteOrder()
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!confirm('Удалить заказ?')) return

    await deleteOrder.mutateAsync({
      where: { id: orderId },
    })

    queryClient.invalidateQueries({ queryKey: ['Order'] })
  }

  return (
    <Button
      colorScheme="red"
      onClick={handleDelete}
      loading={deleteOrder.isPending}
    >
      Удалить
    </Button>
  )
}
```

## Кастомизация TanStack Query опций

Второй аргумент — стандартные опции TanStack Query:

```typescript
const { data } = useFindManyOrder(
  // Первый аргумент — Prisma-like параметры
  {
    where: { status: 'PENDING' },
    include: { user: true },
  },
  // Второй аргумент — TanStack Query опции
  {
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут
    refetchInterval: 30 * 1000, // Polling каждые 30 сек
    enabled: isAuthenticated, // Условный запрос
    select: (data) => data.filter((o) => o.total > 100), // Трансформация
    placeholderData: [], // Пока грузится
  }
)
```

## Query Keys

ZenStack автоматически создаёт query keys в формате:

```typescript
;['ModelName', 'operation', { params }][
  // Примеры:
  ('Order', 'findMany', { where: { status: 'PENDING' } })
][('Order', 'findUnique', { where: { id: '123' } })][('Product', 'count', { where: { isActive: true } })]
```

### Инвалидация

```typescript
const queryClient = useQueryClient()

// Все запросы Order
queryClient.invalidateQueries({ queryKey: ['Order'] })

// Только findMany
queryClient.invalidateQueries({ queryKey: ['Order', 'findMany'] })

// Конкретный запрос
queryClient.invalidateQueries({
  queryKey: ['Order', 'findUnique', { where: { id: orderId } }],
})
```

## Auto-invalidation

Мутации автоматически инвалидируют связанные запросы:

```typescript
const createOrder = useCreateOrder({
  onSuccess: () => {
    // Автоматически инвалидируются:
    // - ['Order', 'findMany', ...]
    // - ['Order', 'count', ...]
  },
})
```

## Optimistic Updates

Для optimistic updates используй стандартный паттерн TanStack Query:

```typescript
const updateOrder = useUpdateOrder({
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ['Order'] })

    const previous = queryClient.getQueryData(['Order', 'findMany', {...}])

    queryClient.setQueryData(['Order', 'findMany', {...}], (old) =>
      old?.map((o) =>
        o.id === variables.where.id
          ? { ...o, ...variables.data }
          : o
      )
    )

    return { previous }
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['Order', 'findMany', {...}], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['Order'] })
  },
})
```

## Prefetching

```typescript
// Server Component (Next.js App Router)
import { prefetchFindManyOrder } from '@/generated/hooks'

export default async function OrdersPage() {
  const queryClient = new QueryClient()

  await prefetchFindManyOrder(queryClient, {
    where: { status: 'PENDING' },
    take: 20,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Orders />
    </HydrationBoundary>
  )
}
```

## См. также

- **zenstack-helper skill** — полная документация ZenStack:
  - `reference/tanstack-query.md` — детали генерируемых хуков
  - `reference/access-policies.md` — @@allow/@@deny влияет на данные
  - `reference/relations.md` — include и вложенные запросы

- **TanStack Query** (этот скилл):
  - `reference/hooks.md` — стандартные хуки (useQuery, useMutation)
  - `reference/cache-management.md` — инвалидация и optimistic updates
  - `reference/hydration.md` — SSR/SSG
