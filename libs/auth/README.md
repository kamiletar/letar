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

С Redis rate-limit и account-linking (kami):

```typescript
import { createAuth, createRedisStorage } from '@letar/auth/server'

export const auth = createAuth({
  mode: 'hub-client',
  database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  },
  ...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),
  rateLimit: {
    storage: 'secondary-storage', // или 'memory' / 'database'
    max: 100, // глобальный лимит (useSession() вызывается часто — ставь ≥100)
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ['letar-auth'] },
  },
})
```

### Режим `hub-provider` — пример (auth-hub / Ключница)

Единственный экземпляр в монорепо. `oidcProvider` плагин добавляется фабрикой автоматически.

```typescript
// apps/auth-hub/src/lib/auth.ts
import { createAuth, createRedisStorage } from '@letar/auth/server'
import { reportEmailFailure, sendMagicLinkEmail, sendVerificationEmail } from '@letar/email'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { genericOAuth, magicLink } from 'better-auth/plugins'

export const auth = createAuth({
  mode: 'hub-provider',

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  ...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3014',

  trustedOrigins: [
    'http://localhost:3014',
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ],

  email: {
    sendVerificationEmail: async ({ to, userName, verificationUrl }) => {
      return sendVerificationEmail({ to, userName, verificationUrl })
    },
    reportEmailFailure: ({ type, to, error }) => {
      reportEmailFailure({ type, to, error })
    },
  },

  // OAuth-провайдеры настраиваются ОДИН РАЗ для всех приложений монорепо
  socialProviders: {
    ...(process.env.AUTH_GOOGLE_ID
      && process.env.AUTH_GOOGLE_SECRET && {
      google: { clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET },
    }),
    // github, facebook, vk — аналогично
  },

  // Доп. плагины (oidcProvider + nextCookies фабрика добавит сама)
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        /* ... */
      },
      expiresIn: 900,
    }),
    genericOAuth({
      config: [/* yandex */],
    }),
    // passkeyPlugin(), telegramPlugin() — кастомные плагины Ключницы
  ],

  user: {
    additionalFields: {
      roles: { type: 'string[]', defaultValue: ['USER'], required: false },
    },
  },

  account: {
    accountLinking: { enabled: true, trustedProviders: ['google', 'github', 'vk', 'yandex'] },
  },

  // Кастомизация встроенного OIDC провайдера (все поля опциональны — есть дефолты)
  oidcProvider: {
    loginPage: '/sign-in',
    consentPage: '/oauth/consent',
    requirePKCE: true,
    accessTokenExpiresIn: 3600,
    refreshTokenExpiresIn: 604800,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  },

  pages: { signIn: '/sign-in', signUp: '/sign-up', error: '/sign-in' },
})

export type Session = typeof auth.$Infer.Session
```

Что фабрика подключает автоматически в `hub-provider`:

- `oidcProvider` плагин (PKCE, OIDC Discovery, consent, токены)
- `nextCookies()` — **последним** (требование Better Auth)
- `emailAndPassword` с `requireEmailVerification: true` в production / `false` в dev
- `emailVerification.sendOnSignUp: true` + `autoSignInAfterVerification: true`
- `rateLimit` с защитой sign-in/sign-up/magic-link/OIDC эндпоинтов
- IP-заголовки за reverse proxy

### Standalone с расширенными плагинами — пример (driving-school)

Иллюстрирует `organization`, `magicLink`, кастомный `password`, `databaseHooks`:

```typescript
import { createAuth } from '@letar/auth/server'
import { sendMagicLinkEmail, sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { genericOAuth, magicLink, organization } from 'better-auth/plugins'

export const auth = createAuth({
  mode: 'standalone',
  database: prismaAdapter(prismaAuth, { provider: 'postgresql' }),
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : 'https://xn--80aaah6cnh.xn--p1ai',
  trustedOrigins: ['https://xn--80aaah6cnh.xn--p1ai', 'https://направа.рф'],

  email: {
    sendVerificationEmail,
    sendPasswordResetEmail,
    reportEmailFailure: ({ type, to, error }) => {
      console.error(`[Email] ${type} → ${to}: ${error}`)
    },
  },

  // bcrypt вместо scrypt — для совместимости с уже созданными хешами
  password: {
    hash: async (password) => {
      const b = await import('bcryptjs')
      return b.hash(password, 12)
    },
    verify: async ({ hash, password }) => {
      const b = await import('bcryptjs')
      return b.compare(password, hash)
    },
  },

  user: {
    additionalFields: {
      roles: { type: 'string[]', defaultValue: ['USER'], required: false },
      phone: { type: 'string', required: false },
      birthdate: { type: 'date', required: false },
    },
  },

  rateLimit: {
    customRules: {
      '/sign-in/*': { window: 900, max: 5 },
      '/sign-up/*': { window: 3600, max: 3 },
    },
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        /* ... */
      },
      expiresIn: 900,
    }),
    genericOAuth({
      config: [/* yandex */],
    }),
    organization({
      ac,
      roles,
      teams: { enabled: true, maximumTeams: 50 },
      schema: {
        // Кастомное имя таблицы — если Invitation уже занята в вашей схеме
        invitation: { modelName: 'OrganizationInvitation' },
      },
    }),
  ],

  socialProviders: {
    ...(process.env.AUTH_GOOGLE_ID && {
      google: { clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET! },
    }),
  },

  // databaseHooks — обогащение профиля дополнительными данными после OAuth
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          /* обновить birthdate/gender/phone из VK/Yandex */
        },
      },
    },
  },
})
```

> Подробный файл: [`apps/driving-school/src/lib/auth.ts`](../../apps/driving-school/src/lib/auth.ts)

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

### Tier 2 — self-service соц-секреты владельца (`social.source: 'db'`)

Для `standalone`-режима владелец может сам вводить свои OAuth-ключи через админку своего
приложения — вместо `process.env` секреты читаются из БД **один раз при старте процесса**
(без runtime-динамики — решение ревизии №3 корневого PLAN.md, D8 не нужен). Требует
`AUTH_ENCRYPTION_KEY` в окружении (32 байта hex, `openssl rand -hex 32`) и синхронный `createAuth`
меняется на `createAuthAsync` + top-level `await`:

```typescript
// apps/dsperevod/src/lib/auth.ts (эталон Tier 2 self-service, PLAN.md Этап 8)
import { createAuthAsync, createSocialProviderLoader, decryptSecret, getEncryptionKey } from '@letar/auth/server'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { prisma } from './db'

export const auth = await createAuthAsync({
  mode: 'standalone',
  database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3019',
  email: {/* ... */},
  // Пусто на старте → соц-вход просто отсутствует до первой настройки владельцем,
  // не блокирует email/password.
  social: {
    source: 'db',
    load: createSocialProviderLoader(prisma as never, decryptSecret, getEncryptionKey()),
  },
})
```

`createSocialProviderLoader` ожидает модель `SocialProvider` в `schema.zmodel` приложения
(только-ADMIN доступ, `clientSecret` шифруется `encryptSecret()` перед записью, никогда не
отдаётся клиенту после сохранения — только маска последних 4 символов):

```zmodel
model SocialProvider {
  id           String   @id @default(cuid())
  providerId   String   @unique /// "google", "vk" — ключ Better Auth socialProviders
  clientId     String
  clientSecret String /// формат "gcm:<iv>:<cipher>:<tag>"
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@allow('all', auth().role == 'ADMIN')
}
```

Полный вертикальный срез (модель + шифрование + admin UI со списком/созданием/редактированием +
server actions) — [`apps/dsperevod/src/app/(admin)/admin/social-providers/`](../../apps/dsperevod/src/app/(admin)/admin/social-providers/).
Компаньон — UI выбора Tier 1 (`hub-client`) / Tier 2 с показом рисков (§2.3) и informed-consent
запросом в `AuditLog`, **не автоматизирующий сам переход** (смена режима = миграция identity, не
рантайм-флаг): [`apps/dsperevod/.../admin/settings/auth-mode/`](../../apps/dsperevod/src/app/(admin)/admin/settings/auth-mode/).

> ⚠️ Ограничение: `social.source: 'db'` сериализует только `clientId`/`clientSecret` для нативных
> `socialProviders` Better Auth. Провайдеры через `genericOAuth`-плагин с кастомным `getUserInfo`
> (например Yandex у `driving-school`) этим механизмом не покрываются.

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

> ⚠️ **`createAuthGuards`/`createAuthChecks` типизированы под одиночное поле `user.role: string`.**
> На практике ни одно hub-client приложение монорепо так роли не хранит — везде используется
> `additionalFields: { roles: { type: 'string[]', ... } }` (массив). Для этого паттерна используй
> **`createRoleGuards`** ниже, а не эти две функции.

