# @letar/query-provider

Унифицированный QueryProvider для TanStack Query с пресетами кэширования и поддержкой IndexedDB.

## Установка

Библиотека уже включена в монорепо. Обязательное — одно: добавь `@letar/query-provider` в
`nx.implicitDependencies` в `package.json` приложения (если библиотеки нет в его `dependencies`).

Полная процедура подключения — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).

## Использование

### Базовый QueryProvider

```tsx
import { QueryProvider } from '@letar/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryProvider preset="standard">{children}</QueryProvider>
}
```

### PersistQueryProvider для PWA

Сохраняет кэш между сессиями браузера:

```tsx
import { PersistQueryProvider } from '@letar/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryProvider preset="offline" buster={process.env.NEXT_PUBLIC_BUILD_ID}>
      {children}
    </PersistQueryProvider>
  )
}
```

## Пресеты кэширования

| Пресет     | staleTime | gcTime  | Использование             |
| ---------- | --------- | ------- | ------------------------- |
| `realtime` | 5 сек     | 1 мин   | Метрики, алерты, чаты     |
| `standard` | 5 мин     | 30 мин  | Списки, каталоги, профили |
| `static`   | 30 мин    | 1 час   | Категории, справочники    |
| `offline`  | 5 мин     | 24 часа | PWA, e-commerce           |

## API

### QueryProvider

```tsx
interface QueryProviderProps {
  children: ReactNode
  preset?: 'realtime' | 'standard' | 'static' | 'offline'
  defaultOptions?: DefaultOptions // Переопределяет пресет
  onMutationError?: (error: Error) => void
  showDevtools?: boolean // По умолчанию: true в dev
}
```

### PersistQueryProvider

```tsx
interface PersistQueryProviderProps extends QueryProviderProps {
  persisterOptions?: { key?: string } // Ключ в IndexedDB
  maxAge?: number // TTL кэша (по умолчанию 24 часа)
  buster?: string // Инвалидация при изменении (BUILD_ID)
}
```

### Утилиты

```tsx
import { CACHE_PRESETS, createIDBPersister, createQueryClient, getQueryClient } from '@letar/query-provider'

// Создать клиент вручную
const client = createQueryClient({ preset: 'offline' })

// Синглтон для браузера (SSR-safe)
const client = getQueryClient({ preset: 'standard' })

// Персистер для IndexedDB
const persister = createIDBPersister({ key: 'my-app-cache' })
```

## Зависимости

- `@tanstack/react-query` >= 5.0.0
- `@tanstack/react-query-devtools` >= 5.0.0
- `@tanstack/react-query-persist-client` >= 5.0.0
- `idb-keyval` >= 6.0.0
