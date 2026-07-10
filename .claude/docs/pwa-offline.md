# PWA и оффлайн паттерны

## ⛔ Согласие пользователя перед регистрацией Service Worker (ОБЯЗАТЕЛЬНО)

**Запрещено регистрировать SW автоматически при заходе на сайт без спроса.** Service Worker молча прекачивает статику приложения — это может съесть десятки МБ хранилища браузера без ведома пользователя.

**Эталонная реализация:** `apps/mandala/` — `OfflineConsentBanner` + `useOfflineConsent('<app>-offline-consent')` из `@letar/hooks`.

Паттерн:

1. `ServiceWorkerRegistration` вызывает `navigator.serviceWorker.register()` **только если** `useOfflineConsent(storageKey).isAccepted === true`. Если пользователь отозвал согласие — `unregister()`.
2. `OfflineConsentBanner` — баннер снизу экрана (появляется через 2 сек после загрузки), кнопки «Включить оффлайн» / «Не сейчас». При отказе повторный показ через 7 дней (логика уже в хуке).
3. `storageKey` — уникальный на приложение, например `'grandslamcup-offline-consent'`.

```tsx
// src/app/_components/service-worker-registration.tsx
const { isAccepted } = useOfflineConsent('<app>-offline-consent')
// register() только при isAccepted === true, иначе unregister()
```

Применено в: `mandala`, `grandslamcup`. **При добавлении SW в новое приложение — обязательно копировать этот паттерн**, не регистрировать SW безусловно в `useEffect`.

## Serwist и Turbopack (обновлено 2026-04)

> **Serwist v9.5+** поддерживает Next.js 16, но **не работает с Turbopack**.
>
> ### Рекомендуемый подход: Serwist + `--webpack` build
>
> 1. Добавь `withSerwist` в `next.config.mjs` (отключай в dev: `disable: dev`)
> 2. Создай `src/app/sw.ts` с Serwist precache + Background Sync
> 3. В `project.json` добавь `"args": ["--webpack"]` в build target
> 4. Dev работает на Turbopack (без SW), prod build — Webpack (с SW)
>
> **Пример:** `apps/grandslamcup/` — полный offline-scorer с Background Sync
>
> ### Альтернатива: Ручной Service Worker (для static export)
>
> Для `output: 'export'` используй ручной SW:
>
> 1. Создай `public/sw.template.js` с `SW_VERSION = '0.0.0'`
> 2. Создай `scripts/update-sw-version.mjs` для подстановки версии
> 3. Также нужен `fix-rsc-paths.mjs` для бага Next.js 16 с RSC payload
>
> **Пример:** `apps/pravda/`
>
> ### Background Sync (progressive enhancement)
>
> - **Chromium** (Chrome, Edge, Opera, Samsung): SW `sync` event, работает даже если вкладка закрыта
> - **Safari fallback**: `online` event + ручная кнопка + `setInterval` polling
> - Очередь операций в IndexedDB, batch sync через API endpoint

## Обзор

Приложение `premium-rosstil` использует PWA (Progressive Web App) архитектуру для работы в оффлайн режиме.

**Ключевые технологии:**

- **Service Worker** — кэширование статики (HTML, CSS, JS, изображения)
- **TanStack Query + ZenStack** — кэширование данных с автосинхронизацией
- **IndexedDB (idb-keyval)** — персистентность Query Cache между сессиями
- **useSyncExternalStore** — синхронизация состояния между вкладками

**Стратегии кэширования:**

| Тип ресурса               | Стратегия              | Причина                              |
| ------------------------- | ---------------------- | ------------------------------------ |
| HTML страницы             | Network First          | Актуальный контент, fallback из кэша |
| Статика (JS, CSS, шрифты) | Cache First            | Редко меняется, быстрая загрузка     |
| Изображения               | Stale While Revalidate | Показать сразу, обновить в фоне      |
| API запросы               | TanStack Query         | Управляется React Query              |

---

## Service Worker

### Стратегии кэширования

```javascript
// public/sw.js

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`

const PRECACHE_URLS = ['/', '/offline', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

// Network First — для HTML страниц
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || caches.match('/offline')
  }
}

