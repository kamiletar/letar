# Organization Plugin

Плагин для работы с организациями и командами.

---

## Установка

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    organization({
      // Опции плагина
    }),
  ],
})
```

```typescript
// src/lib/auth-client.ts
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient()],
})
```

---

## Базовое использование

### Создание организации

```typescript
const { data: org, error } = await authClient.organization.create({
  name: 'Моя компания',
  slug: 'my-company', // URL-friendly идентификатор
  logo: 'https://example.com/logo.png',
})
```

### Проверка slug

```typescript
const { data } = await authClient.organization.checkSlug({
  slug: 'my-company',
})

if (data.available) {
  // Slug доступен
}
```

### Список организаций пользователя

```typescript
const { data: orgs } = await authClient.organization.list()

// orgs = [{ id, name, slug, role, ... }]
```

### Переключение организации

```typescript
await authClient.organization.setActive({
  organizationId: 'org_id',
})
```

---

## Приглашения

### Пригласить участника

```typescript
await authClient.organization.inviteMember({
  organizationId: 'org_id',
  email: 'user@example.com',
  role: 'member', // или 'admin'
})
```

### Принять приглашение

```typescript
await authClient.organization.acceptInvitation({
  invitationId: 'invitation_id',
})
```

### Отклонить приглашение

```typescript
await authClient.organization.rejectInvitation({
  invitationId: 'invitation_id',
})
```

### Отменить приглашение

```typescript
await authClient.organization.cancelInvitation({
  invitationId: 'invitation_id',
})
```

### Список приглашений

```typescript
// Приглашения для текущего пользователя
const { data: invitations } = await authClient.organization.listInvitations()

// Приглашения организации (для админов)
const { data } = await authClient.organization.listPendingInvitations({
  organizationId: 'org_id',
})
```

---

## Роли

### Стандартные роли

| Роль     | Права                               |
| -------- | ----------------------------------- |
| `owner`  | Полный доступ, удаление организации |
| `admin`  | Управление участниками, настройки   |
| `member` | Базовый доступ                      |

### Кастомные роли

```typescript
export const auth = betterAuth({
  plugins: [
    organization({
      roles: {
        owner: {
          permissions: ['*'], // Все права
        },
        admin: {
          permissions: ['member:read', 'member:write', 'member:delete', 'settings:read', 'settings:write'],
        },
        developer: {
          permissions: ['member:read', 'project:read', 'project:write'],
        },
        viewer: {
          permissions: ['member:read', 'project:read'],
        },
      },
    }),
  ],
})
```

### Изменение роли участника

```typescript
await authClient.organization.updateMemberRole({
  organizationId: 'org_id',
  memberId: 'member_id',
  role: 'admin',
})
```

---

## Teams (опционально)

Команды внутри организации.

### Включение

```typescript
export const auth = betterAuth({
  plugins: [
    organization({
      teams: {
        enabled: true,
      },
    }),
  ],
})
```

### Создание команды

```typescript
await authClient.organization.createTeam({
  organizationId: 'org_id',
  name: 'Frontend Team',
})
```

### Добавление в команду

```typescript
await authClient.organization.addTeamMember({
  teamId: 'team_id',
  memberId: 'member_id',
})
```

---

## Управление участниками

### Список участников

```typescript
const { data: members } = await authClient.organization.listMembers({
  organizationId: 'org_id',
})
```

### Удаление участника

```typescript
await authClient.organization.removeMember({
  organizationId: 'org_id',
  memberId: 'member_id',
})
```

### Покинуть организацию

```typescript
await authClient.organization.leave({
  organizationId: 'org_id',
})
```

---

## Настройки организации

### Обновление

```typescript
await authClient.organization.update({
  organizationId: 'org_id',
  name: 'Новое название',
  logo: 'https://example.com/new-logo.png',
  metadata: {
    industry: 'IT',
    size: '10-50',
  },
})
```

### Удаление организации

```typescript
await authClient.organization.delete({
  organizationId: 'org_id',
})
```

---

## Hooks

### Отправка email при приглашении

```typescript
export const auth = betterAuth({
  plugins: [
    organization({
      hooks: {
        inviteMember: {
          after: async (invitation, ctx) => {
            await sendEmail({
              to: invitation.email,
              subject: `Приглашение в ${invitation.organizationName}`,
              html: `
                <h1>Вас пригласили!</h1>
                <p>${ctx.session.user.name} приглашает вас в организацию.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?id=${invitation.id}">
                  Принять приглашение
                </a>
              `,
            })
          },
        },
      },
    }),
  ],
})
```

---

## Access Control

### Проверка прав в компоненте

```typescript
'use client'

