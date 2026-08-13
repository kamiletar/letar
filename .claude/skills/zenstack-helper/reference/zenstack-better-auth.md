# ZenStack + Better Auth Integration

Интеграция ZenStack access policies с Better Auth Organizations для мультитенантности.

---

## Два подхода к мультитенантности

### Подход 1: Через реляции (гибкий, рекомендуемый)

Проверка membership через collection filter. **Используется в driving-school.**

```zmodel
model Project {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только owner и manager могут изменять
  @@allow('update,delete', organization.members?[userId == auth().id && role in ['owner', 'manager']])
}
```

**Преимущества:**

- Не требует расширения контекста auth()
- Гибкая проверка ролей через `role in [...]`
- Работает с существующей структурой Better Auth

**Недостатки:**

- Дополнительные JOIN запросы

### Подход 2: Через контекст (быстрый)

Расширение auth() контекста с `organizationId` и `organizationRole`. **Из статьи zenstack.dev.**

```zmodel
model Project {
  id             String  @id @default(cuid())
  name           String
  organizationId String

  // Deny-first изоляция
  @@deny('all', auth() == null)
  @@deny('all', auth().organizationId != organizationId)

  // Проверка роли через контекст
  @@allow('all', auth().organizationRole == 'owner')
  @@allow('read,update', auth().organizationRole == 'admin')
  @@allow('read', auth().organizationRole == 'member')
}
```

**Преимущества:**

- Быстрее (нет JOIN)
- Простой синтаксис

**Недостатки:**

- Требует расширения getEnhancedPrisma
- Менее гибкий (один organizationId за раз)

---

## Расширенный контекст пользователя (Подход 2)

Если нужен быстрый доступ к organizationId и роли:

```typescript
// src/lib/db.ts
import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})

export const prisma = orm

interface UserContext {
  id: string
  roles?: string[]
  organizationId?: string | null
  organizationRole?: string | null
}

/**
 * Enhanced клиент с поддержкой organization context
 */
export function getEnhancedPrisma(user?: UserContext | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}

/**
 * Helper для получения контекста с организацией
 */
export async function getUserContextWithOrg(session: {
  user: User
  activeOrganizationId?: string | null
}): Promise<UserContext> {
  const { user, activeOrganizationId } = session

  if (!activeOrganizationId) {
    return { id: user.id, roles: user.roles }
  }

  // Получить роль в организации
  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: activeOrganizationId,
        userId: user.id,
      },
    },
    select: { role: true },
  })

  return {
    id: user.id,
    roles: user.roles,
    organizationId: activeOrganizationId,
    organizationRole: member?.role ?? null,
  }
}
```

### Использование в Server Action

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma, getUserContextWithOrg } from '@/lib/db'
import { headers } from 'next/headers'

export async function updateProject(projectId: string, data: ProjectData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) { throw new Error('Unauthorized') }

  // Формируем контекст с организацией
  const userContext = await getUserContextWithOrg(session)
  const db = getEnhancedPrisma(userContext)

  // Политики автоматически проверяют organizationId и роль
  return db.project.update({
    where: { id: projectId },
    data,
  })
}
```

---

## Field-Level Access Control

Защита критичных полей от изменения:

```zmodel
model Project {
  id             String  @id @default(cuid())
  name           String

  // Эти поля нельзя изменить после создания
  ownerId        String  @allow('update', false)
  organizationId String  @allow('update', false)
  createdAt      DateTime @default(now()) @allow('update', false)

  // Только owner может изменить архивацию
  isArchived     Boolean @default(false) @allow('update', auth().organizationRole == 'owner')
}
```

**Паттерны:**

| Паттерн                             | Описание                             |
| ----------------------------------- | ------------------------------------ |
| `@allow('update', false)`           | Поле нельзя изменить никогда         |
| `@allow('update', auth() == owner)` | Только владелец может изменить       |
| `@allow('read', false)`             | Поле скрыто (не включается в select) |

---

## check() для делегирования проверок

Делегирование проверки доступа родительской модели:

```zmodel
model TodoList {
  id          String   @id @default(cuid())
  name        String
  ownerId     String
  items       TodoItem[]

  @@allow('all', auth().id == ownerId)
}

model TodoItem {
  id      String   @id @default(cuid())
  title   String
  listId  String
  list    TodoList @relation(fields: [listId], references: [id])

  // Если можешь читать список — можешь читать элементы
  @@allow('read', check(list, 'read'))

  // Если можешь изменять список — можешь изменять элементы
  @@allow('create,update,delete', check(list, 'update'))
}
```

**Когда использовать:**

- Иерархические структуры (List → Item)
- Наследование прав от родителя
- Упрощение политик (не дублировать логику)

---

## Примеры из driving-school

### Organization с Members

```zmodel
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  members   Member[]

  // Публичное чтение
  @@allow('read', true)

  // Только owner может изменять/удалять
  @@allow('update', members?[userId == auth().id && role == 'owner'])
  @@allow('delete', members?[userId == auth().id && role == 'owner'])

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
```

### Проект внутри организации

```zmodel
model StudyGroup {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(...)

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только manager+ могут изменять
  @@allow('create,update,delete', organization.members?[userId == auth().id && role in ['owner', 'super_manager', 'manager']])

  // Владелец платформы
  @@allow('all', has(auth().roles, OWNER))
}
```

### Вложенная иерархия (Organization → Team → Data)

```zmodel
model Team {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(...)

  // Чтение через организацию
  @@allow('read', organization.members?[userId == auth().id])

  // Изменение только owner/super_manager
  @@allow('create,update,delete', organization.members?[userId == auth().id && role in ['owner', 'super_manager']])
}

model TeamLocationData {
  id     String @id @default(cuid())
  teamId String @unique
  team   Team   @relation(...)

  // Делегирование проверки к Team
  @@allow('read', check(team, 'read'))
  @@allow('create,update,delete', check(team, 'update'))
}
```

---

## Типичные ошибки

### 1. Забыли проверить null

```zmodel
// ❌ Неправильно — анонимный пользователь получит доступ
@@allow('read', auth().organizationId == organizationId)

// ✅ Правильно — сначала deny для null
@@deny('all', auth() == null)
@@allow('read', auth().organizationId == organizationId)
```

### 2. Неправильный синтаксис роли

```zmodel
// ❌ Неправильно — role это строка, не enum
@@allow('all', auth().organizationRole == OWNER)

// ✅ Правильно — строка в кавычках
@@allow('all', auth().organizationRole == 'owner')
```

### 3. Путаница глобальных и organization ролей

```zmodel
// Глобальная роль (в User.roles[])
@@allow('all', has(auth().roles, OWNER))

// Роль в организации (в Member.role)
@@allow('all', auth().organizationRole == 'owner')

// Через реляцию (самый гибкий)
@@allow('all', organization.members?[userId == auth().id && role == 'owner'])
```

---

## См. также

- [access-policies.md](access-policies.md) — Базовые политики доступа
- [organization-plugin.md](../../better-auth/reference/organization-plugin.md) — Better Auth Organizations
- `apps/driving-school/schema.zmodel` — Эталонная реализация