// Cache First — для статики
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Stale While Revalidate — для изображений
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)

  return cached || fetchPromise
}
```

### Роутинг запросов

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем auth и API (обрабатывается TanStack Query)
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) {
    return
  }

  // Пропускаем внешние запросы
  if (url.origin !== self.location.origin) {
    return
  }

  // HTML страницы — Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE))
    return
  }

  // Изображения — Stale While Revalidate
  if (url.pathname.startsWith('/uploads/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // Статика (JS, CSS, шрифты) — Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Остальное — Network First
  event.respondWith(networkFirst(request, STATIC_CACHE))
})
```

### Prefetch изображений через SW

```javascript
self.addEventListener('message', async (event) => {
  if (event.data.type === 'CACHE_IMAGES') {
    const cache = await caches.open(IMAGE_CACHE)
    for (const url of event.data.urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response)
        }
      } catch {
        // Игнорируем ошибки
      }
    }
  }
})
```

---

## TanStack Query + ZenStack

### Query Client с оффлайн настройками

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

### IndexedDB Persister

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

### Provider с Persist

Используй `@letar/query-provider` с пресетом `offline` для PWA:

```tsx
// src/app/_components/providers/query-provider.tsx
'use client'

import { PersistQueryProvider } from '@letar/query-provider'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryProvider preset="offline" buster={process.env.NEXT_PUBLIC_BUILD_ID}>
      {children}
    </PersistQueryProvider>
  )
}
```

**Что делает `PersistQueryProvider`:**

- Сохраняет кэш в IndexedDB между сессиями
- `buster` — инвалидирует кэш при изменении версии (BUILD_ID)
- `preset="offline"` — настройки для PWA (gcTime: 24 часа, networkMode: offlineFirst)

> Полная документация: [`libs/query-provider/README.md`](/libs/query-provider/README.md)

### Использование хуков ZenStack

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

## Хуки для оффлайн состояния

Все хуки доступны из `@letar/hooks`:

```typescript
import { useOnlineStatus, usePendingMutations } from '@letar/hooks'
```

### useOnlineStatus

Возвращает `true` если есть подключение к интернету:

```tsx
import { useOnlineStatus } from '@letar/hooks'

function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return <Banner colorPalette="red">Нет подключения к интернету</Banner>
}
```

### usePendingMutations

Возвращает количество pending мутаций TanStack Query:

```tsx
import { usePendingMutations } from '@letar/hooks'

function SyncIndicator() {
  const pendingCount = usePendingMutations()

  if (pendingCount === 0) return null

  return <Badge>Синхронизация ({pendingCount})</Badge>
}
```

> Полная документация: [`libs/hooks/README.md`](/libs/hooks/README.md)

### useNetworkQuality

```typescript
// src/hooks/use-network-quality.ts
'use client'

import { useEffect, useState } from 'react'

type NetworkQuality = 'fast' | 'slow' | 'offline'

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>('fast')

  useEffect(() => {
    const updateQuality = () => {
      if (!navigator.onLine) {
        setQuality('offline')
        return
      }

      const connection = (
        navigator as Navigator & {
          connection?: { effectiveType: string; saveData: boolean }
        }
      ).connection

      if (connection) {
        if (connection.saveData || ['2g', 'slow-2g'].includes(connection.effectiveType)) {
          setQuality('slow')
        } else {
          setQuality('fast')
        }
      }
    }

    updateQuality()
    window.addEventListener('online', updateQuality)
    window.addEventListener('offline', updateQuality)

    return () => {
      window.removeEventListener('online', updateQuality)
      window.removeEventListener('offline', updateQuality)
    }
  }, [])

  return quality
}
```

---

## Паттерн глобального состояния с IndexedDB

Для данных, которые не связаны с API (wishlist, сравнение, планировщик):

