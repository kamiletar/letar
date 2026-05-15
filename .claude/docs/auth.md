# Аутентификация и авторизация

## Ключница — Централизованный сервис авторизации (auth.letar.best)

**`apps/auth-hub/`** — единый центр авторизации для всех приложений `*.letar.best`. Устраняет необходимость настраивать OAuth секреты в каждом приложении.

### Архитектура

- **Стек:** Next.js 16 + Better Auth + OIDC Provider plugin
- **Домен:** `auth.letar.best` (s2.letar.best, порт 3010)
- **БД:** PostgreSQL (порт 5440) + Prisma + ZenStack
- **Протокол:** OIDC Authorization Code Flow с PKCE

### OAuth провайдеры (настроены один раз в Ключнице)

| Провайдер | Переменные                                 |
| --------- | ------------------------------------------ |
| Google    | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`     |
| GitHub    | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`     |
| Facebook  | `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` |
| VK        | `AUTH_VK_ID`, `AUTH_VK_SECRET`             |
| Yandex    | `AUTH_YANDEX_ID`, `AUTH_YANDEX_SECRET`     |

### OIDC Provider — как подключить клиентское приложение

#### 1. Зарегистрировать клиент в `trustedClients` (apps/auth-hub/src/lib/auth.ts)

```typescript
// В конфигурации oidcProvider
trustedClients: [
  {
    clientId: 'my-app-prod',
    clientSecret: '<сгенерированный секрет>',
    name: 'Моё приложение',
    type: 'web',
    disabled: false,
    metadata: {},
    redirectUrls: ['https://myapp.letar.best/api/auth/oauth2/callback/letar-auth'],
    skipConsent: true, // Пропустить экран согласия для своих приложений
  },
],
```

> ⚠️ **ВАЖНО:** `skipConsent` работает **только** для `trustedClients` в конфигурации плагина, **НЕ** для клиентов из БД (таблица `oauthApplication`). Клиенты из БД всегда показывают экран согласия.

#### 2. Настроить клиентское приложение (genericOAuth)

```typescript
// apps/<my-app>/src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'

export const auth = betterAuth({
  // ...
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'letar-auth',
          discoveryUrl: 'https://auth.letar.best/.well-known/openid-configuration',
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          scopes: ['openid', 'profile', 'email'],
          pkce: true,
        },
      ],
    }),
  ],
})
```

#### 3. Кнопка входа

```typescript
authClient.signIn.oauth2({ providerId: 'letar-auth' })
```

#### 4. Env переменные клиента (вместо 10+ секретов)

```bash
OIDC_CLIENT_ID=<из trustedClients или admin-панели>
OIDC_CLIENT_SECRET=<секрет>
```

### Callback URL формат

Better Auth `genericOAuth` использует путь:

```
${baseURL}/api/auth/oauth2/callback/${providerId}
```

Например: `https://archetest.letar.best/api/auth/oauth2/callback/letar-auth`

> ⚠️ **НЕ** `/api/auth/callback/` — это другой формат!

### Consent endpoint (POST /api/auth/oauth2/consent)

Для нетруsted клиентов (без `skipConsent`):

```json
// Запрос (JSON)
{ "accept": true, "consent_code": "<код из URL>" }

// Ответ
{ "redirectURI": "https://client.example.com/callback?code=AUTH_CODE&state=STATE" }
```

> Ответ содержит `redirectURI` (не `redirectTo`!) — клиент должен выполнить `window.location.href = data.redirectURI`.

### Подключённые приложения

| Приложение | clientId         | Домен                |
| ---------- | ---------------- | -------------------- |
| archetest  | `archetest-prod` | archetest.letar.best |

### Ключевые файлы

| Файл                                    | Назначение                                                       |
| --------------------------------------- | ---------------------------------------------------------------- |
| `apps/auth-hub/src/lib/auth.ts`         | Конфигурация Better Auth + OIDC Provider + trustedClients        |
| `apps/auth-hub/schema.zmodel`           | Модели: User, Account, Session, OauthApplication, ProjectProfile |
| `apps/auth-hub/src/app/oauth/consent/`  | Экран согласия OAuth (для нетруsted клиентов)                    |
| `apps/auth-hub/src/app/(auth)/sign-in/` | Страница входа                                                   |
| `apps/auth-hub/src/app/admin/`          | Админка: клиенты, пользователи                                   |
| `apps/auth-hub/src/app/profile/`        | Профиль, привязка аккаунтов, смена пароля                        |

