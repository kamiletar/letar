# Миграция с NextAuth на Better Auth

Пошаговое руководство по миграции с Auth.js (NextAuth.js) на Better Auth.

---

## Обзор изменений

| Аспект           | NextAuth          | Better Auth                              |
| ---------------- | ----------------- | ---------------------------------------- |
| Сессии           | JWT               | Database-based                           |
| Route Handler    | `[...nextauth]`   | `[...all]`                               |
| Получение сессии | `await auth()`    | `await auth.api.getSession({ headers })` |
| Клиент           | `next-auth/react` | `@/lib/auth-client`                      |
| Runtime          | Edge + Node.js    | Node.js (proxy.ts)                       |

---

## Шаг 1: Установка

```bash
bun add better-auth
bun remove next-auth @auth/prisma-adapter
```

---

## Шаг 2: Конфигурация сервера

### БЫЛО (NextAuth)

```typescript
// src/lib/auth.ts
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Yandex from 'next-auth/providers/yandex'
import { prisma } from './db'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Yandex({
      clientId: process.env.AUTH_YANDEX_ID!,
      clientSecret: process.env.AUTH_YANDEX_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role
      return session
    },
  },
})
```

### СТАЛО (Better Auth)

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

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    yandex: {
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    },
  },

  // Обязательно для Server Actions!
  plugins: [nextCookies()],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять каждый день
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

---

## Шаг 3: Конфигурация клиента

### Создать новый файл

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

// Экспорт хуков и функций
export const { useSession, signIn, signOut } = authClient
```

---

## Шаг 4: Route Handler

### Переименовать папку

```
src/app/api/auth/[...nextauth]/route.ts
                ↓
src/app/api/auth/[...all]/route.ts
```

### БЫЛО (NextAuth)

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

### СТАЛО (Better Auth)

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

---

## Шаг 5: Получение сессии

### Server Components

```typescript
// БЫЛО (NextAuth)
import { auth } from '@/lib/auth'
const session = await auth()

// СТАЛО (Better Auth)
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({
  headers: await headers(),
})
```

### Server Actions

```typescript
// БЫЛО (NextAuth)
'use server'
import { auth } from '@/lib/auth'

export async function serverAction() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
} // СТАЛО (Better Auth)

;('use server')
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function serverAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) throw new Error('Unauthorized')
}
```

### Client Components

```typescript
// БЫЛО (NextAuth)
'use client'
import { signIn, signOut, useSession } from 'next-auth/react'

export function Component() {
  const { data: session, status } = useSession()
  const isPending = status === 'loading'
} // СТАЛО (Better Auth)

;('use client')
import { signIn, signOut, useSession } from '@/lib/auth-client'

export function Component() {
  const { data: session, isPending } = useSession()
}
```

---

## Шаг 6: Sign In / Sign Out

### OAuth Sign In

```typescript
// БЫЛО (NextAuth)
import { signIn } from 'next-auth/react'
signIn('google', { callbackUrl: '/dashboard' })

// СТАЛО (Better Auth)
import { signIn } from '@/lib/auth-client'
signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
})
```

### Email Sign In

```typescript
// БЫЛО (NextAuth)
import { signIn } from 'next-auth/react'
signIn('credentials', { email, password })

// СТАЛО (Better Auth)
import { signIn } from '@/lib/auth-client'
const { data, error } = await signIn.email({
  email,
  password,
  callbackURL: '/dashboard',
})
```

### Sign Out

```typescript
// БЫЛО (NextAuth)
import { signOut } from 'next-auth/react'
signOut({ callbackUrl: '/' })

// СТАЛО (Better Auth)
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const router = useRouter()
signOut({
  fetchOptions: {
    onSuccess: () => router.push('/'),
  },
})
```

---

## Шаг 7: Middleware → proxy.ts

### БЫЛО (NextAuth middleware.ts)

```typescript
import { auth } from '@/lib/auth'

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/sign-in', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### СТАЛО (Better Auth proxy.ts)

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

  // Защищённые роуты без сессии → редирект
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  if (isProtected && !session) {
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${pathname}`, request.url))
  }

  // Auth страницы с сессией → редирект
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

---

## Шаг 8: Environment Variables

### БЫЛО (NextAuth)

```bash
AUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com

AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_YANDEX_ID=...
AUTH_YANDEX_SECRET=...
```

### СТАЛО (Better Auth)

```bash
BETTER_AUTH_SECRET=...  # openssl rand -base64 32
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...
```

---

## Шаг 9: Миграция схемы БД

### Изменения полей

| Таблица      | NextAuth                    | Better Auth               |
| ------------ | --------------------------- | ------------------------- |
| User         | `emailVerified` (DateTime?) | `emailVerified` (Boolean) |
| Session      | `sessionToken`              | `token`                   |
| Session      | `expires`                   | `expiresAt`               |
| Session      | —                           | `ipAddress`, `userAgent`  |
| Account      | `refresh_token`             | `refreshToken`            |
| Account      | `access_token`              | `accessToken`             |
| Account      | `provider`                  | `providerId`              |
| Verification | `token`                     | `value`                   |
| Verification | `expires`                   | `expiresAt`               |

### Команды миграции

```bash
# Генерация схемы
npx @better-auth/cli generate

# Применение миграции
npx @better-auth/cli migrate
```

### Или вручную в schema.zmodel

```zmodel
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified Boolean   @default(false)  // Изменён тип!
  image         String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique  // Было sessionToken
  userId    String
  expiresAt DateTime  // Было expires
  ipAddress String?   // Новое
  userAgent String?   // Новое
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  providerId        String  // Было provider
  accountId         String  // Новое
  accessToken       String? // Было access_token
  refreshToken      String? // Было refresh_token
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope             String?
  idToken           String?
  password          String? // Новое (для email auth)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String   // Было token
  expiresAt  DateTime // Было expires
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
}
```

---

## Чеклист миграции

- [ ] Установить `better-auth`, удалить `next-auth`
- [ ] Создать `lib/auth.ts` с `betterAuth()`
- [ ] Создать `lib/auth-client.ts` с `createAuthClient()`
- [ ] Переименовать `[...nextauth]` → `[...all]`
- [ ] Заменить все `await auth()` → `await auth.api.getSession({ headers })`
- [ ] Заменить `useSession` из `next-auth/react` → `@/lib/auth-client`
- [ ] Заменить `signIn`/`signOut` на новый API
- [ ] Переименовать `middleware.ts` → `proxy.ts`
- [ ] Обновить env variables
- [ ] Мигрировать схему БД
- [ ] Обновить типы TypeScript
- [ ] Протестировать OAuth flow
- [ ] Протестировать защиту роутов

---

## Частые проблемы

### "Session is undefined"

Убедись, что добавлен плагин `nextCookies()`:

```typescript
plugins:;
;[nextCookies()]
```

### OAuth redirect ошибки

Проверь `BETTER_AUTH_URL` и callback URLs в консоли провайдера:

- Google: `https://your-domain.com/api/auth/callback/google`
- Yandex: `https://your-domain.com/api/auth/callback/yandex`

### Типы TypeScript

```typescript
// Расширение типов сессии
declare module 'better-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }
}
```

---

## См. также

- [nextjs-integration.md](nextjs-integration.md) — Детали интеграции с Next.js
- [prisma-adapter.md](prisma-adapter.md) — Настройка Prisma адаптера
- [troubleshooting.md](troubleshooting.md) — Решение проблем
