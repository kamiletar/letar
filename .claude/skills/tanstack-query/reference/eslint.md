# ESLint Plugin

ESLint правила для TanStack Query.

## Установка

```bash
bun add -D @tanstack/eslint-plugin-query
```

## Конфигурация

### Flat Config (eslint.config.js)

```javascript
import pluginQuery from '@tanstack/eslint-plugin-query'

export default [
  // Recommended — все правила
  ...pluginQuery.configs['flat/recommended'],

  // Или кастомная конфигурация
  {
    plugins: {
      '@tanstack/query': pluginQuery,
    },
    rules: {
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/stable-query-client': 'error',
      '@tanstack/query/no-rest-destructuring': 'warn',
    },
  },
]
```

### Legacy Config (.eslintrc)

```json
{
  "extends": ["plugin:@tanstack/query/recommended"]
}
```

Или кастомно:

```json
{
  "plugins": ["@tanstack/query"],
  "rules": {
    "@tanstack/query/exhaustive-deps": "error"
  }
}
```

---

## Правила

### exhaustive-deps ✅🔧

Все переменные из `queryFn` должны быть в `queryKey`.

```typescript
// ❌ Неправильно — todoId не в ключе
useQuery({
  queryKey: ['todo'],
  queryFn: () => api.getTodo(todoId),
})

// ✅ Правильно
useQuery({
  queryKey: ['todo', todoId],
  queryFn: () => api.getTodo(todoId),
})
```

**Почему важно:**

- Разные `todoId` → разные записи в кэше
- Автоматический рефетч при изменении `todoId`

---

### stable-query-client ✅🔧

QueryClient должен быть стабильным (не создаваться на каждый render).

```typescript
// ❌ Неправильно — новый client на каждый render
function App() {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// ✅ Правильно — useState
function App() {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// ✅ Правильно — module-level
const queryClient = new QueryClient()
function App() {
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// ✅ Правильно — async Server Component (выполняется один раз)
async function App() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery(...)
  return ...
}
```

---

### no-rest-destructuring ✅

Не используй rest destructuring на результате query.

```typescript
// ❌ Неправильно — подписка на ВСЕ поля
const { data, ...rest } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
})

// ✅ Правильно — подписка только на нужные поля
const todosQuery = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
})
const { data } = todosQuery

// Или
const { data, isLoading, error } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
})
```

**Почему важно:**

- Rest destructuring подписывает на все поля
- Любое изменение → ререндер компонента
- Используй `notifyOnChangeProps` для оптимизации

**Исключение:** Можно отключить если используешь `notifyOnChangeProps`:

```typescript
const { data, ...rest } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  notifyOnChangeProps: ['data', 'error'], // Явно указываешь
})
```

---

### no-unstable-deps ✅

Избегай нестабильных зависимостей в queryKey.

```typescript
// ❌ Неправильно — объект создаётся на каждый render
useQuery({
  queryKey: ['todos', { filter: 'active' }], // Новый объект каждый раз
  queryFn: fetchTodos,
})

// ✅ Правильно — стабильная ссылка
const filters = useMemo(() => ({ filter: 'active' }), [])
useQuery({
  queryKey: ['todos', filters],
  queryFn: fetchTodos,
})

// ✅ Правильно — примитивы
const filter = 'active'
useQuery({
  queryKey: ['todos', filter],
  queryFn: fetchTodos,
})
```

---

### infinite-query-property-order ✅🔧

Правильный порядок свойств для type inference в infinite queries.

```typescript
// ❌ Неправильно — getNextPageParam перед queryFn
useInfiniteQuery({
  queryKey: ['projects'],
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
})

// ✅ Правильно — queryFn первым
useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

**Правильный порядок:**

1. `queryFn`
2. `getPreviousPageParam`
3. `getNextPageParam`

---

### no-void-query-fn ✅

queryFn не должна возвращать void.

```typescript
// ❌ Неправильно
useQuery({
  queryKey: ['trigger'],
  queryFn: () => {
    triggerSomething()
    // Нет return!
  },
})

// ✅ Правильно
useQuery({
  queryKey: ['trigger'],
  queryFn: async () => {
    await triggerSomething()
    return null // Явный return
  },
})
```

---

### mutation-property-order ✅🔧

Правильный порядок свойств в мутациях.

---

## Интеграция с проектом

В monorepo Letar ESLint настроен в `eslint.config.js`. Добавь плагин:

```javascript
// eslint.config.js
import pluginQuery from '@tanstack/eslint-plugin-query'

export default [
  // ... other configs
  ...pluginQuery.configs['flat/recommended'],
]
```

Или только для приложений с React Query:

```javascript
export default [
  {
    files: ['apps/*/src/**/*.{ts,tsx}'],
    plugins: {
      '@tanstack/query': pluginQuery,
    },
    rules: {
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/stable-query-client': 'error',
    },
  },
]
```