---

## Интеграция Better Auth (per-app)

Приложение использует **Better Auth** с несколькими OAuth провайдерами и **ZenStack** для авторизации.

### Ключевые компоненты

- **Схема:** `apps/premium-rosstil/schema.zmodel` - ZenStack схема с политиками доступа
- **База данных:** PostgreSQL с Prisma адаптером для хранения пользователей и сессий
- **Конфиг Auth:** `src/lib/auth.ts` - Конфигурация Better Auth с провайдерами
- **Auth Client:** `src/lib/auth-client.ts` - Клиентский инстанс Better Auth
- **Прокси:** `src/proxy.ts` - Защита роутов (работает в Node.js Runtime)
- **Route Handler:** `src/app/api/auth/[...all]/route.ts` - API эндпоинты Better Auth
- **UI компоненты:** Готовые кнопки входа/выхода и меню пользователя с Chakra UI v3

### Ключевые особенности

- **Session-based аутентификация** (сессии в БД)
- **Row-level контроль доступа** через политики ZenStack
- **Пользователи могут читать/обновлять только свои данные**
- **OAuth аккаунты привязаны к пользователям**
- **Несколько OAuth провайдеров** (Google, Yandex, VK)
- **Email + пароль** аутентификация
- **proxy.ts** работает в Node.js Runtime (полный доступ к БД)

## Установка и конфигурация

### lib/auth.ts (сервер)

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

  // Расширение сессии (опционально)
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять каждый день
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

### lib/auth-client.ts (клиент)

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

// Экспорт хуков и функций
export const { useSession, signIn, signOut } = authClient
```

### Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

## OAuth провайдеры

### Google OAuth

- Конфигурация: Стандартный OAuth 2.0
- Необходимые переменные: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Callback URL: `https://your-domain.com/api/auth/callback/google`

### Yandex OAuth

- Конфигурация: OAuth 2.0
- Необходимые переменные: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`
- Callback URL: `https://your-domain.com/api/auth/callback/yandex`

### VK OAuth

- Конфигурация: OAuth 2.0
- Необходимые переменные: `VK_CLIENT_ID`, `VK_CLIENT_SECRET`
- Callback URL: `https://your-domain.com/api/auth/callback/vk`

## Использование Auth в компонентах

### Серверные компоненты

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function ServerComponent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return <SignInPrompt />
  }

  return <div>Добро пожаловать, {session.user.name}!</div>
}
```

### Клиентские компоненты

```typescript
'use client'

import { useSession } from '@/lib/auth-client'

export function ClientComponent() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <Spinner />
  }

  if (!session?.user) {
    return <SignInPrompt />
  }

  return <div>Добро пожаловать, {session.user.name}!</div>
}
```

### Серверные экшены

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function serverAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Проверка роли при необходимости
  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  const db = getEnhancedPrisma(session.user)
  // ... выполнение действия
}
```

## Защита роутов

### Next.js 16: proxy.ts

**ВАЖНО:** В Next.js 16 используется `proxy.ts` вместо `middleware.ts`. proxy.ts работает в Node.js Runtime, что даёт полный доступ к БД.

#### Полная проверка сессии (с БД)

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const protectedPaths = ['/admin', '/profile', '/orders']
const authPaths = ['/sign-in', '/sign-up']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Получаем сессию через Better Auth API
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Защищённые роуты без сессии → редирект на sign-in
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

#### Быстрая проверка cookie (без БД)

```typescript
// src/proxy.ts — быстрее, но не валидирует сессию
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

> ⚠️ Cookie-проверка не валидирует сессию в БД — используй полную проверку для критичных операций.

#### Защита по ролям

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Админ-зона требует роль ADMIN
  if (pathname.startsWith('/admin')) {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}
```

## Политики доступа ZenStack

### Пример модели User

```zmodel
model User {
  id    String @id @default(cuid())
  role  UserRole @default(USER)

  // Пользователи могут читать свои данные
  @@allow('read', auth() == this)

  // Пользователи могут обновлять свои данные
  @@allow('update', auth() == this)

  // Админы могут всё
  @@allow('all', auth().role == ADMIN)
}
```

