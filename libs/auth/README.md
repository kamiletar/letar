# @letar/auth

Библиотека авторизации для Better Auth в монорепозитории Letar.

## Установка

Библиотека уже включена в монорепозиторий. Добавьте пути в `tsconfig.json` приложения:

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/auth": ["../../libs/auth/src/index.ts"],
      "@letar/auth/client": ["../../libs/auth/src/client/index.ts"],
      "@letar/auth/server": ["../../libs/auth/src/server/index.ts"]
    }
  },
  "references": [{ "path": "../../libs/auth" }]
}
```

## Модули

### @letar/auth/client

Клиентские хелперы для React компонентов.

```typescript
import { createAuthClient, OnlyFor, SessionProvider } from '@letar/auth/client'
```

### @letar/auth/server

Серверные хелперы для Server Components и Server Actions.

```typescript
import { createAuth, createAuthChecks, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
```

---

## createAuth() — фабрика авторизации ⭐

Главный инструмент библиотеки начиная с версии 0.4.0. Принимает `AuthProfile` и возвращает
настроенный `betterAuth()` инстанс. Приложение **декларирует профиль**, а не собирает `betterAuth({...})` руками.

### Три режима

| Режим          | Кому                                     | Вход                      | Секреты         |
| -------------- | ---------------------------------------- | ------------------------- | --------------- |
| `standalone`   | Коммерческие проекты; свой бренд и домен | email/password локально   | владельца (env) |
| `hub-client`   | Петы `*.letar.best`; быстрый старт       | OIDC-редирект на Ключницу | общие letar     |
| `hub-provider` | Только `auth-hub` (Ключница)             | сам выдаёт                | общие letar     |

### Режим `standalone` — пример (dsperevod)

```typescript
// apps/dsperevod/src/lib/auth.ts
import { createAuth, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
import { reportEmailFailure, sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { prisma } from './db'

export const auth = createAuth({
  mode: 'standalone',
  database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3019',
  trustedOrigins: ['https://dsperevod.ru', 'http://localhost:3019'],
  email: {
    sendVerificationEmail,
    sendPasswordResetEmail,
    reportEmailFailure,
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'USER', required: false },
    },
  },
})

export type Session = typeof auth.$Infer.Session
// Кастомный тип: additionalFields не выводятся автоматически — cast обязателен
export type SessionUser = Session['user'] & { role: 'USER' | 'MANAGER' | 'ADMIN' }
```

Включает автоматически:

- `emailAndPassword.requireEmailVerification: true`
- `emailVerification.sendOnSignUp: true` + `autoSignInAfterVerification: true`
- `rateLimit /send-verification-email { window: 60, max: 3 }`
- IP-хедеры за reverse proxy (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`)

### Режим `hub-client` — пример (time, без БД)

```typescript
// apps/time/src/lib/auth.ts
import { createAuth } from '@letar/auth/server'

export const auth = createAuth({
  mode: 'hub-client',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3013',
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  },
})
```

Если нужна локальная БД (например, archetest):

```typescript
export const auth = createAuth({
  mode: 'hub-client',
  database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3012',
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    // discoveryUrl по умолчанию: https://auth.letar.best/api/auth/.well-known/openid-configuration
  },
})
```

### `AuthProfile` — полный контракт

```typescript
// Все режимы наследуют AuthProfileBase:
interface AuthProfileBase {
  baseURL: string
  trustedOrigins?: string[]
  user?: BetterAuthOptions['user']           // additionalFields и т.д.
  session?: Partial<BetterAuthOptions['session']>  // expiresIn, cookieCache и т.д.
  plugins?: BetterAuthOptions['plugins']    // доп. плагины поверх режимных
  pages?: {                                  // кастомные URL страниц
    signIn?: string; signUp?: string; error?: string; resetPassword?: string
  }
}

// standalone / hub-provider дополнительно требуют:
{
  database: BetterAuthOptions['database']    // prismaAdapter(...)
  email: {
    sendVerificationEmail: (p: { to, userName?, verificationUrl }) => Promise<{ success, error? }>
    sendPasswordResetEmail?: (p: { to, userName?, resetUrl }) => Promise<{ success, error? }>
    reportEmailFailure: (p: { type, to, error }) => void
  }
  rateLimit?: { customRules?: Record<string, { window: number; max: number }> }
}

// hub-client дополнительно требует:
{
  database?: BetterAuthOptions['database']  // опционально (time не имеет)
  oidc: {
    clientId: string | undefined
    clientSecret: string | undefined
    discoveryUrl?: string                   // дефолт: Ключница letar.best
  }
}
```

