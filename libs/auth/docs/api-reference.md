# API Reference

[← Назад к README](../README.md)

## Server

### `createAuth(profile)`

Главная фабрика авторизации. Принимает `AuthProfile`, возвращает `betterAuth()` инстанс.
Подробности режимов и полный контракт `AuthProfile` — [modes.md](./modes.md).

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

### `createSessionHelpers<TSession>(auth)`

Создаёт хелперы для работы с сессией.

Возвращает:

- `getSession()` — получить сессию
- `getCurrentUser()` — получить текущего пользователя

### `createAuthGuards(getSession, getUserFromSession)`

Создаёт guard функции для защиты роутов.

Возвращает:

- `requireAuth(options?)` — требует авторизованного пользователя
- `requireRole(roles, options?)` — требует определённую роль
- `requireAdmin(options?)` — требует роль ADMIN

Опции:

- `redirectTo` — URL для редиректа
- `throwOnError` — выбросить ошибку вместо редиректа

### `createAuthChecks(getCurrentUser)`

Создаёт функции проверки без редиректов.

Возвращает:

- `isAuthenticated()` — проверка авторизации
- `hasRole(roles)` — проверка роли
- `isAdmin()` — проверка роли ADMIN

> ⚠️ **`createAuthGuards`/`createAuthChecks` типизированы под одиночное поле `user.role: string`.**
> На практике ни одно hub-client приложение монорепо так роли не хранит — везде используется
> `additionalFields: { roles: { type: 'string[]', ... } }` (массив). Для этого паттерна используй
> **`createRoleGuards`** ниже, а не эти две функции.

### `createRoleGuards(getSession, getUserFromSession, options?)`

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

> Эталон полного среза: [`apps/aprel8008/src/lib/auth.ts`](../../../apps/aprel8008/src/lib/auth.ts).

### `createLogoutAction(auth, options?)`

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

### `createRedisStorage(url)`

Создаёт `secondaryStorage` адаптер для Better Auth на базе Redis.
Используется для персистентного rate-limit и сессионного кэша в production.

```typescript
import { createRedisStorage } from '@letar/auth/server'

// В createAuth():
...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),
```

Redis настроен с `lazyConnect: true` — не падает при старте если Redis недоступен.

## Client

### `createAuthClient(options?)`

Создаёт базовый клиент Better Auth.

| Опция     | Тип         | По умолчанию          | Описание                |
| --------- | ----------- | --------------------- | ----------------------- |
| `baseURL` | `string`    | `NEXT_PUBLIC_APP_URL` | URL сервера авторизации |
| `plugins` | `unknown[]` | `[]`                  | Дополнительные плагины  |

### `createAuthClientWithOAuth(options?)`

Создаёт клиент Better Auth с поддержкой genericOAuth (для Yandex и др.).

Добавляет метод `signIn.oauth2({ providerId: 'yandex' })` для кастомных OAuth провайдеров.

### `createSignInWithLetarAuth(authClient, options?)`

Создаёт функцию входа через Ключницу (`auth.letar.best`, `providerId: 'letar-auth'`) с общей
обработкой ошибок (429/500/502/503 → понятные русские сообщения). Извлечено из дословного дубля
в 9 приложениях (dashboard, kami, animatrona-tracker, grandslamcup, studio, archetest, time,
aprel8008, domwellbes) — до выноса каждое приложение копировало один и тот же `try/catch` +
`switch (status)`.

```typescript
// apps/my-app/src/lib/auth-client.ts
import { type AuthClientWithOAuth, createAuthClientWithOAuth, createSignInWithLetarAuth } from '@letar/auth/client'

export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()
export const { useSession, signOut } = authClient

// Базовый вариант — callbackURL по умолчанию берётся из текущей страницы (pathname + search)
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient)

// С toast-уведомлением об ошибке
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, {
  onError: (message) => toaster.create({ type: 'error', title: message }),
})

// С фиксированным дефолтным callbackURL вместо текущей страницы
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, { defaultCallbackURL: '/' })
```

Возвращает функцию `signInWithLetarAuth(callbackURL?: string): Promise<string | null>` —
`null` при успехе (произойдёт redirect), строка человекопонятной ошибки при неудаче.

| Опция                | Тип                         | По умолчанию                | Описание                                                                      |
| -------------------- | --------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `providerId`         | `string`                    | `'letar-auth'`              | providerId генерик-OAuth на стороне Ключницы                                  |
| `defaultCallbackURL` | `string \| (() => string)`  | текущий `pathname + search` | Куда вернуть пользователя, если явный `callbackURL` не передан в саму функцию |
| `onError`            | `(message: string) => void` | —                           | Колбэк с сообщением об ошибке (например для toast)                            |

> ⚠️ Дефолт «текущая страница» — намеренно лучшее поведение, чем фиксированный `'/'`: без него
> после логина пользователя всегда кидает на главную вместо страницы, откуда он кликнул «Войти»
> (найдено на `studio`, до выноса пять приложений хардкодили фиксированный `callbackURL`).
> Приложениям, где нужен именно фиксированный дефолт (например разные виджеты входа на одной
> странице), передавай `defaultCallbackURL` явно.

### `OnlyFor<TRole>`

Компонент условного рендеринга по роли.

| Prop        | Тип                | Описание                       |
| ----------- | ------------------ | ------------------------------ |
| `role`      | `TRole \| TRole[]` | Роль(и) для доступа            |
| `children`  | `ReactNode`        | Контент при наличии доступа    |
| `fallback`  | `ReactNode`        | Контент при отсутствии доступа |
| `session`   | `Session \| null`  | Текущая сессия                 |
| `isPending` | `boolean`          | Загрузка сессии                |

[← Назад к README](../README.md)