### Пример модели Order

```zmodel
model Order {
  id      String @id @default(cuid())
  userId  String
  user    User @relation(fields: [userId], references: [id])

  // Пользователи могут читать свои заказы
  @@allow('read', auth() == user)

  // Пользователи могут создавать свои заказы
  @@allow('create', auth() == user)

  // Админы могут всё
  @@allow('all', auth().role == ADMIN)
}
```

## Структура сессии

```typescript
interface Session {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: UserRole
    emailVerified?: boolean
  }
  session: {
    id: string
    userId: string
    expiresAt: Date
  }
}
```

## UI компоненты

### Кнопка входа через OAuth

```typescript
'use client'

import { signIn } from '@/lib/auth-client'
import { Button } from '@chakra-ui/react'

export function GoogleSignInButton() {
  return (
    <Button
      onClick={() =>
        signIn.social({
          provider: 'google',
          callbackURL: '/dashboard',
        })}
      colorPalette="fg"
    >
      Войти через Google
    </Button>
  )
}
```

### Кнопка входа через Email

```typescript
'use client'

import { signIn } from '@/lib/auth-client'
import { useState } from 'react'

export function EmailSignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn.email({
      email,
      password,
      callbackURL: '/dashboard',
    })

    if (result.error) {
      setError(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />
      {error && <Text color="red.500">{error}</Text>}
      <Button type="submit">Войти</Button>
    </form>
  )
}
```

### Кнопка выхода

```typescript
'use client'

import { signOut } from '@/lib/auth-client'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  return (
    <Button
      onClick={() =>
        signOut({
          fetchOptions: {
            onSuccess: () => router.push('/'),
          },
        })}
      variant="ghost"
    >
      Выйти
    </Button>
  )
}
```

### Ролевой рендеринг

```typescript
'use client'

import { useSession } from '@/lib/auth-client'

interface OnlyForProps {
  role: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function OnlyFor({ role, children, fallback = null }: OnlyForProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  const roles = Array.isArray(role) ? role : [role]

  // Специальный случай для неавторизованных
  if (roles.includes('UNAUTHORIZED')) {
    return !session?.user ? <>{children}</> : <>{fallback}</>
  }

  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Использование
<OnlyFor role="ADMIN">
  <AdminPanel />
</OnlyFor>

<OnlyFor role={['USER', 'ADMIN']}>
  <UserContent />
</OnlyFor>

<OnlyFor role="UNAUTHORIZED">
  <SignInPrompt />
</OnlyFor>
```

## Типовые паттерны

### Проверка аутентификации

```typescript
// Серверный компонент
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
const isAuthenticated = !!session?.user

// Клиентский компонент
import { useSession } from '@/lib/auth-client'

const { data: session, isPending } = useSession()
const isAuthenticated = !!session?.user
```

### Проверка роли

```typescript
// Серверный компонент
const session = await auth.api.getSession({ headers: await headers() })
const isAdmin = session?.user?.role === 'ADMIN'

// Клиентский компонент
const { data: session } = useSession()
const isAdmin = session?.user?.role === 'ADMIN'
```

### Получение ID пользователя

```typescript
// Серверный компонент
const session = await auth.api.getSession({ headers: await headers() })
const userId = session?.user?.id

// Для запросов к базе данных с ZenStack
const db = getEnhancedPrisma(session.user)
const user = await db.user.findUnique({ where: { id: userId } })
```

## Переменные окружения

Необходимы для аутентификации:

```bash
# База данных
DATABASE_URL=postgresql://...

# Better Auth
BETTER_AUTH_SECRET=... # Сгенерировать: openssl rand -base64 32
BETTER_AUTH_URL=https://your-domain.com

# Публичный URL (для клиента)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Yandex OAuth
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...

# VK OAuth (опционально)
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
```

---

## UI/UX паттерны авторизации (User-Friendly Auth)

Эталонная реализация: `apps/driving-school/src/app/(auth)/`

### Архитектура страниц авторизации

