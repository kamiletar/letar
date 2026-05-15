# TanStack Query Offline

Настройка TanStack Query для работы в оффлайн режиме с персистентностью в IndexedDB.

## QueryClient с оффлайн настройками

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 24 * 60 * 60 * 1000, // 24 часа
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
})
```

### Network Mode опции

| Mode           | Поведение                                       |
| -------------- | ----------------------------------------------- |
| `online`       | Запросы только онлайн (по умолчанию)            |
| `always`       | Запросы всегда выполняются                      |
| `offlineFirst` | Сначала кэш, потом сеть (рекомендуется для PWA) |

---

## PersistQueryClientProvider

```tsx
// src/app/_components/providers/query-provider.tsx
'use client'

import { createIDBPersister } from '@/lib/idb-persister'
import { queryClient } from '@/lib/query-client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Provider as ZenStackProvider } from '@zenstackhq/tanstack-query/runtime/react'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [persister] = useState(() => createIDBPersister())

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        buster: process.env.NEXT_PUBLIC_BUILD_ID,
      }}
      onSuccess={() => {
        // Возобновить приостановленные мутации после восстановления кэша
        queryClient.resumePausedMutations()
      }}
    >
      <ZenStackProvider value={{ endpoint: '/api/model' }}>{children}</ZenStackProvider>
    </PersistQueryClientProvider>
  )
}
```

### Важно: gcTime >= maxAge

`gcTime` должен быть **равен или больше** `maxAge` persister'а. Иначе garbage collection удалит кэш раньше, чем истечёт срок персистентности.

```typescript
// ✅ Правильно
queries: {
  gcTime: 24 * 60 * 60 * 1000
} // 24 часа
persistOptions: {
  maxAge: 24 * 60 * 60 * 1000
} // 24 часа

// ❌ Неправильно — GC удалит раньше
queries: {
  gcTime: 60 * 60 * 1000
} // 1 час
persistOptions: {
  maxAge: 24 * 60 * 60 * 1000
} // 24 часа
```

---

## setMutationDefaults (критично!)

**Без `setMutationDefaults` мутации не могут быть возобновлены после перезагрузки страницы.**

При персистентности в IndexedDB сохраняется только состояние мутаций, но не функции (`mutationFn`). Поэтому нужно определить дефолтные функции:

```typescript
// src/lib/mutation-defaults.ts
import { api } from './api'
import { queryClient } from './query-client'

// Устанавливаем при инициализации приложения
export function setupMutationDefaults() {
  // Обновление профиля
  queryClient.setMutationDefaults(['updateProfile'], {
    mutationFn: (data: ProfileData) => api.updateProfile(data),
  })

  // Добавление в корзину
  queryClient.setMutationDefaults(['addToCart'], {
    mutationFn: (data: CartItemData) => api.addToCart(data),
  })

  // Создание заказа
  queryClient.setMutationDefaults(['createOrder'], {
    mutationFn: (data: OrderData) => api.createOrder(data),
  })
}
```

```tsx
// src/app/_components/providers/query-provider.tsx
import { setupMutationDefaults } from '@/lib/mutation-defaults'

// Вызываем при инициализации
setupMutationDefaults()
```

---

## Использование с ZenStack

```tsx
'use client'

import { useCreateCartItem, useFindManyProduct } from '@/generated/hooks'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function ProductList({ categorySlug }: { categorySlug: string }) {
  const isOnline = useOnlineStatus()

  // Данные из IndexedDB когда оффлайн
  const { data: products, isStale } = useFindManyProduct({
    where: { category: { slug: categorySlug }, isPublished: true },
    include: { images: true, sizes: true },
  })

  // Мутация с optimistic update
  const { mutate: addToCart } = useCreateCartItem()

  const handleAddToCart = (productId: number, sizeId: number) => {
    addToCart({
      data: { productId, sizeId, quantity: 1 },
    })
    // UI обновится сразу, синхронизация при возврате онлайн
  }

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      {isStale && <StaleDataBanner />}
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
      ))}
    </div>
  )
}
```

---

## Prefetch при hover

```tsx
'use client'

import { useQueryClient } from '@tanstack/react-query'

export function ProductCardWithPrefetch({ product }: { product: Product }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    // Prefetch данные товара
    queryClient.prefetchQuery({
      queryKey: ['Product', 'findUnique', { where: { slug: product.slug } }],
      queryFn: () =>
        fetch(
          `/api/model/product/findUnique?q=${JSON.stringify({
            where: { slug: product.slug },
            include: { images: true, sizes: true },
          })}`
        ).then((r) => r.json()),
      staleTime: 5 * 60 * 1000,
    })

    // Prefetch изображения через SW
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_IMAGES',
        urls: product.images.slice(0, 2),
      })
    }
  }

  return <Card onMouseEnter={handleMouseEnter}>{/* ... */}</Card>
}
```

---

## Optimistic Updates

```typescript
const { mutate } = useCreateCartItem({
  onMutate: async (newItem) => {
    // Отменяем текущие запросы
    await queryClient.cancelQueries({ queryKey: ['CartItem'] })

    // Сохраняем предыдущее состояние
    const previousCart = queryClient.getQueryData(['CartItem', 'findMany'])

    // Оптимистично обновляем
    queryClient.setQueryData(['CartItem', 'findMany'], (old: CartItem[]) => [
      ...old,
      { ...newItem.data, id: 'temp-' + Date.now() },
    ])

    return { previousCart }
  },
  onError: (err, newItem, context) => {
    // Откатываем при ошибке
    queryClient.setQueryData(['CartItem', 'findMany'], context?.previousCart)
  },
  onSettled: () => {
    // Инвалидируем для получения актуальных данных
    queryClient.invalidateQueries({ queryKey: ['CartItem'] })
  },
})
```

---

## Cache Busting

Параметр `buster` в `persistOptions` позволяет инвалидировать весь кэш при деплое новой версии:

```typescript
persistOptions={{
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: process.env.NEXT_PUBLIC_BUILD_ID, // или version из package.json
}}
```

Если `buster` изменился — весь кэш удаляется и загружается заново.

---

## Типы

```typescript
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

interface Persister {
  persistClient(client: PersistedClient): Promise<void>
  restoreClient(): Promise<PersistedClient | undefined>
  removeClient(): Promise<void>
}

interface PersistedClient {
  timestamp: number
  buster: string
  clientState: DehydratedState
}
```

---

## См. также

- [indexeddb.md](indexeddb.md) — IDB Persister
- [form-components-offline.md](form-components-offline.md) — Оффлайн формы
- [hooks.md](hooks.md) — usePendingMutations
