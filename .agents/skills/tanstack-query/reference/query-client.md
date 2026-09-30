# QueryClient API

QueryClient — центральный хаб для управления серверным состоянием в TanStack Query.

## Конструктор

```typescript
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  queryCache: new QueryCache(), // Кэш запросов
  mutationCache: new MutationCache(), // Кэш мутаций
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Время до "устаревания"
      gcTime: 5 * 60 * 1000, // Время жизни в кэше
      refetchOnWindowFocus: false,
      retry: 3,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

## Fetching методы

### fetchQuery

Асинхронно получает данные и кэширует. Возвращает данные или выбрасывает ошибку.

```typescript
const data = await queryClient.fetchQuery({
  queryKey: ['todo', id],
  queryFn: () => api.getTodo(id),
  staleTime: 5000, // Не рефетчить если данные свежие
})
```

### prefetchQuery

Предзагрузка без возврата данных. Не выбрасывает ошибки.

```typescript
await queryClient.prefetchQuery({
  queryKey: ['todos'],
  queryFn: () => api.getTodos(),
})
```

### fetchInfiniteQuery / prefetchInfiniteQuery

То же для infinite queries:

```typescript
const infiniteData = await queryClient.fetchInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => api.getProjects(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

## Data методы

### getQueryData

Синхронно получает данные из кэша:

```typescript
const todos = queryClient.getQueryData(['todos'])
// undefined если нет в кэше
```

### setQueryData

Синхронно обновляет кэш (для optimistic updates):

```typescript
// Прямое значение
queryClient.setQueryData(['todo', id], newTodo)

// Функция-апдейтер (для immutable обновлений)
queryClient.setQueryData(['todos'], (old) => (old ? [...old, newTodo] : [newTodo]))
```

⚠️ **Важно:** Всегда используй immutable обновления!

### ensureQueryData

Получает из кэша или фетчит если нет:

```typescript
const data = await queryClient.ensureQueryData({
  queryKey: ['todo', id],
  queryFn: () => api.getTodo(id),
  revalidateIfStale: true, // Рефетч если устарели
})
```

### getQueriesData

Получает данные нескольких запросов:

```typescript
const allTodos = queryClient.getQueriesData({
  queryKey: ['todos'], // Частичное совпадение
})
// Возвращает: [[queryKey1, data1], [queryKey2, data2], ...]
```

### getQueryState

Полное состояние запроса:

```typescript
const state = queryClient.getQueryState(['todo', id])
// { data, dataUpdatedAt, error, status, fetchStatus, ... }
```

## Management методы

### invalidateQueries

Помечает запросы как устаревшие и рефетчит:

```typescript
// Все todos
await queryClient.invalidateQueries({ queryKey: ['todos'] })

// С фильтрами
await queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'active', // 'active' | 'inactive' | 'all' | 'none'
})

// Точное совпадение ключа
await queryClient.invalidateQueries({
  queryKey: ['todo', id],
  exact: true,
})

// С предикатом
await queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'todos',
})
```

**refetchType:**

- `active` (default) — только активные (используемые компонентами)
- `inactive` — только неактивные
- `all` — все
- `none` — не рефетчить, только пометить устаревшими

### refetchQueries

Принудительный рефетч:

```typescript
await queryClient.refetchQueries({ queryKey: ['todos'] })
```

### cancelQueries

Отмена текущих запросов (для optimistic updates):

```typescript
await queryClient.cancelQueries({ queryKey: ['todos'] })
```

### removeQueries

Удаление из кэша:

```typescript
queryClient.removeQueries({ queryKey: ['todos'] })
```

### resetQueries

Сброс к начальному состоянию:

```typescript
await queryClient.resetQueries({ queryKey: ['todos'] })
```

## Status методы

### isFetching / isMutating

Количество активных запросов/мутаций:

```typescript
const fetchingCount = queryClient.isFetching()
const fetchingTodos = queryClient.isFetching({ queryKey: ['todos'] })

const mutatingCount = queryClient.isMutating()
```

## Config методы

### setDefaultOptions

Динамическое изменение дефолтов:

```typescript
queryClient.setDefaultOptions({
  queries: {
    staleTime: Infinity,
  },
})
```

### setQueryDefaults / setMutationDefaults

Дефолты для конкретных ключей:

```typescript
queryClient.setQueryDefaults(['todos'], {
  staleTime: 60 * 1000,
  refetchInterval: 30 * 1000,
})

queryClient.setMutationDefaults(['createTodo'], {
  retry: 3,
})
```

## Cache методы

### getQueryCache / getMutationCache

Доступ к кэшам:

```typescript
const queryCache = queryClient.getQueryCache()
const mutationCache = queryClient.getMutationCache()
```

### clear

Полная очистка:

```typescript
queryClient.clear()
```

## Utility методы

### resumePausedMutations

Возобновление мутаций после восстановления сети:

```typescript
await queryClient.resumePausedMutations()
```

## Типичные паттерны

### После мутации — инвалидация

```typescript
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Optimistic update

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    const previous = queryClient.getQueryData(['todos'])

    queryClient.setQueryData(['todos'], (old) => old?.map((t) => (t.id === newTodo.id ? newTodo : t)))

    return { previous }
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```