```
apps/<app-name>/src/app/
├── (auth)/                          # Route group для auth страниц
│   ├── layout.tsx                   # Auth layout (ссылка "На главную", центрирование)
│   ├── sign-in/
│   │   ├── page.tsx                 # Страница входа
│   │   └── _components/
│   │       └── login-form.tsx       # Форма входа
│   ├── sign-up/
│   │   ├── page.tsx                 # Страница регистрации
│   │   └── _components/
│   │       ├── register-form.tsx    # Форма регистрации
│   │       └── verify-pin-form.tsx  # Форма верификации PIN
│   ├── forgot-password/
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── forgot-password-form.tsx
│   │       └── reset-pin-form.tsx
│   ├── reset-password/
│   │   ├── page.tsx
│   │   └── _components/
│   │       └── reset-password-form.tsx
│   ├── verify-email/
│   │   └── [token]/
│   │       └── page.tsx             # Верификация по ссылке из email
│   ├── _actions/                    # Server Actions
│   │   ├── login.action.ts
│   │   ├── register.action.ts
│   │   ├── verify-pin.action.ts
│   │   ├── resend-pin.action.ts
│   │   ├── forgot-password.action.ts
│   │   └── reset-password.action.ts
│   └── _schemas/                    # Zod схемы валидации
│       ├── login.schema.ts
│       ├── register.schema.ts
│       └── reset-password.schema.ts
└── _components/
    ├── logo-with-text.tsx           # Брендинг
    └── icons/
        └── google-icon.tsx          # Иконки OAuth провайдеров
```

### Auth Layout

Единый layout для всех auth страниц с ссылкой на главную:

```tsx
// (auth)/layout.tsx
import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowLeft } from 'react-icons/lu'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack minH="100vh" bg="bg.subtle" alignItems="center" justifyContent="center">
      <ChakraLink
        asChild
        colorPalette="brand"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={4}
        py={4}
        alignSelf="flex-start"
      >
        <Link href="/">
          <LuArrowLeft />
          На главную
        </Link>
      </ChakraLink>
      <Box flex={1}>{children}</Box>
    </VStack>
  )
}
```

### Страница входа (Sign In)

**Ключевые элементы:**

1. **Логотип и брендинг** — `LogoWithText` компонент
2. **Заголовок и подзаголовок** — "Вход" + "Войдите в свой аккаунт"
3. **Карточка формы** — `borderRadius="xl"`, `shadow="lg"`, `bg="bg.panel"`
4. **Два способа входа** — OAuth (слева) + Email/пароль (справа)
5. **Разделитель "или"** — адаптивный (горизонтальный на мобилке, вертикальный на десктопе)
6. **Ссылка на регистрацию** — внизу страницы
7. **Ссылка "Забыли пароль?"** — под формой входа

```tsx
// (auth)/sign-in/page.tsx
'use client'

import { GoogleIcon } from '@/app/_components/icons/google-icon'
import { LogoWithText } from '@/app/_components/logo-with-text'
import { signIn } from '@/lib/auth-client'
import { Box, Button, Container, Flex, Separator, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { FaYandex } from 'react-icons/fa'
import { LoginForm } from './_components/login-form'

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    signIn.social({ provider: 'google', callbackURL: '/dashboard' })
  }

  const handleYandexSignIn = () => {
    signIn.social({ provider: 'yandex', callbackURL: '/dashboard' })
  }

  return (
    <Container maxW={{ base: 'md', lg: '4xl' }} py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <LogoWithText size="lg" />
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              Вход
            </Text>
            <Text color="fg.muted" fontSize="md">
              Войдите в свой аккаунт
            </Text>
          </VStack>
        </VStack>

        {/* Карточка формы */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                Быстрый вход
              </Text>
              <Stack gap={3} width="full">
                <Button onClick={handleGoogleSignIn} variant="outline" width="full" size="lg">
                  <GoogleIcon /> Продолжить с Google
                </Button>
                <Button onClick={handleYandexSignIn} variant="outline" width="full" size="lg">
                  <FaYandex color="#e66a53" /> Продолжить с Яндекс
                </Button>
              </Stack>
            </VStack>

            {/* Разделитель */}
            <Flex align="center" justify="center" display={{ base: 'flex', lg: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                или
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', lg: 'block' }} />

            {/* Форма email/пароль */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                По email
              </Text>
              <LoginForm />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на регистрацию */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Нет аккаунта?{' '}
          <Link href="/sign-up">
            <Text as="span" color="orange.600" fontWeight="medium" textDecoration="underline">
              Зарегистрироваться
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
```

