---
name: tanstack-query
description: |
  TanStack Query для серверного состояния. Используй при:
  - Настройке QueryClient и провайдера
  - Работе с useQuery, useMutation, useInfiniteQuery
  - Управлении кэшем и инвалидации
  - SSR/SSG гидратации
  - Optimistic updates
  - Интеграции с ZenStack хуками
---

# TanStack Query

TanStack Query для управления серверным состоянием в React приложениях.

## Когда использовать

- Настройка QueryClient и провайдера
- Работа с хуками (useQuery, useMutation, useInfiniteQuery)
- Управление кэшем и инвалидация
- SSR/SSG гидратация
- Optimistic updates
- Offline support

## Важно

**В ZenStack v3 хуки — не кодогенерация, а runtime:** `useClientQueries(schema)` из
`@zenstackhq/tanstack-query/react` (каталога `@/generated/hooks` нет).

Для CRUD операций бери хуки у клиента по модели:

- `client.order.useFindMany(args, options)`, `useFindUnique` — запросы
- `client.order.useCreate()`, `useUpdate()`, `useDelete()` — мутации
- `client.order.useInfiniteFindMany(args, options)` — бесконечный скролл

В приложениях клиент обычно обёрнут в `src/lib/hooks.ts` (образец — `apps/driving-school/src/lib/hooks.ts`):
`useFindManyOrder(args, options)`.

См. `zenstack-helper/reference/tanstack-query.md` для полной документации ZenStack хуков.

## Этот скилл для:

1. **Кастомизации** ZenStack-хуков (staleTime, enabled, select)
2. **Ручных запросов** когда ZenStack не подходит
3. **Продвинутых паттернов** (prefetch, hydration, persist)
4. **Управления кэшем** (invalidation, optimistic updates)

## Reference файлы

- `reference/query-client.md` — QueryClient API
- `reference/hooks.md` — useQuery, useMutation, useInfiniteQuery
- `reference/suspense.md` — useSuspenseQuery, ErrorBoundary
- `reference/cache-management.md` — QueryCache, invalidation
- `reference/managers.md` — focusManager, onlineManager
- `reference/hydration.md` — SSR/SSG: dehydrate, hydrate
- `reference/plugins.md` — persist, broadcast
- `reference/eslint.md` — ESLint plugin rules
- `reference/zenstack-integration.md` — Интеграция с ZenStack

## Быстрый старт

### Провайдер

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

### Кастомизация ZenStack хуков

```typescript
import { useFindManyOrder } from '@/lib/hooks' // обёртка над client.order.useFindMany

const { data, isLoading } = useFindManyOrder(
  { where: { status: 'PENDING' } },
  {
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchInterval: 30 * 1000, // Каждые 30 сек
    enabled: isAuthenticated, // Условный запрос
    select: (data) => data.filter((o) => o.total > 100),
  },
)
```

### Инвалидация после мутации

```typescript
import { schema } from '@/generated/schema'
import { useQueryClient } from '@tanstack/react-query'
import { useClientQueries } from '@zenstackhq/tanstack-query/react'

function CreateOrderButton() {
  const queryClient = useQueryClient()
  const client = useClientQueries(schema)
  const createOrder = client.order.useCreate({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Order'] })
    },
  })
  // ...
}
```
