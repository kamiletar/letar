# React Suspense интеграция

Хуки для использования с React Suspense.

## useSuspenseQuery

Suspense-версия useQuery. Гарантирует наличие `data`.

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

function Todos() {
  // data ВСЕГДА определён (не undefined)
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => api.getTodos(),
  })

  return (
    <ul>
      {data.map((todo) => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  )
}

// Обёртка с Suspense
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Todos />
    </Suspense>
  )
}
```

### Отличия от useQuery

| Свойство          | useQuery                      | useSuspenseQuery           |
| ----------------- | ----------------------------- | -------------------------- |
| `data`            | `TData \| undefined`          | `TData` (гарантирован)     |
| `enabled`         | ✅                            | ❌ не поддерживается       |
| `placeholderData` | ✅                            | ❌ не поддерживается       |
| `throwOnError`    | опционально                   | всегда true                |
| `status`          | `pending \| success \| error` | только `success` или throw |

### Важно

- **Нет `enabled`** — запрос всегда выполняется
- **Нет `placeholderData`** — используй `initialData` или Suspense fallback
- **Не работает cancel** — отмена запроса не поддерживается

---

## useSuspenseInfiniteQuery

Suspense-версия useInfiniteQuery.

```typescript
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'

function Projects() {
  const { data, fetchNextPage, hasNextPage } = useSuspenseInfiniteQuery({
    queryKey: ['projects'],
    queryFn: ({ pageParam }) => api.getProjects(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  const projects = data.pages.flatMap((page) => page.items)

  return (
    <>
      {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
      {hasNextPage && <button onClick={() => fetchNextPage()}>Load more</button>}
    </>
  )
}
```

---

## useSuspenseQueries

Suspense-версия useQueries для множественных запросов.

```typescript
import { useSuspenseQueries } from '@tanstack/react-query'

function UserProfiles({ userIds }: { userIds: string[] }) {
  const results = useSuspenseQueries({
    queries: userIds.map((id) => ({
      queryKey: ['user', id],
      queryFn: () => api.getUser(id),
    })),
  })

  // Все данные гарантированно есть
  return (
    <ul>
      {results.map((result, index) => <li key={userIds[index]}>{result.data.name}</li>)}
    </ul>
  )
}
```

---

## usePrefetchQuery

Prefetch перед Suspense boundary.

```typescript
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query'

function App() {
  // Prefetch ДО suspense boundary
  usePrefetchQuery({
    queryKey: ['todos'],
    queryFn: () => api.getTodos(),
  })

  return (
    <Suspense fallback={<Spinner />}>
      <Todos />
    </Suspense>
  )
}

function Todos() {
  // Данные уже в кэше, Suspense не сработает
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => api.getTodos(),
  })

  return <TodoList todos={data} />
}
```

---

## QueryErrorResetBoundary

Сброс ошибок для ErrorBoundary при использовании `throwOnError` или Suspense.

```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Ошибка: {error.message}</p>
              <button onClick={resetErrorBoundary}>
                Попробовать снова
              </button>
            </div>
          )}
        >
          <Suspense fallback={<Spinner />}>
            <Todos />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

### useQueryErrorResetBoundary

Хук-версия для доступа к `reset`:

```typescript
import { useQueryErrorResetBoundary } from '@tanstack/react-query'

function ErrorFallback({ error, resetErrorBoundary }) {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <button
      onClick={() => {
        reset()
        resetErrorBoundary()
      }}
    >
      Retry
    </button>
  )
}
```

---

## Паттерн: Server Component → Client Component

Для Next.js App Router с Suspense:

```typescript
// app/todos/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function TodosPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: () => api.getTodos(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Spinner />}>
        <Todos />
      </Suspense>
    </HydrationBoundary>
  )
}

// components/Todos.tsx (Client Component)
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'

export function Todos() {
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => api.getTodos(),
  })

  return <TodoList todos={data} />
}
```

---

## Streaming с Suspense

Экспериментальная функция для streaming данных:

```typescript
import { experimental_streamedQuery as streamedQuery } from '@tanstack/react-query'

const query = queryOptions({
  queryKey: ['chat'],
  queryFn: streamedQuery({
    streamFn: fetchChatStream,
    refetchMode: 'reset', // 'reset' | 'append' | 'replace'
  }),
})

function Chat() {
  const { data, isFetching } = useQuery(query)

  return (
    <div>
      {data?.map((message) => <Message key={message.id} {...message} />)}
      {isFetching && <TypingIndicator />}
    </div>
  )
}
```
