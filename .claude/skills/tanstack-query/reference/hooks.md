# React Hooks

Основные хуки TanStack Query для React.

## useQuery

Базовый хук для запросов данных.

```typescript
import { useQuery } from '@tanstack/react-query'

const {
  data,
  error,
  status,
  isPending,
  isSuccess,
  isError,
  isFetching,
  isLoading,
  isRefetching,
  isStale,
  refetch,
  dataUpdatedAt,
  errorUpdatedAt,
} = useQuery({
  queryKey: ['todos'],
  queryFn: () => api.getTodos(),
})
```

### Обязательные опции

| Опция      | Тип                           | Описание                 |
| ---------- | ----------------------------- | ------------------------ |
| `queryKey` | `unknown[]`                   | Уникальный ключ запроса  |
| `queryFn`  | `(context) => Promise<TData>` | Функция получения данных |

### Основные опции

| Опция                  | Тип                   | Default         | Описание                |
| ---------------------- | --------------------- | --------------- | ----------------------- |
| `enabled`              | `boolean`             | `true`          | Условное выполнение     |
| `staleTime`            | `number`              | `0`             | ms до "устаревания"     |
| `gcTime`               | `number`              | `5 * 60 * 1000` | ms жизни в кэше         |
| `retry`                | `boolean \| number`   | `3`             | Количество ретраев      |
| `retryDelay`           | `number \| fn`        | exponential     | Задержка между ретраями |
| `refetchInterval`      | `number \| false`     | `false`         | Интервал polling        |
| `refetchOnMount`       | `boolean \| 'always'` | `true`          | Рефетч при маунте       |
| `refetchOnWindowFocus` | `boolean \| 'always'` | `true`          | Рефетч при фокусе       |
| `refetchOnReconnect`   | `boolean \| 'always'` | `true`          | Рефетч при reconnect    |

### Продвинутые опции

| Опция                 | Тип                                      | Описание                      |
| --------------------- | ---------------------------------------- | ----------------------------- |
| `select`              | `(data) => TSelected`                    | Трансформация данных          |
| `placeholderData`     | `TData \| fn`                            | Данные пока грузится          |
| `initialData`         | `TData \| fn`                            | Начальные данные (кэшируются) |
| `notifyOnChangeProps` | `string[]`                               | Оптимизация ререндеров        |
| `structuralSharing`   | `boolean`                                | Сохранение ссылок             |
| `throwOnError`        | `boolean`                                | Пробрасывать в ErrorBoundary  |
| `meta`                | `Record<string, unknown>`                | Метаданные                    |
| `networkMode`         | `'online' \| 'always' \| 'offlineFirst'` | Режим сети                    |

### Return values

| Свойство        | Тип                                 | Описание                    |
| --------------- | ----------------------------------- | --------------------------- |
| `data`          | `TData \| undefined`                | Данные запроса              |
| `error`         | `TError \| null`                    | Ошибка                      |
| `status`        | `'pending' \| 'error' \| 'success'` | Статус                      |
| `fetchStatus`   | `'fetching' \| 'paused' \| 'idle'`  | Статус fetch                |
| `isPending`     | `boolean`                           | Нет данных, идёт загрузка   |
| `isLoading`     | `boolean`                           | isPending && isFetching     |
| `isSuccess`     | `boolean`                           | Успешно загружено           |
| `isError`       | `boolean`                           | Ошибка                      |
| `isFetching`    | `boolean`                           | Идёт запрос                 |
| `isRefetching`  | `boolean`                           | Рефетч (не первая загрузка) |
| `isStale`       | `boolean`                           | Данные устарели             |
| `refetch`       | `() => Promise`                     | Ручной рефетч               |
| `dataUpdatedAt` | `number`                            | Timestamp обновления        |

### Примеры

```typescript
// Условный запрос
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => api.getUser(userId),
  enabled: !!userId, // Не выполнять пока нет userId
})

// Трансформация данных
const { data: totalPrice } = useQuery({
  queryKey: ['cart'],
  queryFn: () => api.getCart(),
  select: (cart) => cart.items.reduce((sum, i) => sum + i.price, 0),
})

// Polling
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => api.getNotifications(),
  refetchInterval: 30 * 1000, // Каждые 30 секунд
})
```

---

## useMutation

