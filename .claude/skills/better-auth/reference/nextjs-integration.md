# Интеграция с Next.js 16

Интеграция Better Auth с Next.js 16 App Router.

---

## Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**Важно:** Папка называется `[...all]`, не `[...nextauth]`!

---

## Конфигурация auth.ts

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // ⚠️ ОБЯЗАТЕЛЬНО для Server Actions!
  plugins: [nextCookies()],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять ежедневно
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

---

## Получение сессии

### Server Components

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return <div>Не авторизован</div>
  }

  return <div>Привет, {session.user.name}</div>
}
```

### Server Actions

```typescript
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function createPost(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    throw new Error('Unauthorized')
  }

  // Создание поста...
}
```

### Route Handlers (API)

```typescript
// src/app/api/posts/route.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Логика API...
}
```

---

## proxy.ts (защита роутов)

⚠️ **Next.js 16:** Используй `proxy.ts` вместо `middleware.ts` для полного доступа к БД (Node.js Runtime).

### Базовая защита

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const protectedPaths = ['/admin', '/profile', '/dashboard']
const authPaths = ['/sign-in', '/sign-up']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Защищённые роуты без сессии → редирект на вход
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  if (isProtected && !session) {
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${pathname}`, request.url))
  }

  // Auth страницы с сессией → редирект на главную
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Защита по ролям

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Admin роуты — только для администраторов
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Проверка роли (для множественных ролей используй has())
    const isAdmin = session.user.roles?.includes('ADMIN') || session.user.roles?.includes('OWNER')

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  return NextResponse.next()
}
```

---

## Cookie-only проверка (Edge Runtime)

Если нужен Edge Runtime (без доступа к БД), используй только cookie:

```typescript
// src/middleware.ts (Edge)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token')

  if (!sessionCookie && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}
```

⚠️ **Ограничение:** Проверяет только наличие cookie, не валидирует сессию в БД.

---

## Клиентская конфигурация

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

// Экспорт хуков и функций
export const { useSession, signIn, signOut } = authClient
```

### Использование в компонентах

```typescript
'use client'

import { signIn, signOut, useSession } from '@/lib/auth-client'

export function AuthButton() {
  const { data: session, isPending } = useSession()

  if (isPending) return <Spinner />

  if (session) {
    return (
      <Button onClick={() => signOut()}>
        Выйти ({session.user.name})
      </Button>
    )
  }

  return (
    <Button onClick={() => signIn.social({ provider: 'google' })}>
      Войти через Google
    </Button>
  )
}
```

---

## Environment Variables

```bash
# .env
BETTER_AUTH_SECRET=...              # openssl rand -base64 32
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# OAuth провайдеры
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Паттерны проекта Letar

### ZenStack интеграция

```typescript
// src/lib/db.ts
import { enhance } from '@zenstackhq/runtime'
import { prisma } from './prisma'

export function getEnhancedPrisma(user?: { id: string; roles?: string[] }) {
  return enhance(prisma, { user })
}

// Использование в Server Action
export async function getMyOrders() {
  const session = await auth.api.getSession({ headers: await headers() })
  const db = getEnhancedPrisma(session?.user)

  // Автоматически фильтруется по @@allow политикам
  return db.order.findMany()
}
```

### Типизация расширенной сессии

```typescript
// src/types/auth.d.ts
declare module 'better-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      roles?: string[]
    }
  }
}
```

---

## Чеклист интеграции

- [ ] Создать `src/lib/auth.ts` с `betterAuth()`
- [ ] Создать `src/lib/auth-client.ts` с `createAuthClient()`
- [ ] Создать `src/app/api/auth/[...all]/route.ts`
- [ ] Добавить `nextCookies()` плагин
- [ ] Создать `src/proxy.ts` для защиты роутов
- [ ] Настроить environment variables
- [ ] Интегрировать с ZenStack (если используется)

---

## См. также

- [nextauth-migration.md](nextauth-migration.md) — Миграция с NextAuth
- [prisma-adapter.md](prisma-adapter.md) — Prisma адаптер
- [session-management.md](session-management.md) — Управление сессиями