### PIN-верификация email (6-значный код)

**Это ключевая UX-фича!** После регистрации пользователь вводит 6-значный PIN вместо перехода по ссылке.

**Преимущества:**

- Быстрее, чем переход по ссылке (особенно на мобильных)
- Работает даже если письмо открыто на другом устройстве
- Пользователь остаётся на странице регистрации
- Авто-ввод при заполнении всех 6 цифр

**Ключевые особенности реализации:**

```tsx
// (auth)/sign-up/_components/verify-pin-form.tsx
'use client'

import { signIn } from '@/lib/auth-client'
import { Box, Button, Heading, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { FormGroup, FormRoot, useAppForm } from '@letar/forms'
import { useCallback, useEffect, useState } from 'react'
import { LuCircleCheck } from 'react-icons/lu'
import { z } from 'zod/v4'

const VerifyPinSchema = z.object({
  pin: z.string().length(6, 'Введите 6-значный код'),
})

interface VerifyPinFormProps {
  email: string
}

export function VerifyPinForm({ email }: VerifyPinFormProps) {
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [verifiedInOtherTab, setVerifiedInOtherTab] = useState(false)
  const [formKey, setFormKey] = useState(0)

  // 1. Таймер для повторной отправки
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // 2. SSE подписка для real-time верификации (когда кликнут ссылку в письме)
  useEffect(() => {
    const eventSource = new EventSource(`/api/auth/verification-stream/${encodeURIComponent(email)}`)
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.verified) {
        eventSource.close()
        setVerifiedInOtherTab(true)
      }
    }
    eventSource.onerror = () => eventSource.close()
    return () => eventSource.close()
  }, [email])

  // 3. Проверка PIN
  const handleVerify = useCallback(
    async (pinValue: string) => {
      if (pinValue.length !== 6) return
      setIsVerifying(true)
      setError('')

      const result = await verifyPinAction(email, pinValue)

      if (result.success) {
        setIsVerified(true)
        // Авто-логин после верификации
        await signIn.email({
          email,
          password: result.tempPassword, // Временный токен
          callbackURL: '/onboarding',
        })
      } else {
        // Обработка ошибок
        switch (result.error) {
          case 'INVALID_PIN':
            setError('Неверный код')
            break
          case 'PIN_EXPIRED':
            setError('Код истёк. Запросите новый.')
            setCanResend(true)
            break
          case 'TOO_MANY_ATTEMPTS':
            setError('Слишком много попыток. Подождите 15 минут.')
            break
          default:
            setError('Произошла ошибка.')
        }
      }
      setIsVerifying(false)
    },
    [email]
  )

  // 4. Повторная отправка PIN
  const handleResend = useCallback(async () => {
    setIsResending(true)
    const result = await resendVerificationPinAction(email)
    if (result.success) {
      setResendCountdown(60)
      setCanResend(false)
      setFormKey((k) => k + 1) // Сброс формы
    } else {
      setError(result.error === 'RATE_LIMITED' ? 'Подождите' : 'Не удалось')
    }
    setIsResending(false)
  }, [email])

  // 5. UI состояния
  if (verifiedInOtherTab) {
    return (
      <VStack gap={6}>
        <Icon color="success.solid" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <Heading size="lg" color="success.fg">
          Email подтверждён!
        </Heading>
        <Text>Вы вошли в другой вкладке. Эту можно закрыть.</Text>
      </VStack>
    )
  }

  if (isVerified) {
    return (
      <VStack gap={6}>
        <Icon color="success.solid" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <Heading size="lg" color="success.fg">
          Email подтверждён!
        </Heading>
        <Spinner size="lg" />
      </VStack>
    )
  }

  const form = useAppForm({
    schema: VerifyPinSchema,
    defaultValues: { pin: '' },
  })

  return (
    <VStack gap={6} align="stretch">
      <Box textAlign="center">
        <Heading size="lg" mb={2}>
          Подтвердите email
        </Heading>
        <Text color="fg.muted">
          Мы отправили код на <strong>{email}</strong>
        </Text>
      </Box>

      <FormRoot key={formKey} form={form} onSubmit={(d) => handleVerify(d.pin)}>
        <VStack gap={4}>
          {/* PinInput с автоотправкой при заполнении */}
          {/* ... PinInput компонент ... */}
          {error && (
            <Text color="fg.error" fontSize="sm">
              {error}
            </Text>
          )}
          <Button type="submit" colorPalette="brand" size="lg" width="full" loading={isVerifying}>
            Подтвердить
          </Button>
        </VStack>
      </FormRoot>

      {/* Повторная отправка с countdown */}
      <Box textAlign="center">
        {canResend ? (
          <Button variant="ghost" size="sm" onClick={handleResend} loading={isResending}>
            Отправить код повторно
          </Button>
        ) : (
          <Text color="fg.muted" fontSize="sm">
            Отправить повторно через {resendCountdown} сек
          </Text>
        )}
      </Box>

      <Text color="fg.muted" fontSize="xs" textAlign="center">
        Или перейдите по ссылке в письме
      </Text>
    </VStack>
  )
}
```

