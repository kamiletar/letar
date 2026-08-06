# React 19 — Новые возможности

> Версия: 19.x | Docs: https://react.dev/blog/2024/12/05/react-19

## Что нового

### Actions — async функции в transitions

```tsx
// До React 19 — ручной isPending/error
function UpdateName() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setIsPending(true)
    const error = await updateName(name)
    setIsPending(false)
    if (error) setError(error)
  }
}

// React 19 — через useTransition
function UpdateName() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const error = await updateName(name)
      if (error) setError(error)
    })
  }
}
```

---

## Новые хуки

### useActionState

Управление состоянием + pending + ошибки для Actions:

```tsx
import { useActionState } from 'react'

async function updateNameAction(prevState, formData) {
  const name = formData.get('name')
  const error = await updateName(name)
  if (error) return { error }
  redirect('/profile')
  return { error: null }
}

function ChangeName() {
  const [state, submitAction, isPending] = useActionState(updateNameAction, { error: null })

  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>{isPending ? 'Сохраняем...' : 'Сохранить'}</button>
      {state.error && <p>{state.error}</p>}
    </form>
  )
}
```

**В letar**: Server Actions работают автоматически с `<form action={serverAction}>`.

### useOptimistic

Показывает оптимистичное значение пока запрос в процессе:

```tsx
import { useOptimistic } from 'react'

function NameDisplay({ currentName, onUpdate }) {
  const [optimisticName, setOptimisticName] = useOptimistic(currentName)

  const submitAction = async (formData) => {
    const newName = formData.get('name')
    setOptimisticName(newName) // мгновенное обновление UI
    await updateName(newName) // реальный запрос
    onUpdate(newName)
  }

  return (
    <form action={submitAction}>
      <p>Имя: {optimisticName}</p> {/* показывает новое сразу */}
      <input name="name" />
      <button>Изменить</button>
    </form>
  )
}
```

### use()

Читает ресурс (Promise или Context) во время рендера:

```tsx
import { Suspense, use } from 'react'

// Promise — ждёт данные (работает с Suspense)
function UserProfile({ userPromise }) {
  const user = use(userPromise) // suspends until resolved
  return <p>{user.name}</p>
}

// Context — можно использовать условно (в отличие от useContext)
function Heading({ children }) {
  if (!children) return null
  const theme = use(ThemeContext) // ✅ после early return
  return <h1 style={{ color: theme.color }}>{children}</h1>
}
```

### useFormStatus

Статус родительской `<form>` изнутри дочернего компонента:

```tsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Отправляем...' : 'Отправить'}</button>
} // Использование — внутри <form>

<form action={serverAction}>
  <input name="email" />
  <SubmitButton /> {/* автоматически видит pending состояние формы */}
</form>
```

---

## ref как prop (нет forwardRef)

```tsx
// React 19 — ref как обычный prop
function MyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />
}

// Использование
const ref = useRef(null)
<MyInput ref={ref} placeholder="Введите..." />

// ❌ forwardRef больше не нужен
// const MyInput = forwardRef(({ placeholder }, ref) => ...)
```

---

## Server Components & Server Functions

### 'use server' — Server Functions

```tsx
// actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)
  await db.post.create({ data: { title, authorId: session.user.id } })
  revalidatePath('/posts')
}

// Клиент — передаём напрямую в form action
import { createPost } from './actions'

export default function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button>Создать</button>
    </form>
  )
}
```

### 'use client' — Client Components

```tsx
'use client'

// Интерактивность, хуки, браузерные API — только в Client Components
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}
```

### Async Server Components

```tsx
// app/products/page.tsx — Server Component (без 'use client')
export default async function ProductsPage() {
  // Прямой await — без useEffect, без useState, без loading state
  const products = await db.product.findMany({ where: { isActive: true } })

  return (
    <div>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

---

## Улучшения Suspense

```tsx
// Suspense для асинхронного контента
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AsyncComponent />
    </Suspense>
  )
}

// С use() hook
function AsyncComponent() {
  const data = use(fetchData()) // suspends до готовности
  return <div>{data.title}</div>
}
```

---

## Document Metadata (нет react-helmet)

```tsx
// Прямо в компоненте — работает в Server и Client Components
export default function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`/blog/${post.slug}`} />
      <h1>{post.title}</h1>
    </article>
  )
}
```

---

## Stylesheet loading

```tsx
// Автоматический dedup и правильный порядок загрузки
function ComponentA() {
  return (
    <>
      <link rel="stylesheet" href="/styles/a.css" precedence="default" />
      <p>Компонент A</p>
    </>
  )
}
```

---

## Паттерны в letar (Next.js 16 App Router)

```tsx
// Типичный серверный компонент с данными
// app/driving-school/students/page.tsx
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export default async function StudentsPage() {
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)
  const students = await db.studentProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })

  return <StudentsList students={students} />
} // Клиентский компонент с формой через @letar/forms

'use client'
import { Form } from '@letar/forms'

export function StudentsList({ students }) {
  // ...
}
```

### Server Actions + @letar/forms

```tsx
// В @letar/forms onSubmit — передай Server Action напрямую
'use server'
export async function createStudent(data: StudentCreateInput) {
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)
  return db.studentProfile.create({ data })
} // Форма

<Form schema={StudentSchema} initialValue={{}} onSubmit={createStudent}>
  <Form.Field.String name="name" />
  <Form.Button.Submit />
</Form>
```

---

## Ссылки

- Blog: https://react.dev/blog/2024/12/05/react-19
- useActionState: https://react.dev/reference/react/useActionState
- useOptimistic: https://react.dev/reference/react/useOptimistic
- use: https://react.dev/reference/react/use
- useFormStatus: https://react.dev/reference/react-dom/hooks/useFormStatus
- Server Functions: https://react.dev/reference/rsc/server-functions
