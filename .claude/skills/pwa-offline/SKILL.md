---
name: pwa-offline
description: |
  PWA offline-first архитектура. Используй при:
  - Настройке Service Worker (Serwist)
  - Интеграции TanStack Query с IndexedDB
  - Работе с useOfflineForm, useSyncQueue
  - Создании оффлайн-форм с автосинхронизацией
  - Добавлении UI индикаторов статуса сети
---

# PWA Offline

Руководство по PWA offline-first архитектуре.

## Когда использовать

- Настройка Service Worker для кэширования
- Интеграция TanStack Query с IndexedDB персистентностью
- Работа с `@letar/forms/offline` (useOfflineForm, useSyncQueue)
- Создание оффлайн-форм с автосинхронизацией
- Добавление UI индикаторов статуса сети

---

## Quick Reference

### Стратегии кэширования

| Тип ресурса       | Стратегия              | Причина                              |
| ----------------- | ---------------------- | ------------------------------------ |
| HTML страницы     | Network First          | Актуальный контент, fallback из кэша |
| Статика (JS, CSS) | Cache First            | Редко меняется, быстрая загрузка     |
| Изображения       | Stale While Revalidate | Показать сразу, обновить в фоне      |
| API запросы       | TanStack Query         | Управляется React Query              |

### QueryClient с оффлайн настройками

```typescript
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 24 * 60 * 60 * 1000, // 24 часа (>= maxAge persister!)
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
})
```

### useOfflineForm паттерн

```typescript
import { useAppForm } from '@letar/forms'
import { useOfflineForm } from '@letar/forms/offline'

const { submit, isOffline, pendingCount } = useOfflineForm<FormData>({
  actionType: 'UPDATE_PROFILE',
  onlineSubmit: async (value) => {
    const result = await updateProfileAction(value)
    return result.success ? { success: true } : { success: false, error: result.error }
  },
  onSuccess: () => toaster.success({ title: 'Сохранено' }),
  onQueued: () => toaster.info({ title: 'Сохранено локально' }),
})

const form = useAppForm({
  defaultValues: initialData,
  onSubmit: async ({ value }) => await submit(value),
})
```

### useOnlineStatus (useSyncExternalStore)

```typescript
import { useSyncExternalStore } from 'react'

export function useOnlineStatus() {
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
    () => true // SSR fallback
  )
}
```

### IDB Persister

```typescript
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

const IDB_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client) => await set(IDB_KEY, client),
    restoreClient: async () => await get<PersistedClient>(IDB_KEY),
    removeClient: async () => await del(IDB_KEY),
  }
}
```

---

## Ключевые зависимости

```bash
# TanStack Query v5
bun add @tanstack/react-query @tanstack/react-query-persist-client

# ZenStack TanStack плагин
bun add @zenstackhq/tanstack-query

# IndexedDB
bun add idb-keyval
```

---

## Reference файлы

| Файл                                                               | Содержание                           |
| ------------------------------------------------------------------ | ------------------------------------ |
| [overview.md](reference/overview.md)                               | Архитектура PWA offline-first        |
| [service-worker.md](reference/service-worker.md)                   | SW стратегии кэширования             |
| [tanstack-query-offline.md](reference/tanstack-query-offline.md)   | TanStack Query + persistQueryClient  |
| [indexeddb.md](reference/indexeddb.md)                             | IndexedDB с idb-keyval               |
| [form-components-offline.md](reference/form-components-offline.md) | useOfflineForm, useSyncQueue         |
| [sync-queue.md](reference/sync-queue.md)                           | Очередь синхронизации                |
| [hooks.md](reference/hooks.md)                                     | useOnlineStatus, usePendingMutations |
| [ui-components.md](reference/ui-components.md)                     | OnlineStatus, SyncStatus             |
| [testing.md](reference/testing.md)                                 | DevTools, чеклисты                   |

---

## См. также

- `.claude/docs/pwa-offline.md` — основная документация проекта
- `libs/forms/src/lib/offline/` — реализация оффлайн хуков
- `apps/driving-school/` — примеры использования
