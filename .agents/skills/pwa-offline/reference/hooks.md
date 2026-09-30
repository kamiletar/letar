# Hooks

Хуки для оффлайн-функциональности.

## useOfflineStatus

Определяет текущий статус соединения через `navigator.onLine` и события `online`/`offline`.

```typescript
import { useOfflineStatus } from '@letar/forms/offline'

function MyComponent() {
  const isOffline = useOfflineStatus()

  return (
    <div>
      {isOffline ? <Badge colorPalette="orange">Оффлайн</Badge> : <Badge colorPalette="green">Онлайн</Badge>}
    </div>
  )
}
```

### Реализация

Использует `useSyncExternalStore` для реактивности и синхронизации между вкладками:

```typescript
import { useSyncExternalStore } from 'react'

export function useOfflineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => {
      // Подписка на события браузера
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => !navigator.onLine, // Клиентское значение
    () => false, // SSR fallback (считаем онлайн)
  )
}
```

### Глобальное состояние

Состояние синхронизируется между всеми компонентами автоматически — при изменении статуса обновляются все подписчики.

---

## useOnlineStatus (альтернатива)

Более простой хук для определения онлайн статуса (возвращает `true` если онлайн):

```typescript
import { useSyncExternalStore } from 'react'

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => navigator.onLine,
    () => true, // SSR fallback
  )
}
```

---

## usePendingMutations

Подсчёт ожидающих мутаций TanStack Query:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export function usePendingMutations(): number {
  const queryClient = useQueryClient()

  return useSyncExternalStore(
    (callback) => {
      // Подписка на изменения mutation cache
      return queryClient.getMutationCache().subscribe(callback)
    },
    () => {
      return queryClient
        .getMutationCache()
        .getAll()
        .filter((m) => m.state.status === 'pending').length
    },
    () => 0, // SSR fallback
  )
}
```

### Использование

```tsx
function SyncIndicator() {
  const pendingCount = usePendingMutations()
  const isOnline = useOnlineStatus()

  if (pendingCount === 0) {
    return null
  }

  return (
    <Badge colorPalette={isOnline ? 'blue' : 'orange'}>
      {isOnline ? 'Синхронизация...' : `Ожидает: ${pendingCount}`}
    </Badge>
  )
}
```

---

## useNetworkQuality

Определение качества сети через Network Information API:

```typescript
type NetworkQuality = 'fast' | 'slow' | 'offline'

export function useNetworkQuality(): NetworkQuality {
  return useSyncExternalStore(
    (callback) => {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', callback)
        return () => connection.removeEventListener('change', callback)
      }

      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => {
      if (!navigator.onLine) { return 'offline' }

      const connection = (navigator as any).connection
      if (connection) {
        // effectiveType: '4g', '3g', '2g', 'slow-2g'
        const type = connection.effectiveType
        if (type === '4g') { return 'fast' }
        if (type === '3g') { return 'slow' }
        return 'slow' // 2g, slow-2g
      }

      return 'fast' // Fallback
    },
    () => 'fast', // SSR fallback
  )
}
```

### Использование

```tsx
function DataFetcher() {
  const quality = useNetworkQuality()

  // Адаптивная загрузка
  const imageQuality = quality === 'fast' ? 'high' : 'low'

  return <Image src={`/product.jpg?quality=${imageQuality}`} alt="Product" />
}
```

---

## useSWMessages

Получение сообщений от Service Worker:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useSWMessages() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      switch (event.data.type) {
        case 'INVALIDATE_PRODUCTS':
          queryClient.invalidateQueries({ queryKey: ['Product'] })
          break
        case 'INVALIDATE_ORDERS':
          queryClient.invalidateQueries({ queryKey: ['Order'] })
          break
        case 'NEW_VERSION':
          // Показать уведомление о новой версии
          break
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [queryClient])
}
```

### Использование в layout

```tsx
// app/layout.tsx
'use client'

import { useSWMessages } from '@/hooks/use-sw-messages'

export default function RootLayout({ children }) {
  useSWMessages() // Подписка на SW сообщения

  return <html>{children}</html>
}
```

---

## useStorageQuota

Мониторинг использования хранилища:

```typescript
interface StorageQuota {
  used: number // байты
  quota: number // байты
  percent: number // 0-100
}

export function useStorageQuota(): StorageQuota | null {
  const [quota, setQuota] = useState<StorageQuota | null>(null)

  useEffect(() => {
    async function check() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        setQuota({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          percent: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
        })
      }
    }

    check()
    const interval = setInterval(check, 60000) // Проверка каждую минуту

    return () => clearInterval(interval)
  }, [])

  return quota
}
```

---

## Паттерн useSyncExternalStore

Все хуки используют `useSyncExternalStore` для:

1. **Реактивности** — автообновление при изменениях
2. **SSR** — безопасный fallback для серверного рендеринга
3. **Синхронизации** — единое состояние между компонентами

```typescript
useSyncExternalStore(
  subscribe, // Подписка на изменения
  getSnapshot, // Получение текущего значения (клиент)
  getServerSnapshot, // Получение значения (SSR)
)
```

---

## См. также

- [form-components-offline.md](form-components-offline.md) — useOfflineForm
- [sync-queue.md](sync-queue.md) — useSyncQueue
- [ui-components.md](ui-components.md) — Компоненты индикации
