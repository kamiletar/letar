# @letar/auth

Библиотека авторизации для Better Auth в монорепозитории Letar.

## Установка

Библиотека уже включена в монорепо. Обязательное — одно: добавь `@letar/auth` в
`nx.implicitDependencies` в `package.json` приложения (если библиотеки нет в его `dependencies`).
Полная процедура — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).

⚠️ У библиотеки три точки входа: `@letar/auth`, `@letar/auth/client`, `@letar/auth/server`.
Подпути в `paths` не наследуются — там, где `paths` вообще нужны, каждый вход прописывается своей
строкой, иначе `TS2307`. Разбор — [lib-entry-points.md](/.claude/docs/lib-entry-points.md).

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

## Быстрый старт

Главный инструмент библиотеки — фабрика `createAuth()`: принимает `AuthProfile`
(`mode: 'standalone' | 'hub-client' | 'hub-provider'`) и возвращает настроенный `betterAuth()`
инстанс. Приложение декларирует профиль, а не собирает `betterAuth({...})` руками. Подробности
режимов — [docs/modes.md](./docs/modes.md).

### 1. Создайте lib/auth.ts

```typescript
// apps/my-pet/src/lib/auth.ts (hub-client — самый быстрый старт для пета *.letar.best)
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

Для `standalone`-режима (свой домен и БД, email/password) и полного контракта `AuthProfile` —
см. [docs/modes.md](./docs/modes.md).

## Что остаётся в приложениях

Начиная с v0.4.0, типовой `lib/auth.ts` сводится к ~20–35 строкам (`createAuth()` + типы +
`createSessionHelpers`/`createAuthGuards`).

В каждом приложении остаётся:

- `lib/auth.ts` — профиль `createAuth()` (БД, email-коллбэки, additionalFields)
- `schema.zmodel` — модели User, Account, Session
- `api/auth/[...all]/route.ts` — route handler
- Специфичные функции (requireClientProfile, seeders и т.д.)

## Документация

| Раздел                                               | О чём                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/modes.md](./docs/modes.md)                     | Три режима `createAuth()` (standalone/hub-client/hub-provider), полный контракт `AuthProfile`, Tier 2 self-service соц-секреты, ограничение `additionalFields`                        |
| [docs/api-reference.md](./docs/api-reference.md)     | Полный API: `createAuth`, `createSessionHelpers`, `createAuthGuards`/`createAuthChecks`/`createRoleGuards`, `createLogoutAction`, `createRedisStorage`, клиентские хелперы, `OnlyFor` |
| [docs/oauth-accounts.md](./docs/oauth-accounts.md)   | Привязка/отвязка OAuth аккаунтов: `ConnectedAccountsList`, `createUnlinkAccountAction`, иконки провайдеров                                                                            |
| [docs/tier-migration.md](./docs/tier-migration.md)   | `AuthModeSettings` (Tier 1/Tier 2 informed-consent) и `SocialProvidersSettings` (self-service OAuth-ключи)                                                                            |
| [docs/oauth-providers.md](./docs/oauth-providers.md) | Настройка отдельных OAuth-провайдеров (VK и HTTPS-туннель для локальной разработки)                                                                                                   |

---

**Последнее обновление:** 2026-08-09 | **@letar/auth** 0.10.0 | **Better Auth** 1.6.x