```typescript
'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'premium-rosstil-feature-name'

// Глобальное состояние ВНЕ React
let globalState: FeatureState = { items: [] }
const listeners: Set<() => void> = new Set()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

const loadFromStorage = async (): Promise<void> => {
  try {
    const stored = await get<FeatureState>(STORAGE_KEY)
    if (stored) {
      globalState = stored
      notifyListeners()
    }
  } catch (error) {
    console.error('Ошибка загрузки:', error)
  }
}

const saveToStorage = async (): Promise<void> => {
  try {
    await set(STORAGE_KEY, globalState)
  } catch (error) {
    console.error('Ошибка сохранения:', error)
  }
}

let initialized = false
const initialize = () => {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    loadFromStorage()
  }
}

export function useFeature() {
  const [isLoading, setIsLoading] = useState(true)

  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => globalState,
    () => globalState
  )

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const addItem = useCallback(async (item: Item): Promise<void> => {
    globalState = {
      ...globalState,
      items: [...globalState.items, { ...item, id: generateId() }],
    }
    notifyListeners()
    await saveToStorage()
  }, [])

  return { state, isLoading, addItem }
}
```

---

## UI компоненты

### OnlineStatus баннер

```tsx
// src/app/_components/online-status.tsx
'use client'

import { Box, HStack, Icon, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaWifi, FaWifiSlash } from 'react-icons/fa'

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      bg={isOnline ? 'green.500' : 'orange.500'}
      color="white"
      px={4}
      py={2}
      borderRadius="full"
      zIndex={9999}
      shadow="lg"
    >
      <HStack gap={2}>
        <Icon as={isOnline ? FaWifi : FaWifiSlash} />
        <Text fontSize="sm" fontWeight="medium">
          {isOnline ? 'Подключение восстановлено' : 'Оффлайн режим'}
        </Text>
      </HStack>
    </Box>
  )
}
```

### SyncStatus индикатор

```tsx
// src/app/_components/sync-status.tsx
'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePendingMutations } from '@/hooks/use-pending-mutations'
import { Box, HStack, Icon, Spinner, Text } from '@chakra-ui/react'
import { FaCloud, FaExclamationTriangle } from 'react-icons/fa'

export function SyncStatus() {
  const pendingCount = usePendingMutations()
  const isOnline = useOnlineStatus()

  if (pendingCount === 0 && isOnline) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      bg={isOnline ? 'blue.500' : 'orange.500'}
      color="white"
      px={4}
      py={2}
      borderRadius="full"
      shadow="lg"
      zIndex={9999}
    >
      <HStack gap={2}>
        {!isOnline ? (
          <>
            <Icon as={FaExclamationTriangle} />
            <Text fontSize="sm">Оффлайн</Text>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Spinner size="sm" />
            <Text fontSize="sm">Синхронизация ({pendingCount})...</Text>
          </>
        ) : (
          <>
            <Icon as={FaCloud} />
            <Text fontSize="sm">Синхронизировано</Text>
          </>
        )}
      </HStack>
    </Box>
  )
}
```

### StorageInfo виджет

```tsx
// src/app/_components/storage-info.tsx
'use client'

import { Box, Progress, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function StorageInfo() {
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null)

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        setStorage({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        })
      })
    }
  }, [])

  if (!storage) {
    return null
  }

  const usedMB = (storage.used / 1024 / 1024).toFixed(1)
  const quotaMB = (storage.quota / 1024 / 1024).toFixed(0)
  const percent = (storage.used / storage.quota) * 100

  return (
    <Box p={4} bg="bg.muted" borderRadius="md">
      <VStack gap={2} align="stretch">
        <Text fontSize="sm" fontWeight="medium">
          Хранилище оффлайн данных
        </Text>
        <Progress value={percent} colorPalette="fg" size="sm" />
        <Text fontSize="xs" color="fg.muted">
          Использовано {usedMB} МБ из {quotaMB} МБ
        </Text>
      </VStack>
    </Box>
  )
}
```

---

## Продвинутые паттерны

