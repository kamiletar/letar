# Управление кэшем

QueryCache и MutationCache — хранилища для запросов и мутаций.

## QueryCache

Хранилище всех запросов. Обычно взаимодействуешь через QueryClient.

### Конструктор

```typescript
import { QueryCache, QueryClient } from '@tanstack/react-query'

const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error(`Query ${query.queryKey} failed:`, error)
    // Глобальная обработка ошибок
    toast.error(`Ошибка загрузки: ${error.message}`)
  },
  onSuccess: (data, query) => {
    console.log(`Query ${query.queryKey} succeeded`)
  },
  onSettled: (data, error, query) => {
    // Вызывается всегда
  },
})

const queryClient = new QueryClient({ queryCache })
```

### Методы

```typescript
const cache = queryClient.getQueryCache()

// Найти один запрос
const query = cache.find({ queryKey: ['todo', 1] })
// query.state.data, query.state.dataUpdatedAt, etc.

// Найти все совпадающие
const queries = cache.findAll({ queryKey: ['todos'] })

// Подписка на изменения
const unsubscribe = cache.subscribe((event) => {
  console.log('Cache event:', event.type, event.query.queryKey)
  // event.type: 'added' | 'removed' | 'updated' | 'observerAdded' | 'observerRemoved'
})

// Очистить кэш
cache.clear()
```

---

## MutationCache

Хранилище всех мутаций.

### Конструктор

```typescript
import { MutationCache, QueryClient } from '@tanstack/react-query'

const mutationCache = new MutationCache({
  onMutate: (variables, mutation) => {
    // Перед каждой мутацией
    console.log('Starting mutation:', mutation.options.mutationKey)
  },
  onSuccess: (data, variables, context, mutation) => {
    // После успешной мутации
  },
  onError: (error, variables, context, mutation) => {
    // Глобальная обработка ошибок мутаций
    toast.error(`Ошибка: ${error.message}`)
  },
  onSettled: (data, error, variables, context, mutation) => {
    // Всегда
  },
})

const queryClient = new QueryClient({ mutationCache })
```

### Важно о глобальных callbacks

Глобальные callbacks **всегда вызываются**, даже если есть локальные в useMutation.

```typescript
// Этот onSuccess вызовется ПОСЛЕ глобального
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    // Локальный обработчик
  },
})
```

⚠️ Глобальный `onMutate` **не может возвращать context** — используй локальный.

### Методы

```typescript
const cache = queryClient.getMutationCache()

// Все мутации
const mutations = cache.getAll()

// Подписка
const unsubscribe = cache.subscribe((event) => {
  console.log('Mutation event:', event.type)
})

// Очистить
cache.clear()
```

---

## Паттерны инвалидации

### Базовая инвалидация

```typescript
const queryClient = useQueryClient()

// По ключу (частичное совпадение)
queryClient.invalidateQueries({ queryKey: ['todos'] })
// Инвалидирует ['todos'], ['todos', 1], ['todos', { filter: 'active' }]

// Точное совпадение
queryClient.invalidateQueries({ queryKey: ['todo', 1], exact: true })
// Только ['todo', 1], не ['todo', 1, 'comments']
```

### refetchType

```typescript
// Только активные запросы (используемые компонентами)
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'active', // default
})

// Все (включая неактивные в кэше)
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'all',
})

// Только пометить устаревшими (без рефетча)
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'none',
})
```

### С предикатом

```typescript
// Инвалидировать все запросы определённого типа
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'user' && query.state.data?.role === 'admin',
})
```

### После мутации

```typescript
const createTodo = useMutation({
  mutationFn: api.createTodo,
  onSuccess: () => {
    // Инвалидировать список
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})

const updateTodo = useMutation({
  mutationFn: api.updateTodo,
  onSuccess: (data, variables) => {
    // Инвалидировать конкретный todo
    queryClient.invalidateQueries({ queryKey: ['todo', variables.id] })
    // И список
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

---

## Optimistic Updates

### Простой паттерн

```typescript
const updateTodo = useMutation({
  mutationFn: api.updateTodo,
  onMutate: async (newTodo) => {
    // 1. Отменить текущие запросы (избежать race condition)
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    // 2. Сохранить предыдущее состояние
    const previousTodos = queryClient.getQueryData(['todos'])

    // 3. Оптимистично обновить
    queryClient.setQueryData(
      ['todos'],
      (old) => old?.map((todo) => (todo.id === newTodo.id ? { ...todo, ...newTodo } : todo)),
    )

    // 4. Вернуть context для rollback
    return { previousTodos }
  },
  onError: (err, newTodo, context) => {
    // 5. Откатить при ошибке
    if (context?.previousTodos) {
      queryClient.setQueryData(['todos'], context.previousTodos)
    }
  },
  onSettled: () => {
    // 6. Всегда синхронизировать с сервером
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Для create (добавление в список)

```typescript
const createTodo = useMutation({
  mutationFn: api.createTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    const previous = queryClient.getQueryData(['todos'])

    // Добавить с временным id
    queryClient.setQueryData(['todos'], (old) => [...(old ?? []), { ...newTodo, id: `temp-${Date.now()}` }])

    return { previous }
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context?.previous)
  },
  onSuccess: (data) => {
    // Заменить temp на реальный id
    queryClient.setQueryData(['todos'], (old) => old?.map((todo) => (todo.id.startsWith('temp-') ? data : todo)))
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Для delete

```typescript
const deleteTodo = useMutation({
  mutationFn: api.deleteTodo,
  onMutate: async (todoId) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    const previous = queryClient.getQueryData(['todos'])

    queryClient.setQueryData(['todos'], (old) => old?.filter((todo) => todo.id !== todoId))

    return { previous }
  },
  onError: (err, todoId, context) => {
    queryClient.setQueryData(['todos'], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

---

## Query Keys

### Структура ключей

```typescript
// Простой
;['todos'][
  // С параметрами
  ('todo', todoId)
][('todos', { status: 'done', page: 1 })][
  // Иерархия
  ('user', userId, 'posts')
][('user', userId, 'posts', postId)][('user', userId, 'posts', postId, 'comments')]
```

### Частичное совпадение

```typescript
// Инвалидирует ВСЕ:
// ['todos']
// ['todos', 1]
// ['todos', { filter: 'active' }]
// ['todos', 1, 'comments']
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Инвалидирует ТОЛЬКО ['todos', 1]:
queryClient.invalidateQueries({ queryKey: ['todos', 1], exact: true })
```

### Фабрика ключей (рекомендуется)

```typescript
// keys.ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// Использование
useQuery({
  queryKey: todoKeys.detail(todoId),
  queryFn: () => api.getTodo(todoId),
})

// Инвалидация всех деталей
queryClient.invalidateQueries({ queryKey: todoKeys.details() })
```
