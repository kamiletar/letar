# Focus Manager & Online Manager

Управление состоянием фокуса окна и сетевого подключения.

## FocusManager

Отслеживает фокус окна браузера для автоматического рефетча.

### Базовое использование

```typescript
import { focusManager } from '@tanstack/react-query'

// Проверить текущее состояние
const isFocused = focusManager.isFocused()

// Подписаться на изменения
const unsubscribe = focusManager.subscribe((isFocused) => {
  console.log('Window focus changed:', isFocused)
})

// Отписаться
unsubscribe()
```

### Ручное управление

```typescript
// Принудительно установить состояние
focusManager.setFocused(true)
focusManager.setFocused(false)

// Вернуться к автоматическому определению
focusManager.setFocused(undefined)
```

### Кастомный event listener

```typescript
// Кастомная логика определения фокуса
focusManager.setEventListener((handleFocus) => {
  // Подписываемся на visibilitychange вместо focus/blur
  const handleVisibilityChange = () => {
    handleFocus(document.visibilityState === 'visible')
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', handleVisibilityChange)
  }

  // Возвращаем функцию отписки
  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})
```

### React Native

```typescript
import { focusManager } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

// Интеграция с AppState
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active')
  })

  return () => subscription.remove()
})
```

### Отключить refetch on focus глобально

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})
```

---

## OnlineManager

Отслеживает состояние сетевого подключения.

### Базовое использование

```typescript
import { onlineManager } from '@tanstack/react-query'

// Проверить текущее состояние
const isOnline = onlineManager.isOnline()

// Подписаться на изменения
const unsubscribe = onlineManager.subscribe((isOnline) => {
  console.log('Online status changed:', isOnline)
})
```

### Ручное управление

```typescript
// Принудительно установить состояние
onlineManager.setOnline(true)
onlineManager.setOnline(false)
```

### React Native с NetInfo

```typescript
import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

// Интеграция с NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

### Показать индикатор offline

```typescript
import { useIsOnline } from './hooks/useIsOnline'

function App() {
  const isOnline = useIsOnline()

  return (
    <>
      {!isOnline && (
        <Banner variant="warning">
          Нет подключения к интернету
        </Banner>
      )}
      <Main />
    </>
  )
}

// hooks/useIsOnline.ts
import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

export function useIsOnline() {
  return useSyncExternalStore(
    onlineManager.subscribe,
    () => onlineManager.isOnline(),
    () => true, // SSR fallback
  )
}
```

---

## Network Mode

Настройка поведения запросов в зависимости от состояния сети.

### Опции

| Режим              | Описание                                                 |
| ------------------ | -------------------------------------------------------- |
| `online` (default) | Запросы выполняются только при наличии сети              |
| `always`           | Запросы всегда выполняются                               |
| `offlineFirst`     | Сначала пробует выполнить, при ошибке переходит в paused |

### Использование

```typescript
// Глобально
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

// Для конкретного запроса
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  networkMode: 'always', // Работает даже offline (например, из IndexedDB)
})
```

### fetchStatus

При использовании network mode появляется дополнительный статус:

```typescript
const { data, status, fetchStatus } = useQuery({...})

// status: 'pending' | 'error' | 'success'
// fetchStatus: 'fetching' | 'paused' | 'idle'

// paused = ждёт восстановления сети
```

---

## Паттерн: Offline-first PWA

```typescript
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

// Persister для localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 часа
      staleTime: 1000 * 60 * 5, // 5 минут
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Возобновить паузированные мутации после восстановления
        queryClient.resumePausedMutations()
      }}
    >
      <Main />
    </PersistQueryClientProvider>
  )
}
```