### Ограничение: additionalFields не выводятся автоматически

Better Auth не выводит тип `additionalFields` через дженерик фабрики. Используйте явный cast:

```typescript
export type Session = typeof auth.$Infer.Session
// ❌ Session['user'].role — не существует как тип
// ✅ Правильно:
export type SessionUser = Session['user'] & { role: 'USER' | 'ADMIN' }
// И в createAuthGuards:
createAuthGuards(getSession, (session) => session.user as unknown as SessionUser)
```

---

## Быстрый старт (полный пример)

### 1. Создайте lib/auth.ts

Для `standalone` — см. пример выше. Для `hub-client`:

```typescript
// apps/my-pet/src/lib/auth.ts
import { createAuth, createAuthGuards, createSessionHelpers } from '@letar/auth/server'

export const auth = createAuth({
  mode: 'hub-client',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  },
})

export type Session = typeof auth.$Infer.Session

const { getSession } = createSessionHelpers<Session>(auth)
export { getSession }
```

### 2. Создайте auth-client.ts

```typescript
// apps/my-app/src/lib/auth-client.ts
import { createAuthClient } from '@letar/auth/client'

export const authClient = createAuthClient()
export const { useSession, signIn, signOut, signUp } = authClient
```

Для кастомных OAuth провайдеров (Yandex и др.):

```typescript
import { createAuthClientWithOAuth } from '@letar/auth/client'

export const authClient = createAuthClientWithOAuth()
// authClient.signIn.oauth2({ providerId: 'yandex' }) — доступен
```

### 3. Создайте auth-utils.ts

```typescript
// apps/my-app/src/lib/auth-utils.ts
import { createAuthChecks, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
import { auth, type Session, type SessionUser } from './auth'

const { getSession, getCurrentUser } = createSessionHelpers<Session>(auth)

const { requireAuth, requireRole, requireAdmin } = createAuthGuards(
  getSession,
  (session) => session.user as SessionUser,
)

const { isAuthenticated, hasRole, isAdmin } = createAuthChecks(getCurrentUser)

export { getCurrentUser, getSession, hasRole, isAdmin, isAuthenticated, requireAdmin, requireAuth, requireRole }
```

### 4. Создайте OnlyFor компонент

```tsx
// apps/my-app/src/app/_components/only-for.tsx
'use client'

import { authClient } from '@/lib/auth-client'
import { OnlyFor as BaseOnlyFor, type OnlyForProps } from '@letar/auth/client'

type UserRole = 'USER' | 'ADMIN'

export function OnlyFor(props: Omit<OnlyForProps<UserRole>, 'session' | 'isPending'>) {
  const { data: session, isPending } = authClient.useSession()
  return <BaseOnlyFor {...props} session={session} isPending={isPending} />
}
```

---

## API Reference

### Server

#### `createAuth(profile)`

Главная фабрика авторизации. Принимает `AuthProfile`, возвращает `betterAuth()` инстанс.