#### `createRoleGuards(getSession, getUserFromSession, options?)`

Guard-функции для приложений с массивом ролей (`user.roles: TRole[]`) — реальный паттерн всех
hub-client приложений (kami, auth-hub, aprel8008 и др.). Объединяет то, что раньше каждое
приложение копировало вручную в `lib/auth.ts`: `hasRole`/`isAdmin`/`requireAuth`/`requireAdmin`
с DB-фолбэком на случай, когда `additionalFields` не попали в cookieCache Better Auth.

```typescript
// lib/auth.ts
import { createAuth, createRoleGuards, createSessionHelpers } from '@letar/auth/server'

export const auth = createAuth({
  mode: 'hub-client',
  /* ... */
  user: { additionalFields: { roles: { type: 'string[]', defaultValue: ['USER'], required: false } } },
})

export type Session = typeof auth.$Infer.Session
export type SessionUser = Session['user'] & { roles: UserRole[] }
export type SessionWithRoles = { session: Session['session']; user: SessionUser }

const { getSession: _getSession } = createSessionHelpers<Session>(auth)

export async function getSession(): Promise<SessionWithRoles | null> {
  return (await _getSession()) as SessionWithRoles | null
}

export const { getCurrentUser, hasRole, isAdmin, requireAuth, requireRole, requireAdmin } = createRoleGuards<
  SessionWithRoles,
  SessionUser,
  UserRole
>(getSession, (session) => session.user, {
  refetchRoles: async (userId) => {
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } })
    return dbUser?.roles ?? []
  },
})
```

Возвращает:

- `getCurrentUser()` — текущий пользователь или `null`
- `hasRole(role | role[])` — проверка роли(ей) с DB-фолбэком через `refetchRoles`
- `isAdmin()` — shortcut для `hasRole('ADMIN')`
- `requireAuth()` — требует сессию, иначе редирект на `signInUrl`; возвращает `{ session, user }`
- `requireRole(role | role[])` — требует роль(и), иначе редирект на `forbiddenUrl`
- `requireAdmin()` — shortcut для `requireRole('ADMIN')`

Опции (`RoleGuardOptions`):

| Опция          | Тип                                    | По умолчанию | Описание                                                             |
| -------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `refetchRoles` | `(userId: string) => Promise<TRole[]>` | —            | DB-фолбэк, если `user.roles` пуст (cookieCache без additionalFields) |
| `signInUrl`    | `string`                               | `/sign-in`   | Редирект для неавторизованных                                        |
| `forbiddenUrl` | `string`                               | `/`          | Редирект для авторизованных без нужной роли                          |

> Эталон полного среза: [`apps/aprel8008/src/lib/auth.ts`](../../apps/aprel8008/src/lib/auth.ts).

#### `createLogoutAction(auth, options?)`

Создаёт Server Action для выхода. Поддерживает простой выход и RP-Initiated Logout (OIDC).