### Server Action для PIN-верификации

```typescript
// (auth)/_actions/verify-pin.action.ts
'use server'

import { prisma } from '@/lib/db'
import crypto from 'crypto'

const MAX_PIN_ATTEMPTS = 5

export async function verifyPinAction(email: string, pin: string) {
  // 1. Найти токен верификации
  const verificationToken = await prisma.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: 'desc' },
  })

  if (!verificationToken) return { success: false, error: 'NOT_FOUND' }

  // 2. Проверить лимит попыток
  if (verificationToken.pinAttempts >= MAX_PIN_ATTEMPTS) {
    return { success: false, error: 'TOO_MANY_ATTEMPTS' }
  }

  // 3. Проверить срок действия
  if (!verificationToken.pinExpires || verificationToken.pinExpires < new Date()) {
    return { success: false, error: 'PIN_EXPIRED' }
  }

  // 4. Проверить PIN
  if (verificationToken.pin !== pin) {
    await prisma.verificationToken.update({
      where: { token: verificationToken.token },
      data: { pinAttempts: { increment: 1 } },
    })
    return { success: false, error: 'INVALID_PIN' }
  }

  // 5. PIN верный — верифицируем email
  const autoLoginToken = crypto.randomBytes(32).toString('hex')

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.update({
      where: { token: verificationToken.token },
      data: {
        token: autoLoginToken,
        expires: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
        pin: null,
        pinExpires: null,
        pinAttempts: 0,
      },
    }),
  ])

  return { success: true, token: autoLoginToken }
}
```

### Схема БД для PIN-верификации

Расширение модели `VerificationToken` для поддержки PIN:

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  // PIN-верификация
  pin        String?  // 6-значный код
  pinExpires DateTime? // Срок действия PIN (10 минут)
  pinAttempts Int     @default(0) // Счётчик неудачных попыток (max 5)

  @@unique([identifier, token])
}
```

### Генерация 6-значного PIN

```typescript
// Криптографически безопасная генерация
function generateVerificationPin(): string {
  const randomBytes = crypto.randomBytes(4)
  const num = randomBytes.readUInt32BE(0)
  return (num % 1000000).toString().padStart(6, '0')
}
```

### Компонент LogoWithText

```tsx
// _components/logo-with-text.tsx
import { HStack, Image, Text } from '@chakra-ui/react'

interface LogoWithTextProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { imgSize: 8, fontSize: 'lg', gap: 2 },
  md: { imgSize: 10, fontSize: '2xl', gap: 3 },
  lg: { imgSize: 12, fontSize: '3xl', gap: 4 },
}

export function LogoWithText({ size = 'md' }: LogoWithTextProps) {
  const { imgSize, fontSize, gap } = sizes[size]

  return (
    <HStack gap={gap}>
      <Image src="/logo.svg" alt="Logo" boxSize={imgSize} />
      <Text fontSize={fontSize} fontWeight="bold" color="fg">
        Название приложения
      </Text>
    </HStack>
  )
}
```

### Индикатор надёжности пароля

```tsx
// _components/ui/password-input.tsx
import { Progress } from '@chakra-ui/react'

interface PasswordStrengthMeterProps {
  value: number // 0-4
  max?: number
}

const strengthColors = ['red.500', 'orange.500', 'yellow.500', 'green.500', 'green.600']
const strengthLabels = ['', 'Слабый', 'Средний', 'Хороший', 'Отличный']

