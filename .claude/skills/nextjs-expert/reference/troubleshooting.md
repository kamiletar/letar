# Troubleshooting

Распространённые проблемы и их решения в Next.js 16.

---

## Hydration Errors

### Причина

Контент на сервере отличается от контента на клиенте.

```
Text content does not match server-rendered HTML.
Hydration failed because the server rendered HTML didn't match the client.
```

### Решения

#### Проблема: Дата/время

```typescript
// ❌ Разный контент на сервере и клиенте
export default function Page() {
  return <p>{new Date().toLocaleString()}</p>
}

// ✅ Решение 1: suppressHydrationWarning
export default function Page() {
  return <p suppressHydrationWarning>{new Date().toLocaleString()}</p>
}

// ✅ Решение 2: useState + useEffect
'use client'
export function DateTime() {
  const [date, setDate] = useState<string>()

  useEffect(() => {
    setDate(new Date().toLocaleString())
  }, [])

  if (!date) { return null }
  return <p>{date}</p>
}
```

#### Проблема: window/localStorage

```typescript
// ❌ window не существует на сервере
export default function Page() {
  const theme = window.localStorage.getItem('theme') // Error!
}

// ✅ Решение: Client Component с проверкой
'use client'
export function ThemeToggle() {
  const [theme, setTheme] = useState<string>()

  useEffect(() => {
    setTheme(localStorage.getItem('theme') || 'light')
  }, [])

  if (!theme) { return null // Избегаем hydration mismatch
   }
  return <Toggle value={theme} />
}
```

#### Проблема: Рандомные значения

```typescript
// ❌ Math.random() даёт разные значения
export default function Page() {
  return <div style={{ color: `hsl(${Math.random() * 360}, 50%, 50%)` }} />
}

// ✅ Решение: Фиксированный seed или Client Component
'use client'
export function RandomColor({ children }) {
  const [color, setColor] = useState<string>()

  useEffect(() => {
    setColor(`hsl(${Math.random() * 360}, 50%, 50%)`)
  }, [])

  return <div style={{ color }}>{children}</div>
}
```

---

## 'use client' Ошибки

### useState/useEffect в Server Component

```typescript
// ❌ Ошибка
export default function Page() {
  const [count, setCount] = useState(0) // Error: useState only works in Client Components
}

// ✅ Решение 1: Добавить 'use client'
'use client'
export default function Page() {
  const [count, setCount] = useState(0)
}

// ✅ Решение 2: Вынести в отдельный Client Component
// components/counter.tsx
'use client'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}

// app/page.tsx
import { Counter } from '@/components/counter'
export default function Page() {
  return <Counter />
}
```

### onClick в Server Component

```typescript
// ❌ Event handlers не работают в Server Components
export default function Page() {
  return <button onClick={() => alert('hi')}>Click</button> // Error!
}

// ✅ Решение: Client Component для интерактивности
'use client'
export function AlertButton() {
  return <button onClick={() => alert('hi')}>Click</button>
}
```

---

## Dynamic APIs

### cookies()/headers() делают страницу динамической

```typescript
// ❌ Проблема: Страница стала динамической из-за auth
export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  // Теперь вся страница динамическая (headers() делает dynamic)
}

// ✅ Решение 1: Явно указать dynamic
export const dynamic = 'force-dynamic'

// ✅ Решение 2: Вынести auth-зависимую часть в Suspense
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { Suspense } from 'react'

export default function Page() {
  return (
    <>
      <StaticContent />
      <Suspense fallback={<Skeleton />}>
        <AuthenticatedSection />
      </Suspense>
    </>
  )
}

async function AuthenticatedSection() {
  const session = await auth.api.getSession({ headers: await headers() })
  return <UserProfile user={session?.user} />
}
```

---

## params/searchParams в Next.js 16

### Async params

```typescript
// ❌ Ошибка в Next.js 16: params теперь Promise
export default function Page({ params }) {
  const id = params.id // Error: params is a Promise
}

// ✅ Решение: await params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>Product {id}</div>
}
```

### Async searchParams

```typescript
// ❌ Ошибка
export default function Page({ searchParams }) {
  const query = searchParams.q // Error
}

// ✅ Решение
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <SearchResults query={q} />
}
```

---

## Better Auth в proxy.ts

### Проблема

```typescript
// ❌ Неправильный вызов auth
// proxy.ts
import { auth } from '@/lib/auth'

export async function proxy(request) {
  const session = await auth() // Ошибка! Нужен headers
}
```

