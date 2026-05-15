---
paths: 'apps/**/_hooks/**, apps/**/use*.ts, apps/**/use*.tsx'
---

# Правила Data Fetching

## Приоритет инструментов

- **ОБЯЗАТЕЛЬНО** используй ZenStack хуки (`useFindMany*`, `useCreate*`, `useUpdate*`, `useDelete*`) для всех CRUD операций
- **ОБЯЗАТЕЛЬНО** вызови Skill `tanstack-query` при настройке нового QueryClient или паттернов кэширования
- **ОБЯЗАТЕЛЬНО** проверяй `src/generated/hooks/` на наличие нужного хука перед написанием кастомного
- **ЗАПРЕЩЕНО** использовать `fetch`/`axios` для CRUD — только ZenStack сгенерированные хуки
- При отсутствии хука — проверь `schema.zmodel` и сгенерируй через `nx zenstack:generate <app>`

## Гибридный подход

| Сценарий                 | Решение                                    |
| ------------------------ | ------------------------------------------ |
| Формы (CRUD)             | React 19 `useActionState` + Server Actions |
| Списки, таблицы          | TanStack Query + ZenStack хуки             |
| Реалтайм данные          | TanStack Query + `refetchInterval`         |
| Оптимистичные обновления | TanStack Query `useMutation`               |

## TanStack Query + ZenStack

ZenStack автоматически генерирует хуки в `src/generated/hooks/`:

```typescript
// Сгенерированные хуки
import { useCreateProduct, useFindManyProduct } from '@/generated/hooks'

// Использование
const { data: products, isLoading } = useFindManyProduct({
  where: { isActive: true },
  include: { category: true },
})
```

## React 19 для форм

```typescript
// _actions/product.action.ts
'use server'
export async function createProduct(formData: FormData) {
  // ...
}

// Компонент
import { useActionState } from 'react'

function ProductForm() {
  const [state, action, isPending] = useActionState(createProduct, null)
  return <form action={action}>...</form>
}
```

## Паттерны кэширования

```typescript
// Инвалидация после мутации
const queryClient = useQueryClient()
const mutation = useCreateProduct({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['findManyProduct'] })
  },
})
```

## Оптимистичные обновления

```typescript
const mutation = useUpdateProduct({
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['findUniqueProduct', id] })
    const previous = queryClient.getQueryData(['findUniqueProduct', id])
    queryClient.setQueryData(['findUniqueProduct', id], newData)
    return { previous }
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(['findUniqueProduct', id], context?.previous)
  },
})
```

## Правила

- **MUST** использовать ZenStack хуки для CRUD операций
- **NEVER** вызывать Prisma напрямую из клиента
- **NEVER** использовать fetch/axios для CRUD когда ZenStack хуки доступны
- **SHOULD** использовать `select` для оптимизации запросов
- **SHOULD** добавлять `staleTime` для редко меняющихся данных

## Документация

→ Skill: `tanstack-query` для полных паттернов
→ Skill: `zenstack-helper` для генерации хуков
