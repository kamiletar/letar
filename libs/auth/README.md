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
import { createAuthChecks, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
```

## Быстрый старт

### 1. Создайте auth-client.ts

```typescript
// apps/my-app/src/lib/auth-client.ts
// Базовый клиент (без кастомных OAuth)
import { createAuthClient } from '@letar/auth/client'
export const authClient = createAuthClient()

// ИЛИ с genericOAuth (для Yandex и других кастомных провайдеров)
import { createAuthClientWithOAuth } from '@letar/auth/client'
export const authClient = createAuthClientWithOAuth()
// authClient.signIn.oauth2({ providerId: 'yandex' }) — доступен

export const { useSession, signIn, signOut, signUp } = authClient
```

### 2. Создайте auth-utils.ts

```typescript
// apps/my-app/src/lib/auth-utils.ts
import { createAuthChecks, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
import { auth, type SessionWithRole, type UserWithRole } from './auth'

const { getSession, getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)

const { requireAuth, requireRole, requireAdmin } = createAuthGuards(
  getSession,
  (session) => session.user as UserWithRole
)

const { isAuthenticated, hasRole, isAdmin } = createAuthChecks(getCurrentUser)

export { getCurrentUser, getSession, hasRole, isAdmin, isAuthenticated, requireAdmin, requireAuth, requireRole }
```

### 3. Создайте OnlyFor компонент

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

## API Reference

### Client

#### `createAuthClient(options?)`

Создаёт базовый клиент Better Auth.

| Опция     | Тип         | По умолчанию          | Описание                |
| --------- | ----------- | --------------------- | ----------------------- |
| `baseURL` | `string`    | `NEXT_PUBLIC_APP_URL` | URL сервера авторизации |
| `plugins` | `unknown[]` | `[]`                  | Дополнительные плагины  |

#### `createAuthClientWithOAuth(options?)`

Создаёт клиент Better Auth с поддержкой genericOAuth (для Yandex и др.).

| Опция     | Тип         | По умолчанию          | Описание                |
| --------- | ----------- | --------------------- | ----------------------- |
| `baseURL` | `string`    | `NEXT_PUBLIC_APP_URL` | URL сервера авторизации |
| `plugins` | `unknown[]` | `[]`                  | Дополнительные плагины  |

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

### Server

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

#### Props

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

#### Опции

| Опция            | Тип                              | По умолчанию                   | Описание                     |
| ---------------- | -------------------------------- | ------------------------------ | ---------------------------- |
| `getSession`     | `() => Promise<Session \| null>` | —                              | Функция получения сессии     |
| `getDb`          | `(user) => PrismaClient`         | —                              | Функция получения БД клиента |
| `revalidatePath` | `string`                         | `/settings/connected-accounts` | Путь для ревалидации         |
| `logger`         | `Logger`                         | no-op                          | Логгер для отладки           |

### Иконки провайдеров

Библиотека экспортирует SVG иконки для OAuth провайдеров:

```tsx
import { GitHubIcon, GoogleIcon, TelegramIcon, VKIcon, YandexIcon } from '@letar/auth/client'
```

## VK OAuth конфигурация

VK OAuth требует HTTPS даже для локальной разработки. Используйте ngrok:

```bash
# Запустите ngrok
ngrok http 3000

# Добавьте URL в VK app настройки:
# Redirect URI: https://xxx.ngrok.io/api/auth/callback/vk
```

Добавьте VK провайдер в `lib/auth.ts`:

```typescript
// Better Auth поддерживает VK как native provider
socialProviders: {
  ...(process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET && {
    vk: {
      clientId: process.env.AUTH_VK_ID,
      clientSecret: process.env.AUTH_VK_SECRET,
      // Кастомный getUserInfo для VK API
      getUserInfo: async (tokens) => {
        const userId = (tokens.raw as { user_id?: number })?.user_id
        const response = await fetch(
          `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200,screen_name&access_token=${tokens.accessToken}&v=5.131`
        )
        const data = await response.json()
        const user = data.response?.[0]
        if (!user) throw new Error('VK user not found')
        const email = (tokens.raw as { email?: string })?.email
        return {
          user: {
            id: String(user.id),
            name: `${user.first_name} ${user.last_name}`.trim(),
            email: email || `${user.id}@vk.com`,
            image: user.photo_200,
            emailVerified: !!email,
          },
          data: user,
        }
      },
    },
  }),
},
```

Environment переменные:

```bash
# .env.example
AUTH_VK_ID=
AUTH_VK_SECRET=
```

## Что остаётся в приложениях

Библиотека предоставляет только общий код. В каждом приложении остаётся:

- `lib/auth.ts` — конфигурация Better Auth (БД, провайдеры, плагины)
- `schema.zmodel` — модели User, Account, Session
- `api/auth/[...all]/route.ts` — route handler
- Специфичные функции (requireClientProfile, seeders и т.д.)

---

**Последнее обновление:** 2026-01-19
