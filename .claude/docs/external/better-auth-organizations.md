# Better Auth — Organizations Plugin

> Источник: https://www.better-auth.com/docs/plugins/organization\
> Версия: Better Auth v1.3+

## Установка

### Server

```typescript
// auth.ts
import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    organization({
      // Опционально: ограничить создание организаций
      allowUserToCreateOrganization: async (user) => {
        return user.role === 'admin'
      },
      // Опционально: лимит организаций на пользователя
      organizationLimit: 5,
      // Опционально: команды (Teams)
      teams: {
        enabled: true,
        maximumTeams: 10,
        allowRemovingAllTeams: false,
      },
    }),
  ],
})
```

### Client

```typescript
// auth-client.ts
import { createAuthClient } from 'better-auth/client'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      teams: { enabled: true },
    }),
  ],
})
```

### Миграция базы данных

```bash
npx @better-auth/cli migrate
```

Создаёт таблицы: `organization`, `member`, `invitation`, `team` (если teams enabled).

## CRUD Организаций

### Создание

```typescript
// Client
const { data, error } = await authClient.organization.create({
  name: 'My Organization',
  slug: 'my-org',
  logo: 'https://example.com/logo.png', // optional
  metadata: { plan: 'pro' }, // optional
})

// Server
const data = await auth.api.createOrganization({
  body: { name: 'My Org', slug: 'my-org' },
  headers: await headers(),
})
```

### Список организаций пользователя

```typescript
const { data } = await authClient.organization.list()
// → Array<Organization>
```

### Получить полную организацию

```typescript
const { data } = await authClient.organization.getFullOrganization({
  query: { organizationId: 'org-id' },
})
// → { id, name, slug, members, invitations, teams }
```

### Обновить

```typescript
const { data } = await authClient.organization.update({
  organizationId: 'org-id',
  data: { name: 'New Name', logo: 'new-logo.png' },
})
```

### Удалить

```typescript
await authClient.organization.delete({ organizationId: 'org-id' })
```

## Активная организация

```typescript
// Установить активную организацию
await authClient.organization.setActive({ organizationId: 'org-id' })

// Использовать в компонентах
const { data: activeOrg } = authClient.useActiveOrganization()
// → { id, name, slug, members, ... }
```

## Участники (Members)

### Список

```typescript
const { data } = await authClient.organization.getFullOrganization({
  query: { organizationId: 'org-id' },
})
const members = data.members
// → [{ id, userId, role, user: { name, email }, ... }]
```

### Обновить роль

```typescript
await authClient.organization.updateMemberRole({
  memberId: 'member-id',
  role: 'admin', // "owner" | "admin" | "member"
})
```

### Удалить участника

```typescript
await authClient.organization.removeMember({
  memberIdOrEmail: 'member-id',
  organizationId: 'org-id',
})
```

### Покинуть организацию

```typescript
await authClient.organization.leave({ organizationId: 'org-id' })
```

## Приглашения (Invitations)

### Отправить приглашение

```typescript
const { data } = await authClient.organization.inviteMember({
  email: 'user@example.com',
  role: 'member', // "owner" | "admin" | "member"
  organizationId: 'org-id',
  resend: true, // resend если уже приглашён
  teamId: 'team-id', // optional — сразу в команду
})
```

### Настройка email

```typescript
organization({
  sendInvitationEmail: async (data) => {
    const { id, email, organization, inviter, role } = data
    await sendEmail({
      to: email,
      subject: `Invitation to ${organization.name}`,
      body: `Accept: ${BASE_URL}/accept-invitation/${id}`,
    })
  },
})
```

### Принять приглашение

```typescript
await authClient.organization.acceptInvitation({ invitationId: 'inv-id' })
```

### Отклонить / Отменить

```typescript
await authClient.organization.rejectInvitation({ invitationId: 'inv-id' })
await authClient.organization.cancelInvitation({ invitationId: 'inv-id' })
```

### Получить приглашение

```typescript
const { data } = await authClient.organization.getInvitation({
  query: { id: 'inv-id' },
})
```

### Список приглашений