### Prefetch при hover

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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_IMAGES',
        urls: product.images.slice(0, 2),
      })
    }
  }

  return <Card onMouseEnter={handleMouseEnter}>{/* ... */}</Card>
}
```

### Push-инвалидация кэша

```javascript
// public/sw.js — добавить к обработке push
self.addEventListener('push', (event) => {
  const data = event.data?.json()

  if (data?.type === 'NEW_PRODUCTS' || data?.type === 'SALE') {
    event.waitUntil(
      Promise.all([
        showNotification(data),
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'INVALIDATE_PRODUCTS' })
          })
        }),
      ])
    )
  }
})
```

```tsx
// src/hooks/use-sw-messages.ts
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useSWMessages() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INVALIDATE_PRODUCTS') {
        queryClient.invalidateQueries({ queryKey: ['Product'] })
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [queryClient])
}
```

---

## Тестирование

### DevTools

1. **Application → Service Workers** — управление SW
2. **Application → Cache Storage** — просмотр кэшей
3. **Application → IndexedDB** — просмотр TanStack Query кэша
4. **Network → Offline** — эмуляция отсутствия сети
5. **Network → Throttling → Slow 3G** — медленная сеть

### Чеклист

- [ ] Главная страница загружается оффлайн
- [ ] Изображения товаров кэшируются
- [ ] `/offline` показывается при ошибке
- [ ] Каталог показывает кэшированные товары оффлайн
- [ ] Добавление в корзину работает оффлайн
- [ ] Мутации синхронизируются при возврате онлайн
- [ ] Баннер показывается при потере/восстановлении связи

---

## Что НЕ кэшируем

- `/auth/*` — авторизация
- POST/PUT/DELETE без TanStack Query
- Внешние ресурсы (CDN, аналитика)
- Персональные данные (заказы, платежи)

---

## Зависимости

```bash
# TanStack Query v5
bun add @tanstack/react-query @tanstack/react-query-persist-client @tanstack/react-query-devtools

# ZenStack TanStack плагин
bun add @zenstackhq/tanstack-query

# IndexedDB
bun add idb-keyval

# Service Worker типы
bun add -D @types/serviceworker
```

---

---

## Оффлайн-формы с TanStack Form и useOfflineForm

### Интеграция useOfflineForm с TanStack Form

Хук `useOfflineForm` из `@letar/forms/offline` обеспечивает offline-first поведение для форм:

```typescript
import { useAppForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm } from '@letar/forms/offline'

interface ProfileFormData {
  name: string
  bio: string
  isPublic: boolean
}

function ProfileForm({ initialData }) {
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<ProfileFormData>({
    actionType: 'UPDATE_INSTRUCTOR_PROFILE',
    onlineSubmit: async (value) => {
      const formData = new FormData()
      formData.set('name', value.name)
      formData.set('bio', value.bio)
      formData.set('isPublic', value.isPublic ? 'true' : 'false')

      const result = await updateProfileAction(undefined, formData)
      return result?.success
        ? { success: true }
        : { success: false, error: result?.error?.formErrors?.[0] }
    },
    onSuccess: () => toaster.success({ title: 'Профиль обновлён' }),
    onQueued: () => toaster.info({ title: 'Сохранено локально' }),
    onError: (error) => toaster.error({ title: 'Ошибка', description: error }),
  })

  const form = useAppForm({
    defaultValues: {
      name: initialData?.name ?? '',
      bio: initialData?.bio ?? '',
      isPublic: initialData?.isPublic ?? false,
    },
    onSubmit: async ({ value }) => {
      await submit(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Индикатор статуса */}
      {(isOffline || pendingCount > 0) && (
        <HStack gap={2} mb={4}>
          {isOffline && <Badge colorPalette="orange">Оффлайн режим</Badge>}
          {pendingCount > 0 && (
            <Badge colorPalette="blue">
              {isProcessing ? 'Синхронизация...' : `Ожидает: ${pendingCount}`}
            </Badge>
          )}
        </HStack>
      )}

      <form.AppField name="name" children={(field) => <field.TextField label="Имя" />} />
      <form.AppField name="bio" children={(field) => <field.TextareaField label="О себе" />} />
      <form.AppField name="isPublic" children={(field) => <field.SwitchField label="Публичный профиль" />} />

      <form.AppForm
        children={(formApi) => (
          <formApi.SubmitButton>
            {isOffline ? 'Сохранить локально' : 'Сохранить'}
          </formApi.SubmitButton>
        )}
      />
    </form>
  )
}
```

### API useOfflineForm

```typescript
interface UseOfflineFormOptions<T> {
  /** Тип действия для очереди синхронизации */
  actionType: SyncActionType
  /** Обработчик онлайн отправки */
  onlineSubmit: (value: T) => Promise<{ success: boolean; error?: string }>
  /** Callback при успешной отправке */
  onSuccess?: () => void
  /** Callback при добавлении в очередь (оффлайн) */
  onQueued?: () => void
  /** Callback при ошибке */
  onError?: (error: string) => void
}