| Поле             | Тип                                              | Описание                                                |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `mode`           | `'standalone' \| 'hub-client' \| 'hub-provider'` | Режим авторизации                                       |
| `baseURL`        | `string`                                         | URL приложения                                          |
| `database`       | `BetterAuthOptions['database']`                  | Prisma-адаптер (обязателен для standalone/hub-provider) |
| `email`          | `StandaloneEmailCallbacks`                       | Email-коллбэки (обязателен для standalone/hub-provider) |
| `oidc`           | `HubClientOidcConfig`                            | OIDC конфигурация (обязателен для hub-client)           |
| `trustedOrigins` | `string[]`                                       | Доверенные домены                                       |
| `user`           | `BetterAuthOptions['user']`                      | `additionalFields` и пр.                                |
| `session`        | `Partial<SessionConfig>`                         | Переопределение expiresIn/cookieCache                   |
| `plugins`        | `BetterAuthPlugin[]`                             | Доп. плагины поверх режимных                            |
| `pages`          | `AuthPages`                                      | Кастомные URL страниц                                   |
| `rateLimit`      | `{ customRules }`                                | Кастомные правила rate-limit (standalone/hub-provider)  |

#### `createSessionHelpers<TSession>(auth)`

Создаёт хелперы для работы с сессией.

Возвращает:

- `getSession()` — получить сессию
- `getCurrentUser()` — получить текущего пользователя

#### `createAuthGuards(getSession, getUserFromSession)`

Создаёт guard функции для защиты роутов.

Возвращает:

- `requireAuth(options?)` — требует авторизованного пользователя
- `requireRole(roles, options?)` — требует определённую роль
- `requireAdmin(options?)` — требует роль ADMIN

Опции:

- `redirectTo` — URL для редиректа
- `throwOnError` — выбросить ошибку вместо редиректа

#### `createAuthChecks(getCurrentUser)`

Создаёт функции проверки без редиректов.

Возвращает:

- `isAuthenticated()` — проверка авторизации
- `hasRole(roles)` — проверка роли
- `isAdmin()` — проверка роли ADMIN

### Client

#### `createAuthClient(options?)`

Создаёт базовый клиент Better Auth.

| Опция     | Тип         | По умолчанию          | Описание                |
| --------- | ----------- | --------------------- | ----------------------- |
| `baseURL` | `string`    | `NEXT_PUBLIC_APP_URL` | URL сервера авторизации |
| `plugins` | `unknown[]` | `[]`                  | Дополнительные плагины  |

#### `createAuthClientWithOAuth(options?)`

Создаёт клиент Better Auth с поддержкой genericOAuth (для Yandex и др.).

Добавляет метод `signIn.oauth2({ providerId: 'yandex' })` для кастомных OAuth провайдеров.

#### `OnlyFor<TRole>`

Компонент условного рендеринга по роли.

| Prop        | Тип                | Описание                       |
| ----------- | ------------------ | ------------------------------ |
| `role`      | `TRole \| TRole[]` | Роль(и) для доступа            |
| `children`  | `ReactNode`        | Контент при наличии доступа    |
| `fallback`  | `ReactNode`        | Контент при отсутствии доступа |
| `session`   | `Session \| null`  | Текущая сессия                 |
| `isPending` | `boolean`          | Загрузка сессии                |

---

## Привязка OAuth аккаунтов

Библиотека предоставляет компоненты и хелперы для страницы управления связанными OAuth аккаунтами.

### ConnectedAccountsList

Клиентский компонент для отображения и управления привязанными OAuth аккаунтами.

```tsx
// apps/my-app/src/app/settings/connected-accounts/_components/client.tsx
'use client'

import type { AccountBase } from '@letar/auth'
import { ConnectedAccountsList } from '@letar/auth/client'
import { unlinkAccount } from '../_actions/unlink-account.action'

export function ConnectedAccountsClient({
  accounts,
  hasPassword,
  userEmail,
}: {
  accounts: AccountBase[]
  hasPassword: boolean
  userEmail: string
}) {
  return (
    <ConnectedAccountsList
      accounts={accounts}
      hasPassword={hasPassword}
      userEmail={userEmail}
      providers={['google', 'yandex', 'vk']}
      linkCallbackUrl="/settings/connected-accounts"
      changePasswordUrl="/settings/security"
      onUnlink={unlinkAccount}
    />
  )
}
```

#### Props ConnectedAccountsList

