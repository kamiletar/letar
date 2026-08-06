# IndexedDB

Работа с IndexedDB через idb-keyval для персистентности данных.

## idb-keyval

Простая обёртка над IndexedDB с Promise API.

### Установка

```bash
bun add idb-keyval
```

### Базовый API

```typescript
import { clear, createStore, del, get, keys, set } from 'idb-keyval'

// Запись
await set('key', value)

// Чтение
const data = await get<Type>('key')

// Удаление
await del('key')

// Список ключей
const allKeys = await keys()

// Очистка всего хранилища
await clear()
```

### Кастомный store

```typescript
import { createStore, get, set } from 'idb-keyval'

// Создаём отдельный store для приложения
const customStore = createStore('my-app-db', 'my-store')

await set('key', value, customStore)
const data = await get('key', customStore)
```

---

## IDB Persister для TanStack Query

```typescript
// src/lib/idb-persister.ts
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

const IDB_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(IDB_KEY)
    },
    removeClient: async () => {
      await del(IDB_KEY)
    },
  }
}
```

---

## Глобальное состояние с IndexedDB

Паттерн для данных, не связанных с API (wishlist, сравнение, локальные настройки):

```typescript
// src/hooks/use-wishlist.ts
'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'premium-rosstil-wishlist'

interface WishlistState {
  items: number[]
}

// Глобальное состояние ВНЕ React
let globalState: WishlistState = { items: [] }
const listeners: Set<() => void> = new Set()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

const loadFromStorage = async (): Promise<void> => {
  try {
    const stored = await get<WishlistState>(STORAGE_KEY)
    if (stored) {
      globalState = stored
      notifyListeners()
    }
  } catch (error) {
    console.error('Ошибка загрузки wishlist:', error)
  }
}

const saveToStorage = async (): Promise<void> => {
  try {
    await set(STORAGE_KEY, globalState)
  } catch (error) {
    console.error('Ошибка сохранения wishlist:', error)
  }
}

let initialized = false
const initialize = () => {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    loadFromStorage()
  }
}

export function useWishlist() {
  const [isLoading, setIsLoading] = useState(true)

  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => globalState,
    () => globalState,
  )

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const addItem = useCallback(async (productId: number): Promise<void> => {
    if (globalState.items.includes(productId)) return

    globalState = {
      ...globalState,
      items: [...globalState.items, productId],
    }
    notifyListeners()
    await saveToStorage()
  }, [])

  const removeItem = useCallback(async (productId: number): Promise<void> => {
    globalState = {
      ...globalState,
      items: globalState.items.filter((id) => id !== productId),
    }
    notifyListeners()
    await saveToStorage()
  }, [])

  const toggleItem = useCallback(
    async (productId: number): Promise<void> => {
      if (globalState.items.includes(productId)) {
        await removeItem(productId)
      } else {
        await addItem(productId)
      }
    },
    [addItem, removeItem],
  )

  const isInWishlist = useCallback((productId: number): boolean => {
    return globalState.items.includes(productId)
  }, [])

  return {
    items: state.items,
    isLoading,
    addItem,
    removeItem,
    toggleItem,
    isInWishlist,
    count: state.items.length,
  }
}
```

---

## Storage Quota

### Проверка использования

```typescript
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0, // байты
      quota: estimate.quota || 0, // байты
      percent: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
    }
  }
  return null
}
```

### Persistent Storage

По умолчанию браузер может удалить данные при нехватке места. Для критичных данных:

```typescript
async function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const isPersisted = await navigator.storage.persist()
    console.log(`Persistent storage: ${isPersisted}`)
    return isPersisted
  }
  return false
}
```

### Лимиты браузеров

| Браузер | Лимит                     |
| ------- | ------------------------- |
| Safari  | ~50MB фиксированный       |
| Chrome  | Динамический (% от диска) |
| Firefox | Динамический              |

### LRU Eviction

При приближении к лимиту удаляем старые данные:

```typescript
import { del, get, keys, set } from 'idb-keyval'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

async function setWithTimestamp<T>(key: string, data: T) {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  }
  await set(key, entry)
}

async function evictOldest(maxAge: number) {
  const allKeys = await keys()
  const now = Date.now()

  for (const key of allKeys) {
    const entry = await get<CacheEntry<unknown>>(key)
    if (entry && now - entry.timestamp > maxAge) {
      await del(key)
    }
  }
}
```

---

## Типизация

```typescript
// types/storage.ts
export interface StorageState<T> {
  data: T
  version: number
  updatedAt: number
}

export interface WishlistStorage extends StorageState<number[]> {}

export interface CartStorage extends StorageState<CartItem[]> {}

export interface SettingsStorage extends StorageState<UserSettings> {}
```

---

## Миграции

При изменении структуры данных:

```typescript
const CURRENT_VERSION = 2

async function loadWithMigration<T>(
  key: string,
  migrate: (oldData: unknown, oldVersion: number) => T,
  defaultValue: T,
): Promise<T> {
  const stored = await get<StorageState<unknown>>(key)

  if (!stored) {
    return defaultValue
  }

  if (stored.version < CURRENT_VERSION) {
    const migrated = migrate(stored.data, stored.version)
    await set(key, {
      data: migrated,
      version: CURRENT_VERSION,
      updatedAt: Date.now(),
    })
    return migrated
  }

  return stored.data as T
}
```

---

## См. также

- [tanstack-query-offline.md](tanstack-query-offline.md) — TanStack Query
- [sync-queue.md](sync-queue.md) — Очередь синхронизации
- [hooks.md](hooks.md) — useSyncExternalStore хуки
