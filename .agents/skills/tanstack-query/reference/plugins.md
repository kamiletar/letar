# Плагины

Расширения для TanStack Query.

## persistQueryClient

Сохранение кэша в localStorage/IndexedDB для offline-first приложений.

### Установка

```bash
bun add @tanstack/query-persist-client-core
bun add @tanstack/query-async-storage-persister
# или
bun add @tanstack/query-sync-storage-persister  # deprecated
```

### Базовое использование

```typescript
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 часа (должен быть >= maxAge)
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: localStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
})

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 часа
      }}
    >
      <Main />
    </PersistQueryClientProvider>
  )
}
```

### Опции persister

```typescript
createAsyncStoragePersister({
  storage: localStorage, // Storage API
  key: 'REACT_QUERY_OFFLINE_CACHE', // Ключ в storage
  throttleTime: 1000, // Throttle записи (ms)

  // Кастомная сериализация
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),

  // Retry при ошибках
  retry: removeOldestQuery,
})
```

### Опции persist

```typescript
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 1000 * 60 * 60 * 24, // Максимальный возраст кэша

    // Cache buster (меняй при breaking changes)
    buster: 'v1',

    // Какие queries сохранять
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        return query.queryKey[0] !== 'sensitive'
      },
    },
  }}
  onSuccess={() => {
    // После успешного восстановления
    queryClient.resumePausedMutations()
  }}
>
```

### Ручное управление

```typescript
import {
  persistQueryClient,
  persistQueryClientRestore,
  persistQueryClientSave,
  persistQueryClientSubscribe,
} from '@tanstack/query-persist-client-core'

// Полный цикл (restore + subscribe)
const unsubscribe = persistQueryClient({
  queryClient,
  persister,
})

// Только restore
await persistQueryClientRestore({ queryClient, persister })

// Только save
await persistQueryClientSave({ queryClient, persister })

// Подписка на изменения
const unsubscribe = persistQueryClientSubscribe({ queryClient, persister })
```

### useIsRestoring

Проверка статуса восстановления:

```typescript
import { useIsRestoring } from '@tanstack/react-query'

function App() {
  const isRestoring = useIsRestoring()

  if (isRestoring) {
    return <SplashScreen />
  }

  return <Main />
}
```

### Важно

⚠️ **gcTime >= maxAge** — иначе данные будут удалены раньше, чем истечёт срок хранения.

⚠️ **Не сохраняй чувствительные данные** — используй `shouldDehydrateQuery` для фильтрации.

---

## broadcastQueryClient

Синхронизация кэша между вкладками браузера.

⚠️ **Experimental** — может измениться в minor/patch версиях.

### Установка

```bash
bun add @tanstack/query-broadcast-client-experimental
```

### Использование

```typescript
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

// Включить синхронизацию
broadcastQueryClient({
  queryClient,
  broadcastChannel: 'my-app', // Имя канала
})
```

### Как работает

1. При изменении кэша в одной вкладке — изменения передаются в другие
2. Использует BroadcastChannel API
3. Работает только в одном origin (same-origin policy)

### Пример: Real-time уведомления

```typescript
// Во всех вкладках будет одинаковое количество уведомлений
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
})

// При инвалидации в одной вкладке — рефетч во всех
queryClient.invalidateQueries({ queryKey: ['notifications'] })
```

---

## Паттерн: Offline-first PWA

Комбинация persist + broadcast + online manager:

```typescript
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 часа
      staleTime: 1000 * 60 * 5, // 5 минут
      networkMode: 'offlineFirst',
      retry: 2,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 2,
    },
  },
})

// Синхронизация между вкладками
broadcastQueryClient({
  queryClient,
  broadcastChannel: 'my-pwa',
})

const persister = createAsyncStoragePersister({
  storage: localStorage,
})

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: 'v1',
      }}
      onSuccess={() => {
        // Возобновить паузированные мутации
        queryClient.resumePausedMutations().then(() => {
          // Синхронизировать с сервером
          queryClient.invalidateQueries()
        })
      }}
    >
      <Main />
    </PersistQueryClientProvider>
  )
}
```

---

## createPersister (Advanced)

Создание кастомного persister:

```typescript
import { experimental_createPersister } from '@tanstack/query-persist-client-core'

const persister = experimental_createPersister({
  // Storage для queries
  storage: {
    getItem: async (key) => {
      const data = await myDB.get(key)
      return data ?? null
    },
    setItem: async (key, value) => {
      await myDB.set(key, value)
    },
    removeItem: async (key) => {
      await myDB.delete(key)
    },
  },

  // Serialize/deserialize
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),

  // Prefix для ключей
  prefix: 'rq-',

  // Максимальное количество queries
  maxAge: 1000 * 60 * 60 * 24,

  // Фильтрация
  filters: {
    predicate: (query) => query.queryKey[0] !== 'temp',
  },
})
```

---

## IndexedDB Persister

Для больших объёмов данных:

```typescript
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

const persister = createAsyncStoragePersister({
  storage: {
    getItem: get,
    setItem: set,
    removeItem: del,
  },
})
```

Или с idb:

```typescript
import { openDB } from 'idb'

const db = await openDB('query-cache', 1, {
  upgrade(db) {
    db.createObjectStore('queries')
  },
})

const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => db.get('queries', key),
    setItem: (key, value) => db.put('queries', value, key),
    removeItem: (key) => db.delete('queries', key),
  },
})
```
