# SSR/SSG Гидратация

Передача состояния кэша между сервером и клиентом.

## Основные функции

### dehydrate

Сериализует QueryClient в JSON-совместимый объект.

```typescript
import { dehydrate, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Prefetch на сервере
await queryClient.prefetchQuery({
  queryKey: ['todos'],
  queryFn: () => api.getTodos(),
})

// Сериализовать
const dehydratedState = dehydrate(queryClient)
```

### Опции dehydrate

```typescript
const dehydratedState = dehydrate(queryClient, {
  // Какие запросы включать (по умолчанию — только успешные)
  shouldDehydrateQuery: (query) => {
    // Включить все, даже с ошибками
    return true
    // Или только определённые
    return query.queryKey[0] === 'public'
  },

  // Какие мутации включать (по умолчанию — только paused)
  shouldDehydrateMutation: (mutation) => {
    return mutation.state.isPaused
  },

  // Кастомная сериализация (для Date, BigInt, etc.)
  serializeData: (data) => {
    return JSON.parse(JSON.stringify(data))
  },

  // Скрывать ошибки (по умолчанию — все скрыты)
  shouldRedactErrors: (error) => {
    // Показать только публичные ошибки
    return !(error instanceof PublicError)
  },
})
```

### hydrate

Восстанавливает состояние в QueryClient.

```typescript
import { hydrate, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Восстановить на клиенте
hydrate(queryClient, dehydratedState, {
  // Опции гидратации
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },

  // Кастомная десериализация
  deserializeData: (data) => {
    return data
  },
})
```

⚠️ **Важно:** Новые данные перезапишут кэш только если они новее (по `dataUpdatedAt`).

---

## HydrationBoundary

React компонент для гидратации.

```typescript
import { HydrationBoundary } from '@tanstack/react-query'

function App({ dehydratedState }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Main />
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
```

⚠️ Только **queries** можно гидратировать через HydrationBoundary. Мутации — нет.

---

## Next.js App Router

### Паттерн: Server Component → Client Component

```typescript
// app/todos/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { Todos } from './Todos'

export default async function TodosPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Todos />
    </HydrationBoundary>
  )
}
```

```typescript
// app/todos/Todos.tsx (Client Component)
'use client'

import { useQuery } from '@tanstack/react-query'

export function Todos() {
  // Данные уже в кэше после гидратации
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return <TodoList todos={data ?? []} />
}
```

### С Suspense

```typescript
// app/todos/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'

export default async function TodosPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading />}>
        <Todos />
      </Suspense>
    </HydrationBoundary>
  )
}
```

```typescript
// app/todos/Todos.tsx
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'

export function Todos() {
  // Данные гарантированы (Suspense + гидратация)
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return <TodoList todos={data} />
}
```

### Множественные prefetch

```typescript
export default async function DashboardPage() {
  const queryClient = new QueryClient()

  // Параллельные prefetch
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['user'],
      queryFn: getUser,
    }),
    queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: getNotifications,
    }),
    queryClient.prefetchQuery({
      queryKey: ['stats'],
      queryFn: getStats,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  )
}
```

---

## Next.js Pages Router

### getServerSideProps

```typescript
// pages/todos.tsx
import { dehydrate, QueryClient } from '@tanstack/react-query'

export async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

export default function TodosPage() {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  return <TodoList todos={data ?? []} />
}
```

### \_app.tsx

```typescript
// pages/_app.tsx
import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
```

---

## Сериализация

### Проблема с Date

```typescript
// Ошибка: Date не сериализуется в JSON
const data = { createdAt: new Date() }

// После JSON.stringify/parse:
// { createdAt: "2024-01-15T10:30:00.000Z" } — строка, не Date!
```

### Решение: SuperJSON

```typescript
import superjson from 'superjson'

const dehydratedState = dehydrate(queryClient, {
  serializeData: superjson.serialize,
})

hydrate(queryClient, dehydratedState, {
  deserializeData: superjson.deserialize,
})
```

### Решение: Кастомный transformer

```typescript
const transformer = {
  serialize: (data: unknown) => {
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() }
      }
      return value
    })
  },
  deserialize: (data: string) => {
    return JSON.parse(data, (key, value) => {
      if (value?.__type === 'Date') {
        return new Date(value.value)
      }
      return value
    })
  },
}
```

---

## Важные моменты

1. **staleTime** — установи достаточный staleTime, чтобы данные не рефетчились сразу после гидратации:

   ```typescript
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 60 * 1000, // 1 минута
       },
     },
   })
   ```

2. **Один QueryClient на запрос** — на сервере создавай новый QueryClient для каждого запроса:

   ```typescript
   // ✅ Правильно
   export default async function Page() {
     const queryClient = new QueryClient()
     // ...
   }

   // ❌ Неправильно — shared state между пользователями
   const queryClient = new QueryClient()
   export default async function Page() {
     // ...
   }
   ```

3. **Ошибки скрыты по умолчанию** — используй `shouldRedactErrors: () => false` для отладки.