```typescript
// apps/my-app/src/app/_actions/auth.actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

// Простой выход (standalone)
export const logoutAction = createLogoutAction(auth)

// OIDC выход (hub-client — выходит и из Ключницы)
export const logoutAction = createLogoutAction(auth, {
  oidcLogout: {
    endSessionUrl: `${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/endsession`,
    clientId: process.env.OIDC_CLIENT_ID!,
    postLogoutRedirectUri: `${process.env.BETTER_AUTH_URL}/sign-in`,
  },
})
```

| Опция                              | Тип                   | Описание                                          |
| ---------------------------------- | --------------------- | ------------------------------------------------- |
| `redirectTo`                       | `string`              | URL после выхода (дефолт `/`)                     |
| `oidcLogout.endSessionUrl`         | `string`              | `{OIDC_ISSUER}/api/auth/oauth2/endsession`        |
| `oidcLogout.clientId`              | `string`              | OIDC client_id приложения                         |
| `oidcLogout.postLogoutRedirectUri` | `string`              | URL возврата (должен быть в redirectUrls клиента) |
| `onBeforeLogout`                   | `() => Promise<void>` | Колбэк до signOut                                 |
| `onAfterLogout`                    | `() => Promise<void>` | Колбэк после signOut, до редиректа                |

> **Важно для hub-client:** без `oidcLogout` пользователь выйдет из локальной сессии, но останется
> залогинен в Ключнице → при следующем входе тихий ре-логин без формы. Всегда используй `oidcLogout`.

#### `createRedisStorage(url)`

Создаёт `secondaryStorage` адаптер для Better Auth на базе Redis.
Используется для персистентного rate-limit и сессионного кэша в production.

```typescript
import { createRedisStorage } from '@letar/auth/server'

// В createAuth():
...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),
```

Redis настроен с `lazyConnect: true` — не падает при старте если Redis недоступен.

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

## AuthModeSettings — Tier 1/Tier 2 informed-consent (Этап 8 корневого PLAN.md)

Готовая страница сравнения режимов авторизации для standalone-приложений (Tier 2 = свои ключи,
Tier 1 = переход на Ключницу как hub-client). Компонент **только фиксирует запрос** — сам
переход не автоматизирован (смена режима = миграция identity, требует правки `lib/auth.ts`,
регистрации hub-клиента и переноса данных, не рантайм-флаг).

Извлечён в libs после третьего дословного дубля (dsperevod → aboi → driving-school) — три
приложения имели ~90% идентичный код страницы. Data-fetching (какая таблица аудита, ZenStack vs
raw Prisma) остаётся в приложении; переиспользуется только презентационная часть + чекбокс-форма.

```tsx
// app/admin/settings/auth-mode/page.tsx
import { AuthModeSettings } from '@letar/auth/client'

import { requireAdmin } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { requestAuthModeMigration } from '../../_actions/auth-mode.action'

export default async function AuthModeSettingsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const requests = await db.auditLog.findMany({
    where: { action: 'REQUEST_AUTH_MODE_MIGRATION' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <AuthModeSettings
      currentModeLabel="Tier 2 — Standalone (свои ключи)"
      tier2Points={['Свой домен и бренд входа', 'Соц-вход через собственные OAuth-приложения']}
      tier1Points={[
        { text: 'Вход делегируется Ключнице (auth.letar.best)' },
        { text: 'user.id меняется на идентификатор Ключницы — требуется миграция данных', emphasized: true },
      ]}
      requests={requests.map((r) => ({ id: r.id, name: r.user.name, email: r.user.email, createdAt: r.createdAt }))}
      onRequest={requestAuthModeMigration}
    />
  )
}
```

```typescript
// _actions/auth-mode.action.ts — остаётся в приложении, не выносится
'use server'
export async function requestAuthModeMigration(acknowledgedRisks: boolean) {
  const user = await requireAdmin()
  if (!acknowledgedRisks) return { error: 'Нужно подтвердить ознакомление с рисками перехода' }
  await db.auditLog.create({
    data: { action: 'REQUEST_AUTH_MODE_MIGRATION', userId: user.id /* ... */ },
  })
  revalidatePath('/admin/settings/auth-mode/')
  return { data: null }
}
```

#### Props AuthModeSettings

| Prop               | Тип                                                                | Описание                                                                                                    |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `currentModeLabel` | `string`                                                           | Ярлык текущего режима, например `"Tier 2 — Standalone (свои ключи)"`                                        |
| `tier2Points`      | `string[]`                                                         | Пункты карточки «Текущий выбор» (Tier 2)                                                                    |
| `tier1Points`      | `{ text: string; emphasized?: boolean }[]`                         | Пункты карточки «Альтернатива» (Tier 1); `emphasized` — выделить оранжевым                                  |
| `requests`         | `{ id, name: string \| null, email, createdAt: Date }[]`           | История запросов, уже отсортированная по убыванию даты                                                      |
| `onRequest`        | `(acknowledgedRisks: boolean) => Promise<{error?} \| {data:null}>` | Server action — фиксирует informed-consent запрос                                                           |
| `successMessage?`  | `string`                                                           | Текст алерта после успешной фиксации (переопределить для доп. рисков — например VK/Yandex у driving-school) |
| `footer?`          | `ReactNode`                                                        | Доп. контент под таблицей (например ссылка на общий журнал аудита)                                          |

> Полные примеры: [`apps/dsperevod`](../../apps/dsperevod/src/app/(admin)/admin/settings/auth-mode/page.tsx),
> [`apps/aboi`](../../apps/aboi/src/app/[locale]/admin/settings/auth-mode/page.tsx),
> [`apps/driving-school`](../../apps/driving-school/src/app/(owner)/owner/settings/auth-mode/page.tsx).

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

**Последнее обновление:** 2026-07-17 | **@letar/auth** 0.10.0 | **Better Auth** 1.6.x
