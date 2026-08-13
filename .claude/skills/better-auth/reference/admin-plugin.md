# Admin Plugin

Плагин для управления пользователями (CRUD, роли, бан, impersonation).

---

## Установка

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    admin({
      // Опции плагина
    }),
  ],
})
```

```typescript
// src/lib/auth-client.ts
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [adminClient()],
})
```

---

## Базовое использование

### Список пользователей

```typescript
const { data: users } = await authClient.admin.listUsers({
  limit: 20,
  offset: 0,
  sortBy: 'createdAt',
  sortDirection: 'desc',
})
```

### Создание пользователя

```typescript
const { data: user, error } = await authClient.admin.createUser({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'Иван Иванов',
  role: 'USER',
})
```

### Обновление пользователя

```typescript
await authClient.admin.updateUser({
  userId: 'user_id',
  name: 'Новое имя',
  email: 'new@example.com',
})
```

### Удаление пользователя

```typescript
await authClient.admin.removeUser({
  userId: 'user_id',
})
```

---

## Управление ролями

### Установка роли

```typescript
// Одна роль
await authClient.admin.setRole({
  userId: 'user_id',
  role: 'ADMIN',
})

// Множественные роли
await authClient.admin.setRole({
  userId: 'user_id',
  role: ['USER', 'MODERATOR'],
})
```

### Конфигурация ролей

```typescript
export const auth = betterAuth({
  plugins: [
    admin({
      // Определение ролей
      roles: {
        USER: {
          // Базовая роль
        },
        MODERATOR: {
          // Модератор
        },
        ADMIN: {
          // Администратор
        },
        OWNER: {
          // Владелец (суперадмин)
        },
      },

      // Кто может быть админом
      adminRole: ['ADMIN', 'OWNER'],
    }),
  ],
})
```

---

## Бан пользователей

### Забанить

```typescript
await authClient.admin.banUser({
  userId: 'user_id',
  banReason: 'Нарушение правил сообщества',
  banExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
})
```

### Разбанить

```typescript
await authClient.admin.unbanUser({
  userId: 'user_id',
})
```

### Проверка бана

```typescript
const session = await auth.api.getSession({ headers: await headers() })

if (session?.user.banned) {
  // Пользователь забанен
  console.log('Причина:', session.user.banReason)
  console.log('До:', session.user.banExpiresAt)
}
```

---

## Impersonation (вход под пользователем)

### Начать impersonation

```typescript
// Только для админов!
await authClient.admin.impersonateUser({
  userId: 'target_user_id',
})

// После этого сессия будет от имени target_user
```

### Остановить impersonation

```typescript
await authClient.admin.stopImpersonating()
```

### Проверка impersonation

```typescript
const session = await auth.api.getSession({ headers: await headers() })

if (session?.impersonatedBy) {
  // Текущая сессия — impersonation
  console.log('Реальный админ:', session.impersonatedBy.id)
}
```

---

## Revoke сессий

### Завершить все сессии пользователя

```typescript
await authClient.admin.revokeUserSessions({
  userId: 'user_id',
})
```

### Завершить конкретную сессию

```typescript
await authClient.admin.revokeSession({
  sessionId: 'session_id',
})
```

---

## Access Control

### Кастомные permissions

```typescript
export const auth = betterAuth({
  plugins: [
    admin({
      // Проверка доступа к админ-функциям
      accessControl: {
        // Кто может видеть пользователей
        listUsers: {
          role: ['ADMIN', 'OWNER', 'MODERATOR'],
        },

        // Кто может создавать пользователей
        createUser: {
          role: ['ADMIN', 'OWNER'],
        },

        // Кто может удалять пользователей
        removeUser: {
          role: ['OWNER'], // Только владелец
        },

        // Кто может банить
        banUser: {
          role: ['ADMIN', 'OWNER', 'MODERATOR'],
        },

        // Кто может делать impersonation
        impersonateUser: {
          role: ['OWNER'], // Только владелец
        },
      },
    }),
  ],
})
```

### Кастомная логика доступа

```typescript
export const auth = betterAuth({
  plugins: [
    admin({
      accessControl: {
        removeUser: {
          // Кастомная проверка
          check: async (ctx, targetUser) => {
            // Нельзя удалить владельца
            if (targetUser.roles?.includes('OWNER')) {
              return { allowed: false, message: 'Нельзя удалить владельца' }
            }

            // Админ не может удалить другого админа
            if (ctx.session.user.roles?.includes('ADMIN') && targetUser.roles?.includes('ADMIN')) {
              return { allowed: false, message: 'Админ не может удалить админа' }
            }

            return { allowed: true }
          },
        },
      },
    }),
  ],
})
```

---

## Hooks

### После создания пользователя

```typescript
export const auth = betterAuth({
  plugins: [
    admin({
      hooks: {
        createUser: {
          after: async (user, ctx) => {
            // Отправить приветственное письмо
            await sendWelcomeEmail(user.email)

            // Логирование
            await logAdminAction({
              action: 'create_user',
              adminId: ctx.session.user.id,
              targetUserId: user.id,
            })
          },
        },
      },
    }),
  ],
})
```

### После бана

```typescript
export const auth = betterAuth({
  plugins: [
    admin({
      hooks: {
        banUser: {
          after: async (user, ctx) => {
            // Завершить все сессии забаненного
            await ctx.context.adapter.revokeUserSessions(user.id)

            // Уведомить пользователя
            await sendBanNotification(user.email, ctx.banReason)
          },
        },
      },
    }),
  ],
})
```

---

## UI компонент

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { useSession } from '@/lib/auth-client'
import { useEffect, useState } from 'react'

export function AdminUsersTable() {
  const { data: session } = useSession()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Проверка прав
  const isAdmin = session?.user.roles?.some((r) => ['ADMIN', 'OWNER'].includes(r))

  useEffect(() => {
    if (isAdmin) {
      authClient.admin.listUsers({ limit: 50 }).then(({ data }) => {
        setUsers(data || [])
        setLoading(false)
      })
    }
  }, [isAdmin])

  if (!isAdmin) { return <div>Доступ запрещён</div> }
  if (loading) { return <div>Загрузка...</div> }

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Имя</th>
          <th>Роль</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td>{user.name}</td>
            <td>{user.roles?.join(', ')}</td>
            <td>
              <button onClick={() => handleBan(user.id)}>Бан</button>
              <button onClick={() => handleImpersonate(user.id)}>Войти как</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## Интеграция с ZenStack

```zmodel
model User {
  id      String     @id @default(cuid())
  email   String     @unique
  roles   UserRole[]
  banned  Boolean    @default(false)

  // Только админы видят всех пользователей
  @@allow('read', has(auth().roles, ADMIN) || has(auth().roles, OWNER))

  // Пользователь видит только себя
  @@allow('read', auth() == this)

  // Только владелец может изменять роли
  @@allow('update', has(auth().roles, OWNER))
}
```

---

## Миграция БД

Admin плагин добавляет поля в User:

```sql
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN "banExpiresAt" TIMESTAMP;
```

Или через CLI:

```bash
npx @better-auth/cli migrate
```

---

## См. также

- [session-management.md](session-management.md) — Revoke сессий
- [hooks-lifecycle.md](hooks-lifecycle.md) — Хуки
- [security-best-practices.md](security-best-practices.md) — Access control