```typescript
// Приглашения организации
const { data } = await authClient.organization.listInvitations({
  query: { organizationId: 'org-id' },
})

// Приглашения пользователя
const { data } = await authClient.organization.listInvitations({
  query: { email: 'user@example.com' },
})
```

## Команды (Teams)

```typescript
// Создать команду
await authClient.organization.createTeam({
  name: 'Engineering',
  organizationId: 'org-id',
})

// Обновить команду
await authClient.organization.updateTeam({
  teamId: 'team-id',
  data: { name: 'New Name' },
})

// Удалить команду
await authClient.organization.removeTeam({ teamId: 'team-id' })

// Список команд
const { data } = await authClient.organization.listTeams({
  query: { organizationId: 'org-id' },
})

// Добавить участника в команду
await authClient.organization.addTeamMember({
  teamId: 'team-id',
  userId: 'user-id',
})

// Удалить из команды
await authClient.organization.removeTeamMember({
  teamId: 'team-id',
  memberId: 'member-id',
})
```

## Access Control (Кастомные разрешения)

```typescript
// permissions.ts
import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/organization/access'

const statement = {
  ...defaultStatements,
  project: ['create', 'share', 'update', 'delete'],
} as const

const ac = createAccessControl(statement)

const member = ac.newRole({ project: ['create'] })
const admin = ac.newRole({
  project: ['create', 'update'],
  ...adminAc.statements,
})
const owner = ac.newRole({
  project: ['create', 'update', 'delete'],
})

// auth.ts
organization({ ac, roles: { member, admin, owner } })
```

### Проверка разрешений

```typescript
// Server
const canCreate = await auth.api.hasPermission({
  body: { permission: { project: ['create'] } },
  headers: await headers(),
})

// Client
const { data } = await authClient.organization.hasPermission({
  permission: { project: ['create'] },
})
```

## Хуки организации (Server-side)

```typescript
organization({
  organizationHooks: {
    beforeCreateOrganization: async ({ organization, user }) => {
      return { data: { ...organization, name: organization.name.trim() } }
    },
    afterCreateOrganization: async ({ organization, user, member }) => {
      await createDefaultResources(organization.id)
    },
    beforeDeleteOrganization: async ({ organization, user }) => {
      await backupOrganizationData(organization.id)
    },
    // Также: afterDeleteOrganization, beforeUpdateOrganization, afterUpdateOrganization
    // Member hooks: beforeAddMember, afterAddMember, beforeRemoveMember, afterRemoveMember
    // Invitation hooks: beforeCreateInvitation, afterCreateInvitation, beforeAcceptInvitation
    // Team hooks: beforeCreateTeam, afterCreateTeam, beforeUpdateTeam, afterUpdateTeam
  },
})
```

## Дополнительные поля (v1.3+)

```typescript
organization({
  schema: {
    organization: {
      additionalFields: {
        plan: { type: 'string', input: true, required: false },
        billingEmail: { type: 'string', input: false },
      },
    },
    member: {
      additionalFields: {
        department: { type: 'string', input: true },
      },
    },
  },
})
```

```typescript
// Client — inferOrgAdditionalFields для типизации
import type { auth } from '@/lib/auth'
import { inferOrgAdditionalFields, organizationClient } from 'better-auth/client/plugins'

createAuthClient({
  plugins: [
    organizationClient({
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
  ],
})
```

## Schema (таблицы БД)

| Таблица        | Ключевые поля                                                 |
| -------------- | ------------------------------------------------------------- |
| `organization` | id, name, slug, logo, createdAt, metadata                     |
| `member`       | id, organizationId, userId, role, createdAt                   |
| `invitation`   | id, organizationId, email, role, status, expiresAt, inviterId |
| `team`         | id, organizationId, name, createdAt (если teams enabled)      |

## Роли по умолчанию

| Роль     | Права                                    |
| -------- | ---------------------------------------- |
| `owner`  | Полный доступ, может удалить организацию |
| `admin`  | Управление участниками и приглашениями   |
| `member` | Базовый доступ                           |

## Ссылки

- Docs: https://www.better-auth.com/docs/plugins/organization
- GitHub: https://github.com/better-auth/better-auth