import { useSession } from '@/lib/auth-client'

export function OrgSettings() {
  const { data: session } = useSession()

  // Активная организация и роль
  const activeOrg = session?.activeOrganization
  const role = activeOrg?.role

  const canManageMembers = role === 'owner' || role === 'admin'
  const canDeleteOrg = role === 'owner'

  if (!activeOrg) { return <div>Выберите организацию</div> }

  return (
    <div>
      <h1>{activeOrg.name}</h1>

      {canManageMembers && <button>Управление участниками</button>}

      {canDeleteOrg && <button>Удалить организацию</button>}
    </div>
  )
}
```

### В Server Action

```typescript
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function updateOrgSettings(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.activeOrganization) {
    throw new Error('Организация не выбрана')
  }

  const role = session.activeOrganization.role
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Недостаточно прав')
  }

  // Обновление настроек...
}
```

---

## Интеграция с ZenStack

Два подхода к проверке доступа с Organizations.

### Подход 1: Через реляции (рекомендуемый)

Проверка membership через collection filter. **Используется в driving-school.**

```zmodel
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  members   Member[]

  // Публичное чтение
  @@allow('read', true)

  // Только owner может изменять/удалять
  @@allow('update,delete', members?[userId == auth().id && role == 'owner'])

  // Владелец платформы (глобальная роль)
  @@allow('all', has(auth().roles, OWNER))
}

model Member {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)
  userId         String
  role           String       // owner, manager, instructor, member

  @@unique([organizationId, userId])

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только owner/manager могут управлять
  @@allow('create,update,delete', organization.members?[userId == auth().id && role in ['owner', 'super_manager']])
}

model Project {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(...)

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только owner/manager могут изменять
  @@allow('create,update,delete', organization.members?[userId == auth().id && role in ['owner', 'manager']])
}
```

### Подход 2: Через расширенный контекст (быстрый)

Для простых случаев — расширение auth() контекста.

```typescript
// Получить контекст с organizationId и ролью
const userContext = {
  id: session.user.id,
  roles: session.user.roles,
  organizationId: session.activeOrganizationId,
  organizationRole: memberRole, // из Member.role
}

const db = getEnhancedPrisma(userContext)
```

```zmodel
model Project {
  organizationId String

  // Deny-first изоляция
  @@deny('all', auth() == null)
  @@deny('all', auth().organizationId != organizationId)

  // Роли через контекст
  @@allow('all', auth().organizationRole == 'owner')
  @@allow('read,update', auth().organizationRole == 'manager')
  @@allow('read', auth().organizationRole == 'member')
}
```

### Защита критичных полей

```zmodel
model Project {
  // Эти поля нельзя изменить после создания
  ownerId        String @allow('update', false)
  organizationId String @allow('update', false)
}
```

> **Полная документация:** [zenstack-better-auth.md](../../zenstack-helper/reference/zenstack-better-auth.md)
> **Эталон:** `apps/driving-school/schema.zmodel`

---

## Схема БД

```sql
-- Организации
CREATE TABLE "Organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "logo" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Участники
CREATE TABLE "OrganizationMember" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "role" TEXT DEFAULT 'member',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("organizationId", "userId")
);

-- Приглашения
CREATE TABLE "OrganizationInvitation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "email" TEXT NOT NULL,
  "role" TEXT DEFAULT 'member',
  "status" TEXT DEFAULT 'pending',
  "invitedBy" TEXT NOT NULL REFERENCES "User"("id"),
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

---

## См. также

- [admin-plugin.md](admin-plugin.md) — Управление пользователями
- [hooks-lifecycle.md](hooks-lifecycle.md) — Хуки
- [session-management.md](session-management.md) — Active organization в сессии