Хук для мутаций (create, update, delete).

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const { mutate, mutateAsync, data, error, isPending, isSuccess, isError, reset, variables } = useMutation({
  mutationFn: (newTodo) => api.createTodo(newTodo),
  onMutate: async (variables) => {
    /* before mutation */
  },
  onSuccess: (data, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
  onError: (error, variables, context) => {
    /* on error */
  },
  onSettled: (data, error, variables, context) => {
    /* always */
  },
})
```

### Опции

| Опция          | Тип                                         | Описание                         |
| -------------- | ------------------------------------------- | -------------------------------- | ------------------ |
| `mutationFn`   | `(variables) => Promise<TData>`             | Функция мутации                  |
| `mutationKey`  | `unknown[]`                                 | Ключ для defaults                |
| `onMutate`     | `(variables) => context`                    | Перед мутацией                   |
| `onSuccess`    | `(data, variables, context) => void`        | При успехе                       |
| `onError`      | `(error, variables, context) => void`       | При ошибке                       |
| `onSettled`    | `(data, error, variables, context) => void` | Всегда                           |
| `retry`        | `number`                                    | `0`                              | Количество ретраев |
| `scope`        | `{ id: string }`                            | Для последовательного выполнения |
| `throwOnError` | `boolean`                                   | Пробрасывать ошибки              |

### Return values

| Свойство      | Тип                             | Описание              |
| ------------- | ------------------------------- | --------------------- |
| `mutate`      | `(variables) => void`           | Выполнить мутацию     |
| `mutateAsync` | `(variables) => Promise<TData>` | Async версия          |
| `data`        | `TData \| undefined`            | Результат             |
| `error`       | `TError \| null`                | Ошибка                |
| `isPending`   | `boolean`                       | Выполняется           |
| `isSuccess`   | `boolean`                       | Успешно               |
| `isError`     | `boolean`                       | Ошибка                |
| `reset`       | `() => void`                    | Сбросить состояние    |
| `variables`   | `TVariables`                    | Переданные переменные |

### Примеры

```typescript
// Простое использование
const createTodo = useMutation({
  mutationFn: api.createTodo,
})

<button onClick={() => createTodo.mutate({ title: 'New Todo' })}>
  Create
</button>

// С await
const handleSubmit = async (data) => {
  try {
    const result = await createTodo.mutateAsync(data)
    toast.success(`Created: ${result.title}`)
  } catch (error) {
    toast.error(error.message)
  }
}
```

---

## useInfiniteQuery

Хук для пагинации и бесконечного скролла.

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

const {
  data,
  fetchNextPage,
  fetchPreviousPage,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
} = useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => api.getProjects({ page: pageParam }),
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => lastPage.nextPage ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevPage ?? undefined,
  maxPages: 3, // Ограничить количество страниц в памяти
})
```

### Обязательные опции

| Опция              | Тип                                               | Описание                    |
| ------------------ | ------------------------------------------------- | --------------------------- |
| `initialPageParam` | `TPageParam`                                      | Начальный параметр страницы |
| `getNextPageParam` | `(lastPage, allPages) => TPageParam \| undefined` | Следующая страница          |

### Дополнительные опции

| Опция                  | Тип                                                | Описание                  |
| ---------------------- | -------------------------------------------------- | ------------------------- |
| `getPreviousPageParam` | `(firstPage, allPages) => TPageParam \| undefined` | Предыдущая страница       |
| `maxPages`             | `number`                                           | Максимум страниц в памяти |

### Return values

| Свойство                 | Тип             | Описание             |
| ------------------------ | --------------- | -------------------- |
| `data.pages`             | `TData[]`       | Массив страниц       |
| `data.pageParams`        | `TPageParam[]`  | Параметры страниц    |
| `fetchNextPage`          | `() => Promise` | Загрузить следующую  |
| `fetchPreviousPage`      | `() => Promise` | Загрузить предыдущую |
| `hasNextPage`            | `boolean`       | Есть следующая       |
| `hasPreviousPage`        | `boolean`       | Есть предыдущая      |
| `isFetchingNextPage`     | `boolean`       | Грузится следующая   |
| `isFetchingPreviousPage` | `boolean`       | Грузится предыдущая  |

### Пример

```typescript
function ProjectList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: ({ pageParam }) => api.getProjects(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.length === 20 ? lastPage.length : undefined,
  })

  const projects = data?.pages.flatMap((page) => page) ?? []

  return (
    <>
      {projects.map((project) => <ProjectCard key={project.id} project={project} />)}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Загрузка...' : 'Ещё'}
        </button>
      )}
    </>
  )
}
```

---

## useQueries

Множественные параллельные запросы.

```typescript
import { useQueries } from '@tanstack/react-query'

const userIds = [1, 2, 3]

const results = useQueries({
  queries: userIds.map((id) => ({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
  })),
  combine: (results) => ({
    data: results.map((r) => r.data),
    isPending: results.some((r) => r.isPending),
  }),
})
```

---

## useIsFetching / useIsMutating

Глобальные индикаторы загрузки.

```typescript
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

function GlobalLoader() {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()

  return (isFetching || isMutating) ? <Spinner /> : null
}

// С фильтром
const isFetchingTodos = useIsFetching({ queryKey: ['todos'] })
```

---

## useMutationState

Доступ к состоянию мутаций.

```typescript
import { useMutationState } from '@tanstack/react-query'

// Все pending мутации
const pendingMutations = useMutationState({
  filters: { status: 'pending' },
  select: (mutation) => mutation.state.variables,
})

// По ключу
const todoMutations = useMutationState({
  filters: { mutationKey: ['createTodo'] },
})
```

---

## queryOptions / infiniteQueryOptions

Типобезопасные опции для переиспользования.

```typescript
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'

// Определение
const todosOptions = queryOptions({
  queryKey: ['todos'],
  queryFn: () => api.getTodos(),
  staleTime: 5 * 60 * 1000,
})

// Использование
const { data } = useQuery(todosOptions)
await queryClient.prefetchQuery(todosOptions)
const cached = queryClient.getQueryData(todosOptions.queryKey)
```