### Решение

```typescript
// ✅ Правильный вызов Better Auth
// proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}
```

### Быстрая проверка cookie

```typescript
// proxy.ts — если нужна только проверка наличия сессии (без БД)
import { getSessionCookie } from 'better-auth/cookies'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}
```

> ⚠️ Cookie-проверка быстрее, но не валидирует сессию в БД.

---

## Build Errors

### Module not found

```
Module not found: Can't resolve '@/lib/auth'
```

Проверь:

1. Путь в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. Файл существует по указанному пути

### Type errors

```
Type error: Property 'x' does not exist on type 'y'
```

```bash
# Пересобрать типы
rm -rf .next
nx build app-name

# Для ZenStack
nx zenstack:generate app-name
```

---

## Caching Issues

### Данные не обновляются

```typescript
// ❌ Данные закэшированы навсегда
export default async function Page() {
  const data = await fetch(url, { cache: 'force-cache' })
}

// ✅ Решение 1: Revalidate
export const revalidate = 60  // Каждую минуту

// ✅ Решение 2: No cache
const data = await fetch(url, { cache: 'no-store' })

// ✅ Решение 3: Инвалидация в Server Action
'use server'
import { revalidatePath } from 'next/cache'

export async function updateData() {
  await db.data.update(...)
  revalidatePath('/page')
}
```

### Router Cache (клиент)

```typescript
'use client'
import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const router = useRouter()

  return (
    <button onClick={() => router.refresh()}>
      Обновить данные
    </button>
  )
}
```

---

## Next.js Dev Server

### Порт занят

```
Error: listen EADDRINUSE: address already in use :::3000
```

```bash
# Найти процесс
netstat -ano | findstr :3000

# Убить процесс (Windows)
taskkill /PID <pid> /F

# Или использовать другой порт
nx dev app-name -- --port 3001
```

### HMR не работает

```bash
# Очистить кэш
rm -rf .next
rm -rf node_modules/.cache

# Перезапустить dev server
nx dev app-name
```

---

## Nx + Next.js

### Build зависает

```bash
# Отключить daemon
NX_DAEMON=false nx build app-name

# Увеличить память
NODE_OPTIONS="--max-old-space-size=8192" nx build app-name
```

### Кэш Nx не работает

```bash
# Пропустить кэш
nx build app-name --skip-nx-cache

# Полный сброс
nx reset
```

### TypeScript errors после изменений

```bash
# Пересобрать все
nx run-many -t build --all --skip-nx-cache
```

⛔ Не ищи здесь `nx sync` — генератор `@nx/js:typescript-sync` отключён в `nx.json`, references он
не обновит. Правятся вручную, см. [environment.md](/.claude/docs/environment.md#разработка-shared-библиотек).

---

## Common Patterns Letar

### ZenStack типы не генерируются

```bash
# Перегенерировать
nx zenstack:generate premium-rosstil

# Проверить schema.zmodel на ошибки
```

### Better Auth сессия undefined

```typescript
// Проверь что используешь правильный API
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// ❌ Неправильно
const session = await auth()

// ✅ Правильно — через auth.api.getSession
const session = await auth.api.getSession({
  headers: await headers(),
})

if (!session) {
  redirect('/sign-in')
}
```

### Проверь конфигурацию Better Auth

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()], // Обязательно для Server Actions!
})
```

### Проверь Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

### Chakra компоненты не стилизуются

```typescript
// Убедись что Provider в layout
// app/[locale]/layout.tsx
import { ChakraProvider } from '@letar/chakra-provider'

export default function Layout({ children }) {
  return (
    <ChakraProvider>
      {children}
    </ChakraProvider>
  )
}
```

---

## Полезные команды

```bash
# Очистить всё
rm -rf .next
rm -rf node_modules/.cache
nx reset

# Verbose build
nx build app-name --verbose

# Проверить конфиг
nx show project app-name

# Dev с отладкой
DEBUG=* nx dev app-name
```

---

## MCP инструменты

```bash
# Ошибки dev сервера
nextjs_index()  # Найти серверы
nextjs_call({ port: "3000", toolName: "get_errors" })

# Документация
nextjs_docs({ action: "search", query: "hydration error" })
```

---

## См. также

- [components.md](components.md) — Server vs Client Components
- [caching.md](caching.md) — Кэширование
- [configuration.md](configuration.md) — proxy.ts, next.config.js
