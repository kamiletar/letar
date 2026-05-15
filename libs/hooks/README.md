# @letar/hooks

Shared React хуки для приложений Lena монорепозитория.

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

| Хук                              | Описание                                     |
| -------------------------------- | -------------------------------------------- |
| `useOnlineStatus()`              | Статус подключения к интернету (boolean)     |
| `useScrollDirection(threshold?)` | Направление скролла ('up' \| 'down' \| null) |
| `useMediaQuery(query)`           | Отслеживание CSS media query                 |
| `useWindowSize()`                | Размеры окна { width, height }               |

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

### Offline индикатор

```tsx
import { useOnlineStatus } from '@letar/hooks'

function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return <Banner colorPalette="red">Нет подключения к интернету</Banner>
}
```

### Индикатор синхронизации

```tsx
import { usePendingMutations } from '@letar/hooks'

function SyncIndicator() {
  const pendingCount = usePendingMutations()

  if (pendingCount === 0) return null

  return <Badge>Синхронизация ({pendingCount})</Badge>
}
```

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
