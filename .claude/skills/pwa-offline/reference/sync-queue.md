# Sync Queue

Очередь синхронизации для оффлайн-действий с персистентностью в IndexedDB.

## Структура данных

### SyncQueueItem

```typescript
interface SyncQueueItem {
  id: string // Уникальный ID (timestamp + random)
  action: SyncAction // { type, payload }
  createdAt: number // Timestamp создания
  attempts: number // Количество попыток (начинается с 0)
  maxAttempts: number // Максимум попыток (по умолчанию 3)
  status: SyncItemStatus // 'PENDING' | 'SYNCED' | 'FAILED'
  error?: string // Сообщение об ошибке
}

interface SyncAction {
  type: SyncActionType // Тип действия
  payload: Record<string, unknown> // Данные формы
}

type SyncItemStatus = 'PENDING' | 'SYNCED' | 'FAILED'
```

---

## useSyncQueue

Хук для работы с очередью синхронизации.

```typescript
import { useSyncQueue } from '@letar/forms/offline'

function MyComponent() {
  const {
    queue, // SyncQueueItem[] — все элементы
    queueLength, // number — общее количество
    pendingCount, // number — только PENDING
    isLoading, // boolean — загрузка из IndexedDB
    isProcessing, // boolean — обработка очереди
    addAction, // (action) => Promise<SyncQueueItem>
    removeAction, // (id) => Promise<boolean>
    processQueue, // (handler) => Promise<ProcessQueueResult[]>
  } = useSyncQueue()
}
```

### Добавление действия

```typescript
const handleBookLesson = async (slotId: string) => {
  if (isOffline) {
    const item = await addAction({
      type: 'BOOK_LESSON',
      payload: { slotId },
    })
    console.log('Добавлено в очередь:', item.id)
    toaster.info({ title: 'Действие сохранено для синхронизации' })
  } else {
    await api.bookLesson(slotId)
  }
}
```

### Обработка очереди

```typescript
useEffect(() => {
  if (!isOffline && pendingCount > 0 && !isProcessing) {
    processQueue(async (action) => {
      switch (action.type) {
        case 'BOOK_LESSON':
          return await api.bookLesson(action.payload.slotId)
        case 'UPDATE_PROFILE':
          return await api.updateProfile(action.payload)
        default:
          return { success: true } // Пропускаем неизвестные
      }
    }).then((results) => {
      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        console.warn(`${failed.length} действий не синхронизировано`)
      }
    })
  }
}, [isOffline, pendingCount, isProcessing, processQueue])
```

---

## Жизненный цикл элемента

```
┌─────────────────────────────────────────────────────────────┐
│                  Жизненный цикл                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │  addAction  │                                            │
│  └─────────────┘                                            │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    status: PENDING                         │
│  │  IndexedDB  │    attempts: 0                             │
│  └─────────────┘                                            │
│         │                                                   │
│         │  ◄── Сеть восстановлена                          │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │processQueue │                                            │
│  └─────────────┘                                            │
│         │                                                   │
│    ┌────┴────┐                                              │
│    ▼         ▼                                              │
│ Успех    Ошибка                                             │
│    │         │                                              │
│    │    ┌────┴────┐                                         │
│    │    ▼         ▼                                         │
│    │ 4xx/5xx  Сеть                                          │
│    │    │         │                                         │
│    │    ▼         ▼                                         │
│    │ attempts++  retry                                      │
│    │    │                                                   │
│    │    ▼                                                   │
│    │ attempts >= 3?                                         │
│    │    │                                                   │
│    │    ├── Да ──▶ status: FAILED                          │
│    │    │                                                   │
│    │    └── Нет ─▶ status: PENDING (повтор позже)          │
│    │                                                        │
│    ▼                                                        │
│ Удаляется                                                   │
│ из очереди                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## offline-service.ts

Низкоуровневые функции для работы с очередью.

### Хранилище

```typescript
const DEFAULT_SYNC_QUEUE_STORAGE_KEY = 'lena-form-sync-queue'

// Получить очередь
const queue = await getQueueFromStorage()

// Добавить элемент
const item = await addToQueue({ type: 'ACTION', payload: {...} })

// Удалить элемент
await removeFromQueue(item.id)

// Очистить всю очередь
await clearQueue()
```

### createSyncQueueStore

Создаёт реактивный store для useSyncExternalStore:

```typescript
const store = createSyncQueueStore('custom-key')

// Инициализация (загрузка из IndexedDB)
await store.initialize()

// Подписка на изменения
const unsubscribe = store.subscribe(() => {
  console.log('Очередь изменилась:', store.getQueue())
})

// Операции
await store.add({ type: 'ACTION', payload: {...} })
await store.remove('item-id')
await store.processAll(handler)
```

---

## Обработка ошибок

### HTTP ошибки (4xx/5xx)

```typescript
const result = await handler(action)

if (!result.success) {
  // Увеличиваем счётчик попыток
  item.attempts++

  if (item.attempts >= item.maxAttempts) {
    // Помечаем как FAILED — больше не пробуем
    item.status = 'FAILED'
    item.error = result.error
  }
  // Иначе остаётся PENDING для следующей попытки
}
```

### Сетевые ошибки

При сетевых ошибках (TypeError: Failed to fetch) элемент остаётся PENDING и будет повторён при следующем восстановлении сети.

---

## Кастомный storage key

```typescript
// Отдельная очередь для каждого приложения
const store = createSyncQueueStore('driving-school-sync-queue')
```

---

## Типы

```typescript
interface ProcessQueueResult {
  success: boolean
  item?: SyncQueueItem
  error?: string
}

type SyncActionHandler = (action: SyncAction) => Promise<{ success: boolean; error?: string }>

interface SyncQueueStore {
  getQueue: () => SyncQueueItem[]
  getQueueLength: () => number
  subscribe: (listener: () => void) => () => void
  initialize: () => Promise<void>
  add: (action: SyncAction) => Promise<SyncQueueItem>
  remove: (id: string) => Promise<boolean>
  processAll: (handler: SyncActionHandler) => Promise<ProcessQueueResult[]>
}
```

---

## См. также

- [form-components-offline.md](form-components-offline.md) — useOfflineForm
- [indexeddb.md](indexeddb.md) — idb-keyval
- [hooks.md](hooks.md) — useOfflineStatus
