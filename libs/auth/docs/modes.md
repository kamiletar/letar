# createAuth() — три режима

[← Назад к README](../README.md)

`createAuth()` — главная фабрика авторизации. Принимает `AuthProfile` и возвращает настроенный
`betterAuth()` инстанс. Приложение **декларирует профиль**, а не собирает `betterAuth({...})` руками.

| Режим          | Кому                                     | Вход                      | Секреты         |
| -------------- | ---------------------------------------- | ------------------------- | --------------- |
| `standalone`   | Коммерческие проекты; свой бренд и домен | email/password локально   | владельца (env) |
| `hub-client`   | Петы `*.letar.best`; быстрый старт       | OIDC-редирект на Ключницу | общие letar     |
| `hub-provider` | Только `auth-hub` (Ключница)             | сам выдаёт                | общие letar     |

## Режим `standalone` — пример (dsperevod)

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

## Режим `hub-client` — пример (time, без БД)

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

## Режим `hub-provider` — пример (auth-hub / Ключница)

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

## Standalone с расширенными плагинами — пример (driving-school)

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

> Подробный файл: [`apps/driving-school/src/lib/auth.ts`](../../../apps/driving-school/src/lib/auth.ts)

## `AuthProfile` — полный контракт

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

## Tier 2 — self-service соц-секреты владельца (`social.source: 'db'`)

Для `standalone`-режима владелец может сам вводить свои OAuth-ключи через админку своего
приложения — вместо `process.env` секреты читаются из БД **один раз при старте процесса**
(без runtime-динамики). Требует `AUTH_ENCRYPTION_KEY` в окружении (32 байта hex,
`openssl rand -hex 32`) и синхронный `createAuth` меняется на `createAuthAsync` + top-level
`await`:

```typescript
// apps/dsperevod/src/lib/auth.ts (эталон Tier 2 self-service)
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

Модель `SocialProvider` остаётся per-app (ZenStack не шарит модели между независимыми БД), но
admin UI (список + создание/редактирование + server actions CRUD) — общий компонент, см.
[tier-migration.md § SocialProvidersSettings](./tier-migration.md#socialproviderssettings--self-service-oauth-ключи-tier-2).
Компаньон — UI выбора Tier 1 (`hub-client`) / Tier 2 с показом рисков и informed-consent
запросом в `AuditLog`, **не автоматизирующий сам переход** (смена режима = миграция identity, не
рантайм-флаг): см.
[tier-migration.md § AuthModeSettings](./tier-migration.md#authmodesettings--tier-1tier-2-informed-consent).

> ⚠️ Ограничение: `social.source: 'db'` сериализует только `clientId`/`clientSecret` для нативных
> `socialProviders` Better Auth. Провайдеры через `genericOAuth`-плагин с кастомным `getUserInfo`
> (например Yandex у `driving-school`) этим механизмом не покрываются.

## Ограничение: additionalFields не выводятся автоматически

Better Auth не выводит тип `additionalFields` через дженерик фабрики. Используйте явный cast:

```typescript
export type Session = typeof auth.$Infer.Session
// ❌ Session['user'].role — не существует как тип
// ✅ Правильно:
export type SessionUser = Session['user'] & { role: 'USER' | 'ADMIN' }
// И в createAuthGuards:
createAuthGuards(getSession, (session) => session.user as unknown as SessionUser)
```

[← Назад к README](../README.md)
