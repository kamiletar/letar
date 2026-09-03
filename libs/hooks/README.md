# @letar/hooks

Shared React хуки для приложений Letar монорепозитория.

## Установка

Библиотека уже включена в монорепозиторий:

```typescript
import { useDebounce, useOnlineStatus, usePendingMutations } from '@letar/hooks'
```

## API

### Utility Hooks

| Хук                                     | Описание                               |
| --------------------------------------- | -------------------------------------- |
| `useDebounce<T>(value, delay?)`         | Debounce значения (по умолчанию 300ms) |
| `useThrottle<T>(callback, delay?)`      | Throttle функции (по умолчанию 300ms)  |
| `usePrevious<T>(value)`                 | Предыдущее значение переменной         |
| `useLocalStorage<T>(key, initialValue)` | Синхронизация с localStorage           |

### Browser Hooks

| Хук                               | Описание                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `useOnlineStatus()`               | Статус подключения к интернету (boolean)                                                              |
| `useScrollDirection(threshold?)`  | Направление скролла ('up' \| 'down' \| null)                                                          |
| `useMediaQuery(query)`            | Отслеживание CSS media query                                                                          |
| `useWindowSize()`                 | Размеры окна { width, height }                                                                        |
| `useInfiniteScrollSentinel(opts)` | Infinite scroll через sentinel-элемент + IntersectionObserver, возвращает callback-ref                |
| `useEventSource(opts)`            | Единое управление `EventSource` (SSE): backoff-переподключение, `visibilitychange`, кастомные события |
| `useOfflineConsent(storageKey)`   | Согласие на оффлайн-режим в localStorage (парный UI — `OfflineConsentBanner` из `@letar/ui`)          |
| `useOfflineServiceWorker(opts)`   | Регистрация Service Worker по этому согласию; при отзыве — снятие всех регистраций и очистка кешей    |
| `useClientOrigin()`               | `window.location.origin`, безопасный для SSR — `''` до монтирования, реальный origin после            |

### TanStack Query Hooks

| Хук                      | Описание                   |
| ------------------------ | -------------------------- |
| `usePendingMutations()`  | Количество pending мутаций |
| `useInvalidateQueries()` | Методы инвалидации кэша    |

## Примеры использования

### Debounce поиска

```tsx
import { useDebounce } from '@letar/hooks'

function SearchInput() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery)
    }
  }, [debouncedQuery])

  return <Input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

### Скрытие header при скролле

```tsx
import { useScrollDirection } from '@letar/hooks'

function Header() {
  const scrollDirection = useScrollDirection()
  const isHidden = scrollDirection === 'down'

  return (
    <Box transform={isHidden ? 'translateY(-100%)' : 'translateY(0)'}>
      <Navigation />
    </Box>
  )
}
```

### Infinite scroll списка

```tsx
import { useInfiniteScrollSentinel } from '@letar/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'

function ItemList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery() /* ... */

  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore: fetchNextPage,
  })

  return (
    <>
      {data?.pages
        .flatMap((page) => page.items)
        .map((item) => <ItemCard key={item.id} item={item} />)}
      {hasNextPage && <Box ref={sentinelRef} h="1px" />}
    </>
  )
}
```

### Offline индикатор

```tsx
import { useOnlineStatus } from '@letar/hooks'

function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) { return null }

  return <Banner colorPalette="red">Нет подключения к интернету</Banner>
}
```

### Индикатор синхронизации

```tsx
import { usePendingMutations } from '@letar/hooks'

function SyncIndicator() {
  const pendingCount = usePendingMutations()

  if (pendingCount === 0) { return null }

  return <Badge>Синхронизация ({pendingCount})</Badge>
}
```

### Ссылка с origin текущего окружения (QR-код, share-ссылка)

```tsx
import { useClientOrigin } from '@letar/hooks'

function InviteQr({ inviteKey }: { inviteKey: string }) {
  const origin = useClientOrigin()
  // origin === '' на сервере и на первом клиентском рендере — рендерим одинаково
  const inviteUrl = origin ? `${origin}/invite/${inviteKey}` : null

  return inviteUrl ? <QrCode value={inviteUrl} /> : <Spinner />
}
```

⚠️ Не заменяй на `typeof window !== 'undefined' ? window.location.origin : ''` прямо в теле
рендера — сервер и первый клиентский рендер дадут разный текст (`''` vs реальный origin), и
React уронит hydration (error 418). Если origin нужен уже на сервере (например для ссылки,
которая должна учитывать реальный домен за прокси на staging) — используй серверный источник
(`headers()` внутри Server Component/Route Handler), а не этот хук — см. пример
`getRequestOrigin()` в `apps/studio/src/lib/request-origin.ts`.

### SSE-поток (Server-Sent Events)

```tsx
import { useEventSource } from '@letar/hooks'

function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  const { status } = useEventSource({
    url: '/api/metrics/stream',
    events: {
      metrics: (event) => setMetrics(JSON.parse(event.data)),
    },
    reconnect: { strategy: 'exponential', baseDelayMs: 1000, maxDelayMs: 30000, jitter: true },
  })

  return <Badge colorPalette={status === 'connected' ? 'green' : 'gray'}>{status}</Badge>
}
```

По умолчанию `reconnectOnVisible: true` — при возврате фоновой вкладки в фокус соединение
пересоздаётся принудительно (Chrome Memory Saver замораживает `EventSource` фоновых вкладок и не
всегда переподключает его сам). `reconnect: 'native'` (по умолчанию) не трогает соединение при
ошибке — переподключение отдаётся браузеру; `'none'` — закрывает без ретраев; объект — closes и
переподключается по стратегии `'constant' | 'linear' | 'exponential'`.

### Responsive UI

```tsx
import { breakpoints, useMediaQuery } from '@letar/hooks'

function ResponsiveComponent() {
  const isMobile = useMediaQuery(breakpoints.isMobile)
  const prefersDark = useMediaQuery(breakpoints.prefersDark)

  return isMobile ? <MobileView /> : <DesktopView />
}
```

## Типы

```typescript
// ScrollDirection
type ScrollDirection = 'up' | 'down' | null

// WindowSize
interface WindowSize {
  width: number
  height: number
}

// Breakpoints
const breakpoints = {
  isMobile: '(max-width: 479px)',
  isTablet: '(min-width: 480px) and (max-width: 767px)',
  isLaptop: '(min-width: 768px) and (max-width: 991px)',
  isDesktop: '(min-width: 992px)',
  prefersDark: '(prefers-color-scheme: dark)',
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
}
```

## Peer Dependencies

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0 (опционально, для query хуков)

---

**Последнее обновление:** 2025-01-01