| Prop                | Тип                                                    | По умолчанию                             | Описание                         |
| ------------------- | ------------------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `accounts`          | `AccountBase[]`                                        | —                                        | Список связанных аккаунтов       |
| `hasPassword`       | `boolean`                                              | —                                        | Есть ли у пользователя пароль    |
| `userEmail`         | `string`                                               | —                                        | Email пользователя               |
| `providers`         | `OAuthProvider[]`                                      | `['google', 'yandex', 'vk', 'telegram']` | Провайдеры для отображения       |
| `linkCallbackUrl`   | `string`                                               | `/settings/connected-accounts`           | URL для редиректа после привязки |
| `changePasswordUrl` | `string`                                               | `/settings/change-password`              | URL страницы смены пароля        |
| `onUnlink`          | `(providerId: string) => Promise<UnlinkAccountResult>` | —                                        | Обработчик отвязки аккаунта      |
| `telegramWidget`    | `ReactNode`                                            | `undefined`                              | Кастомный виджет для Telegram    |
| `providerIcons`     | `Partial<Record<OAuthProvider, ReactNode>>`            | —                                        | Кастомные иконки                 |

### createUnlinkAccountAction

Server-side фабрика для создания Server Action отвязки OAuth аккаунта.

```typescript
// apps/my-app/src/app/settings/connected-accounts/_actions/unlink-account.action.ts
'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { createUnlinkAccountAction } from '@letar/auth/server'

export const unlinkAccount = createUnlinkAccountAction({
  getSession,
  getDb: (user) => getEnhancedPrisma(user),
  revalidatePath: '/settings/connected-accounts',
})
```

| Опция            | Тип                              | По умолчанию                   | Описание                     |
| ---------------- | -------------------------------- | ------------------------------ | ---------------------------- |
| `getSession`     | `() => Promise<Session \| null>` | —                              | Функция получения сессии     |
| `getDb`          | `(user) => PrismaClient`         | —                              | Функция получения БД клиента |
| `revalidatePath` | `string`                         | `/settings/connected-accounts` | Путь для ревалидации         |
| `logger`         | `Logger`                         | no-op                          | Логгер для отладки           |

### Иконки провайдеров

```tsx
import { GitHubIcon, GoogleIcon, TelegramIcon, VKIcon, YandexIcon } from '@letar/auth/client'
```

---

## VK OAuth конфигурация

VK OAuth требует HTTPS даже для локальной разработки. Используйте ngrok:

```bash
ngrok http 3000
# Redirect URI: https://xxx.ngrok.io/api/auth/callback/vk
```

```typescript
socialProviders: {
  ...(process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET && {
    vk: {
      clientId: process.env.AUTH_VK_ID,
      clientSecret: process.env.AUTH_VK_SECRET,
      getUserInfo: async (tokens) => {
        const userId = (tokens.raw as { user_id?: number })?.user_id
        const response = await fetch(
          `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200&access_token=${tokens.accessToken}&v=5.131`
        )
        const data = await response.json()
        const user = data.response?.[0]
        if (!user) throw new Error('VK user not found')
        const email = (tokens.raw as { email?: string })?.email
        return {
          user: { id: String(user.id), name: `${user.first_name} ${user.last_name}`.trim(),
            email: email || `${user.id}@vk.com`, image: user.photo_200, emailVerified: !!email },
          data: user,
        }
      },
    },
  }),
},
```

---

## Что остаётся в приложениях

Начиная с v0.4.0, типовой `lib/auth.ts` сводится к ~20–35 строкам (`createAuth()` + типы + `createSessionHelpers`/`createAuthGuards`).

В каждом приложении остаётся:

- `lib/auth.ts` — профиль `createAuth()` (БД, email-коллбэки, additionalFields)
- `schema.zmodel` — модели User, Account, Session
- `api/auth/[...all]/route.ts` — route handler
- Специфичные функции (requireClientProfile, seeders и т.д.)

---

**Последнее обновление:** 2026-06-04 | **@letar/auth** 0.4.0 | **Better Auth** 1.6.x
