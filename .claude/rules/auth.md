---
paths: '**/auth/**, **/proxy.ts, **/lib/auth.ts, **/_actions/**auth**.ts'
---

# Правила аутентификации (Better Auth)

## Технологический стек

- **Better Auth** — основная библиотека (НЕ NextAuth/Auth.js!)
- **@letar/auth** — shared библиотека с хелперами
- **proxy.ts** — защита роутов (НЕ middleware.ts!)

## Критичные импорты

```typescript
// Клиент (React компоненты)
import { createAuthClient } from '@letar/auth/client'
export const authClient = createAuthClient()
export const { useSession, signIn, signOut } = authClient

// Сервер (Server Components, Actions)
import { auth } from '@/lib/auth'
import { createAuthGuards, createSessionHelpers } from '@letar/auth/server'

const { getSession, getCurrentUser } = createSessionHelpers(auth)
const { requireAuth, requireRole, requireAdmin } = createAuthGuards(getSession, (s) => s.user)
```

## Защита роутов

### Server Components

```typescript
// app/admin/page.tsx
import { requireAdmin } from '@/lib/auth-utils'

export default async function AdminPage() {
  const user = await requireAdmin() // Редирект если не админ
  return <div>Привет, {user.name}</div>
}
```

### Server Actions

```typescript
// _actions/admin.action.ts
'use server'
import { requireAdmin } from '@/lib/auth-utils'

export async function deleteUser(id: string) {
  await requireAdmin({ throwOnError: true })
  // ...
}
```

### proxy.ts (НЕ middleware.ts!)

```typescript
// proxy.ts
import { auth } from '@/lib/auth'

export default auth((request) => {
  if (!request.auth && request.nextUrl.pathname.startsWith('/admin')) {
    return Response.redirect(new URL('/login', request.url))
  }
})
```

## OAuth провайдеры

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  // ...
  socialProviders: {
    google: { clientId, clientSecret },
    yandex: { clientId, clientSecret }, // genericOAuth
  },
})
```

## Environment переменные

```env
BETTER_AUTH_SECRET=...     # MUST быть установлен
BETTER_AUTH_URL=...        # URL приложения
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Документация

→ Skill: `better-auth` для полных паттернов
→ См. `libs/auth/README.md` для API @letar/auth