export function PasswordStrengthMeter({ value, max = 4, ...props }: PasswordStrengthMeterProps) {
  const percentage = (value / max) * 100

  return (
    <VStack align="stretch" gap={1} {...props}>
      <Progress value={percentage} colorPalette={strengthColors[value]} size="xs" />
      {value > 0 && (
        <Text fontSize="xs" color="fg.muted">
          Надёжность: {strengthLabels[value]}
        </Text>
      )}
    </VStack>
  )
}

// Расчёт надёжности
function calculatePasswordStrength(password: string): number {
  if (!password) return 0
  if (password.length < 8) return 1

  let strength = 2
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  if (hasLower && hasUpper && hasDigit) strength = 3
  if (hasLower && hasUpper && hasDigit && hasSpecial && password.length >= 12) strength = 4

  return strength
}
```

### SSE для real-time верификации

Когда пользователь кликает ссылку в письме, другая вкладка узнаёт об этом:

```typescript
// api/auth/verification-stream/[email]/route.ts
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Проверяем статус каждые 2 секунды
      const interval = setInterval(async () => {
        const user = await prisma.user.findUnique({
          where: { email: decodedEmail },
          select: { emailVerified: true },
        })

        if (user?.emailVerified) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ verified: true })}\n\n`))
          clearInterval(interval)
          controller.close()
        }
      }, 2000)

      // Таймаут 5 минут
      setTimeout(
        () => {
          clearInterval(interval)
          controller.close()
        },
        5 * 60 * 1000
      )
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### Чек-лист User-Friendly авторизации

- [ ] **Auth Layout** с ссылкой "На главную"
- [ ] **Мультитенантность** — Organizations plugin (если требуется)

---

## Интеграция с ZenStack Organizations

Для приложений с мультитенантностью (организации, команды) используется **Better Auth Organizations plugin** + **ZenStack access policies**.

**Эталонная реализация:** `apps/driving-school/`

### Подход через реляции (рекомендуемый)

```zmodel
model Project {
  organizationId String
  organization   Organization @relation(...)

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только owner/manager могут изменять
  @@allow('update,delete', organization.members?[userId == auth().id && role in ['owner', 'manager']])
}
```

### Использование в Server Action

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function updateProject(projectId: string, data: ProjectData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  // ZenStack автоматически проверяет membership через политики
  const db = getEnhancedPrisma(session.user)
  return db.project.update({ where: { id: projectId }, data })
}
```

> **Подробнее:** `.claude/skills/zenstack-helper/reference/zenstack-better-auth.md`
> **Organizations plugin:** `.claude/skills/better-auth/reference/organization-plugin.md`

---

- [ ] **LogoWithText** компонент для брендинга
- [ ] **Страница входа** с OAuth + email/пароль
- [ ] **Страница регистрации** с валидацией
- [ ] **Индикатор надёжности пароля**
- [ ] **PIN-верификация** (6 цифр, OTP-style)
- [ ] **Countdown** для повторной отправки PIN
- [ ] **Лимит попыток** ввода PIN
- [ ] **SSE** для real-time верификации
- [ ] **Авто-логин** после верификации
- [ ] **Сброс пароля** по email
- [ ] **Чекбоксы** принятия оферты/политики
- [ ] **Адаптивный дизайн** (мобильная версия)

---

## Устранение неполадок

**Ошибка "Unauthorized"**

```typescript
// ❌ Неправильно — устаревший паттерн Auth.js
const session = await auth()

// ✅ Правильно — Better Auth
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({
  headers: await headers(),
})
```

**Сессия undefined в Server Actions**

Убедись что добавлен плагин `nextCookies()`:

```typescript
// lib/auth.ts
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  // ...
  plugins: [nextCookies()], // Обязательно!
})
```

**Ошибка Route Handler**

Проверь настройку API роута:

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**Ошибки редиректа OAuth**

- Проверь, что `BETTER_AUTH_URL` соответствует твоему домену
- Убедись, что callback URL провайдеров настроены правильно
- Проверь, что все необходимые переменные окружения установлены

**Проблемы с proxy.ts**

- proxy.ts работает в Node.js Runtime (не Edge!)
- Можно использовать Prisma и полный доступ к БД
- Для быстрой проверки используй `getSessionCookie(request)`