interface UseOfflineFormResult<T> {
  /** Функция отправки формы */
  submit: (value: T) => Promise<OfflineSubmitResult>
  /** Текущий статус оффлайн */
  isOffline: boolean
  /** Количество ожидающих синхронизации действий данного типа */
  pendingCount: number
  /** Общее количество элементов в очереди */
  queueLength: number
  /** Идёт ли обработка очереди */
  isProcessing: boolean
  /** Время последней попытки синхронизации */
  lastSyncAttempt: number | null
}
```

### Типы действий синхронизации

```typescript
export type SyncActionType =
  | 'BOOK_LESSON'
  | 'CANCEL_LESSON'
  | 'CONFIRM_LESSON'
  | 'COMPLETE_LESSON'
  | 'MARK_NO_SHOW'
  | 'UPDATE_INSTRUCTOR_PROFILE'
  | 'UPDATE_STUDENT_PROFILE'
  | 'UPDATE_SCHOOL_SETTINGS'
  | 'UPDATE_SCHEDULE_SETTINGS'
```

### Обработка ошибок синхронизации

При восстановлении соединения очередь обрабатывается автоматически:

1. **Успешная синхронизация** — элемент удаляется из очереди
2. **Ошибка 4xx** — элемент помечается как `FAILED`, пользователь уведомляется
3. **Ошибка 5xx / сеть** — повторная попытка с экспоненциальным backoff

```typescript
// Пример обработки конфликтов
const { submit } = useOfflineForm({
  actionType: 'UPDATE_INSTRUCTOR_PROFILE',
  onlineSubmit: async (value) => {
    try {
      const result = await updateProfileAction(value)
      if (result.success) {
        return { success: true }
      }
      // Конфликт версий
      if (result.error?.code === 'CONFLICT') {
        return { success: false, error: 'Данные были изменены. Обновите страницу.' }
      }
      return { success: false, error: result.error?.message }
    } catch (e) {
      // Сетевая ошибка — будет retry
      throw e
    }
  },
  onError: (error) => {
    toaster.error({ title: 'Ошибка синхронизации', description: error })
  },
})
```

### UI индикаторы состояния

Рекомендуемые паттерны отображения:

```typescript
// Статус в форме
{
  isOffline && <Badge colorPalette="orange">Оффлайн режим</Badge>
}

// Счётчик ожидающих
{
  pendingCount > 0 && (
    <Badge colorPalette="blue">
      <HStack gap={1}>
        {isProcessing && <Spinner size="xs" />}
        <Text>{isProcessing ? 'Синхронизация...' : `Ожидает: ${pendingCount}`}</Text>
      </HStack>
    </Badge>
  )
}

// Глобальный индикатор (в layout)
<SyncStatus /> // из @/app/_components/sync-status.tsx
```

### Миграция форм на оффлайн-поддержку

Чтобы добавить оффлайн в существующую TanStack Form:

1. Импортировать `useOfflineForm` из `@letar/forms/offline`
2. Определить тип данных формы (`interface`)
3. Добавить `actionType` в `SyncActionType` (если новый тип)
4. Обернуть Server Action в `onlineSubmit`
5. Подключить `submit` к `form.onSubmit`
6. Добавить UI индикаторы статуса
7. Адаптировать текст кнопки сохранения

---

## Связанные документы

- [PWA_PLAN.md](../../../apps/premium-rosstil/PWA_PLAN.md) — план реализации и чеклисты
- [UI компоненты](./ui-components.md) — Chakra UI паттерны
- [Архитектура](./architecture.md) — общая структура проекта
- [Формы и валидация](./forms.md) — TanStack Form, Conform, Zod
