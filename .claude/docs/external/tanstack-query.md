# TanStack Query v5 — Документация

> Пакет: `@tanstack/react-query`\
> Docs: https://tanstack.com/query/latest/docs/framework/react/overview\
> **В letar:** для списков и серверного состояния. Формы — через `@letar/forms`.

## Установка / Provider

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 минута
      retry: 1,
    },
  },
})

export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

---

## useQuery — запрос данных

```tsx
import { useQuery } from '@tanstack/react-query'

const { data, isPending, isError, error, isFetching, refetch } = useQuery({
  queryKey: ['todos'], // Уникальный ключ (массив)
  queryFn: () => fetchTodos(), // Функция, возвращающая Promise
})

if (isPending) return <Spinner />
if (isError) return <Text>Ошибка: {error.message}</Text>
return <TodoList todos={data} />
```

### Параметризованный запрос

```tsx
const { data } = useQuery({
  queryKey: ['product', productId], // При изменении productId — re-fetch
  queryFn: () => fetchProduct(productId),
  enabled: !!productId, // Только если productId задан
  staleTime: 5 * 60 * 1000, // Данные свежие 5 минут
  gcTime: 10 * 60 * 1000, // В кэше 10 минут после unmount
  retry: 3, // 3 попытки при ошибке
  placeholderData: keepPreviousData, // Показывать старые данные при смене ключа
})
```

### Состояния запроса

| Флаг          | Описание                                |
| ------------- | --------------------------------------- |
| `isPending`   | Нет данных в кэше, идёт первый запрос   |
| `isLoading`   | `isPending && isFetching` — синоним     |
| `isFetching`  | Любой фоновый запрос (refetch, refocus) |
| `isSuccess`   | Данные получены успешно                 |
| `isError`     | Последний запрос завершился ошибкой     |
| `isStale`     | Данные устарели (staleTime истёк)       |
| `status`      | `'pending' \| 'error' \| 'success'`     |
| `fetchStatus` | `'fetching' \| 'paused' \| 'idle'`      |

---

## useMutation — изменение данных

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
  mutationFn: (newTodo: Todo) => createTodo(newTodo),

  onMutate: async (variables) => {
    // Optimistic update — вызывается ДО запроса
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) => [...old, variables])
    return { previous } // context для onError
  },

  onError: (error, variables, context) => {
    // Откат при ошибке
    queryClient.setQueryData(['todos'], context?.previous)
  },

  onSuccess: (data, variables, context) => {
    // Инвалидация после успеха
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },

  onSettled: () => {
    // Всегда после завершения (success или error)
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})

// Вызов
mutate({ title: 'Купить хлеб' })

// Или async/await
try {
  await mutateAsync({ title: 'Купить молоко' })
} catch (e) {
  console.error(e)
}
```

---

## useInfiniteQuery — бесконечная прокрутка

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

const {
  data, // { pages: [...], pageParams: [...] }
  fetchNextPage,
  fetchPreviousPage,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  status,
} = useInfiniteQuery({
  queryKey: ['products'],
  queryFn: ({ pageParam }) => fetch(`/api/products?cursor=${pageParam}`).then((r) => r.json()),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
})

return (
  <>
    {data.pages.map((page, i) => (
      <Fragment key={i}>
        {page.items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </Fragment>
    ))}
    <Button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
      {isFetchingNextPage ? 'Загрузка...' : hasNextPage ? 'Загрузить ещё' : 'Всё'}
    </Button>
  </>
)
```

---

## QueryClient — управление кэшем

```tsx
const queryClient = useQueryClient()

// Инвалидировать (пометить устаревшими и перезапросить)
queryClient.invalidateQueries({ queryKey: ['todos'] })
queryClient.invalidateQueries({ queryKey: ['todos', { status: 'done' }] })

// Обновить данные в кэше вручную (optimistic update)
queryClient.setQueryData(['todo', 5], (old) => ({ ...old, title: 'New' }))

// Получить данные из кэша
const data = queryClient.getQueryData(['todo', 5])

// Prefetch
await queryClient.prefetchQuery({
  queryKey: ['todo', id],
  queryFn: () => fetchTodo(id),
})

// Отменить активные запросы
await queryClient.cancelQueries({ queryKey: ['todos'] })

// Удалить из кэша
queryClient.removeQueries({ queryKey: ['todos'] })

// Сбросить весь кэш
queryClient.clear()
```

---

## Кастомные хуки (паттерн letar)

```tsx
// hooks/use-products.ts
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 30_000,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

---

## Зависимые запросы

```tsx
// Запрос B зависит от результата запроса A
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser })

const { data: projects } = useQuery({
  queryKey: ['projects', user?.organizationId],
  queryFn: () => fetchProjects(user!.organizationId),
  enabled: !!user?.organizationId, // Ждём user
})
```

---

## Prefetching (Next.js App Router)

```tsx
// Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function ProductsPage() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsList />
    </HydrationBoundary>
  )
}

// Client Component — данные уже в кэше, нет waterfall
function ProductsList() {
  const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  return (
    <div>
      {data?.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
```

---

## ZenStack-генерированные хуки

В letar ZenStack генерирует TanStack Query хуки из `schema.zmodel`:

```tsx
// Автогенерируется в src/generated/hooks/
import {
  useCreateProduct,
  useDeleteProduct,
  useFindManyProduct,
  useFindUniqueProduct,
  useUpdateProduct,
} from '@/generated/hooks'

// Использование
const { data: products } = useFindManyProduct({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  include: { category: true },
})

const createProduct = useCreateProduct()
await createProduct.mutateAsync({ data: { name: 'Товар', price: 1000 } })
```

---

## Опции запроса

| Опция                  | По умолчанию    | Описание                   |
| ---------------------- | --------------- | -------------------------- |
| `staleTime`            | `0`             | Мс до устаревания данных   |
| `gcTime`               | `5 * 60 * 1000` | Мс в кэше после unmount    |
| `retry`                | `3`             | Кол-во повторов при ошибке |
| `retryDelay`           | exponential     | Задержка между повторами   |
| `refetchOnWindowFocus` | `true`          | Refetch при фокусе окна    |
| `refetchOnMount`       | `true`          | Refetch при монтировании   |
| `refetchInterval`      | `false`         | Polling интервал (мс)      |
| `enabled`              | `true`          | Отключить автозапрос       |
| `select`               | -               | Трансформация данных       |
| `placeholderData`      | -               | Данные пока запрос идёт    |
| `initialData`          | -               | Начальные данные (в кэш)   |

---

## В letar — гибридный подход

```
Формы (create/update) → @letar/forms + Server Actions
Списки и чтение      → TanStack Query (useFindMany*)
Мутации с UI         → useMutation + invalidateQueries
```

```tsx
// Server Actions для форм
async function createProduct(data: ProductCreateInput) {
  'use server'
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)
  return db.product.create({ data })
}

// TanStack Query для чтения
const { data: products } = useFindManyProduct({ where: { isActive: true } })
```

## Ссылки

- Docs: https://tanstack.com/query/latest/docs/framework/react/overview
- GitHub: https://github.com/TanStack/query
- Внутренний skill: `.claude/skills/tanstack-query/`
