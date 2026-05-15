# Session Management

Управление сессиями в Better Auth.

---

## Конфигурация сессии

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  session: {
    // Время жизни сессии (секунды)
    expiresIn: 60 * 60 * 24 * 7, // 7 дней

    // Обновлять сессию при активности
    updateAge: 60 * 60 * 24, // Каждые 24 часа

    // Время "свежести" сессии (для cookie caching)
    freshAge: 60 * 10, // 10 минут
  },
})
```

### Параметры

| Параметр    | Описание                 | Default |
| ----------- | ------------------------ | ------- |
| `expiresIn` | Время жизни сессии (сек) | 7 дней  |
| `updateAge` | Интервал обновления      | 1 день  |
| `freshAge`  | Время "свежести"         | 10 мин  |

---

## Cookie Caching

Cookie caching снижает нагрузку на БД — данные сессии хранятся в cookie.

### Стратегии кэширования

```typescript
export const auth = betterAuth({
  session: {
    // 1. compact — минимальные данные (только ID и expiry)
    cookieCache: {
      enabled: true,
      strategy: 'compact',
      maxAge: 60 * 5, // 5 минут
    },

    // 2. jwt — полные данные пользователя (не зашифровано!)
    cookieCache: {
      enabled: true,
      strategy: 'jwt',
      maxAge: 60 * 5,
    },

    // 3. jwe — полные данные, зашифровано (рекомендуется)
    cookieCache: {
      enabled: true,
      strategy: 'jwe',
      maxAge: 60 * 5,
    },
  },
})
```

### Когда использовать

| Стратегия | Размер cookie | Безопасность | Когда использовать           |
| --------- | ------------- | ------------ | ---------------------------- |
| `compact` | ~100 bytes    | Высокая      | По умолчанию                 |
| `jwt`     | ~500 bytes    | Средняя      | Если нужны данные на клиенте |
| `jwe`     | ~600 bytes    | Высокая      | Чувствительные данные        |

---

## Получение сессии

### На сервере

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// В Server Component / Server Action
const session = await auth.api.getSession({
  headers: await headers(),
})

// Проверка
if (!session) {
  // Не авторизован
}

// Данные пользователя
const userId = session.user.id
const userName = session.user.name
const userRoles = session.user.roles
```

### На клиенте

```typescript
'use client'

import { useSession } from '@/lib/auth-client'

export function UserProfile() {
  const { data: session, isPending, error } = useSession()

  if (isPending) return <Spinner />
  if (error) return <div>Ошибка: {error.message}</div>
  if (!session) return <div>Не авторизован</div>

  return <div>Привет, {session.user.name}</div>
}
```

---

## Revoke Sessions

### Завершить текущую сессию

```typescript
import { signOut } from '@/lib/auth-client'

// Клиент
await signOut()

// Сервер
await auth.api.signOut({
  headers: await headers(),
})
```

### Завершить конкретную сессию

```typescript
import { authClient } from '@/lib/auth-client'

// Получить все сессии пользователя
const { data: sessions } = await authClient.listSessions()

// Завершить конкретную сессию
await authClient.revokeSession({
  token: sessions[0].token,
})
```

### Завершить все другие сессии

```typescript
await authClient.revokeOtherSessions()
```

### Завершить все сессии (Admin)

```typescript
// Требует admin плагин
await authClient.admin.revokeUserSessions({
  userId: 'user_id',
})
```

---

## Список активных сессий

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { useEffect, useState } from 'react'

export function ActiveSessions() {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    authClient.listSessions().then(({ data }) => {
      setSessions(data || [])
    })
  }, [])

  return (
    <ul>
      {sessions.map((session) => (
        <li key={session.id}>
          <div>{session.userAgent}</div>
          <div>{session.ipAddress}</div>
          <div>Создана: {new Date(session.createdAt).toLocaleString()}</div>
          <button onClick={() => authClient.revokeSession({ token: session.token })}>
            Завершить
          </button>
        </li>
      ))}
    </ul>
  )
}
```

---

## Stateless Mode (высоконагруженные системы)

Для систем с высокой нагрузкой можно отключить хранение сессий в БД:

```typescript
export const auth = betterAuth({
  session: {
    // Сессии только в cookies (JWT)
    storeSessionInDatabase: false,

    cookieCache: {
      enabled: true,
      strategy: 'jwe',
      maxAge: 60 * 60 * 24, // 1 день
    },
  },
})
```

⚠️ **Ограничения:**

- Нельзя завершить сессию на сервере
- Нельзя получить список активных сессий
- Нельзя отследить устройства пользователя

---

## Session Events (Hooks)

```typescript
export const auth = betterAuth({
  hooks: {
    session: {
      // После создания сессии
      create: {
        after: async (session, ctx) => {
          console.log('Новая сессия:', session.id)
          // Логирование, уведомления...
        },
      },

      // После обновления сессии
      update: {
        after: async (session, ctx) => {
          console.log('Сессия обновлена:', session.id)
        },
      },
    },
  },
})
```

---

## Metadata сессии

Добавление кастомных данных в сессию:

```typescript
export const auth = betterAuth({
  session: {
    additionalFields: {
      // Кастомные поля сессии
      deviceName: {
        type: 'string',
        required: false,
      },
      lastActivity: {
        type: 'date',
        required: false,
      },
    },
  },
})
```

---

## Security Best Practices

### 1. Cookie настройки

```typescript
export const auth = betterAuth({
  session: {
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  },
})
```

### 2. Ограничение параллельных сессий

```typescript
export const auth = betterAuth({
  hooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          // Максимум 5 активных сессий
          const sessions = await ctx.context.adapter.listSessions(session.userId)
          if (sessions.length >= 5) {
            // Удалить самую старую
            const oldest = sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
            await ctx.context.adapter.deleteSession(oldest.id)
          }
        },
      },
    },
  },
})
```

### 3. Уведомление о новом входе

```typescript
export const auth = betterAuth({
  hooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          // Отправить email о новом входе
          await sendEmail({
            to: session.user.email,
            subject: 'Новый вход в аккаунт',
            body: `Вход с устройства: ${session.userAgent}`,
          })
        },
      },
    },
  },
})
```

---

## См. также

- [security-best-practices.md](security-best-practices.md) — Безопасность
- [hooks-lifecycle.md](hooks-lifecycle.md) — Хуки
- [prisma-adapter.md](prisma-adapter.md) — Очистка сессий
