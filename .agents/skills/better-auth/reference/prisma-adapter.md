# Prisma Adapter

Настройка Prisma адаптера для Better Auth.

---

## Базовая настройка

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql', // или 'mysql', 'sqlite'
  }),
  // ...остальная конфигурация
})
```

---

## CLI команды

```bash
# Генерация схемы Prisma из Better Auth
npx @better-auth/cli generate

# Применение миграции (добавляет таблицы в БД)
npx @better-auth/cli migrate

# Для ZenStack — после миграции:
nx zenstack:generate <app>
```

---

## Experimental Joins (2-3x производительность!)

По умолчанию Better Auth делает отдельные запросы. С `joins: true` — один запрос с JOIN.

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // 🚀 Включить experimental joins
  advanced: {
    database: {
      experimental_joins: true,
    },
  },
})
```

### Сравнение производительности

| Операция      | Без joins  | С joins     |
| ------------- | ---------- | ----------- |
| getSession    | 2 запроса  | 1 запрос    |
| signIn        | 3+ запроса | 1-2 запроса |
| Среднее время | ~50ms      | ~20ms       |

---

## Схема для ZenStack

```zmodel
// schema.zmodel

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  roles         UserRole[] // Множественные роли!
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]

  // ZenStack политики
  @@allow('read', auth() == this)
  @@allow('all', has(auth().roles, ADMIN))
  @@allow('all', has(auth().roles, OWNER))
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  providerId            String
  accountId             String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?   // Для email auth
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
}

enum UserRole {
  USER
  ADMIN
  OWNER
}
```

---

## Рекомендуемые индексы

```sql
-- Индексы для производительности
CREATE INDEX idx_session_user_id ON "Session"("userId");
CREATE INDEX idx_session_token ON "Session"("token");
CREATE INDEX idx_session_expires_at ON "Session"("expiresAt");

CREATE INDEX idx_account_user_id ON "Account"("userId");
CREATE INDEX idx_account_provider ON "Account"("providerId", "accountId");

CREATE INDEX idx_verification_identifier ON "Verification"("identifier");
CREATE INDEX idx_verification_expires ON "Verification"("expiresAt");
```

Или в Prisma schema:

```prisma
model Session {
  // ...поля

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

---

## Кастомные поля пользователя

```typescript
// auth.ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  user: {
    additionalFields: {
      // Дополнительные поля
      phone: {
        type: 'string',
        required: false,
      },
      roles: {
        type: 'string[]',
        defaultValue: ['USER'],
      },
    },
  },
})
```

---

## Кастомные названия таблиц

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Кастомные названия (если отличаются от стандартных)
  user: {
    modelName: 'User', // Название модели в Prisma
  },
  session: {
    modelName: 'Session',
  },
  account: {
    modelName: 'Account',
  },
})
```

---

## Очистка устаревших сессий

Better Auth не удаляет устаревшие сессии автоматически. Настрой cron job:

```typescript
// src/app/api/cron/cleanup/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Проверка секретного ключа cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Удаление устаревших сессий
  const deleted = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  // Удаление устаревших верификаций
  await prisma.verification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return NextResponse.json({
    deleted: deleted.count,
    timestamp: new Date().toISOString(),
  })
}
```

---

## Множественные базы данных

```typescript
import { PrismaClient as AuthPrisma } from '@prisma/auth-client'
import { PrismaClient as MainPrisma } from '@prisma/client'

const mainPrisma = new MainPrisma()
const authPrisma = new AuthPrisma()

export const auth = betterAuth({
  // Auth данные в отдельной БД
  database: prismaAdapter(authPrisma, {
    provider: 'postgresql',
  }),
})
```

---

## Troubleshooting

### "Table does not exist"

```bash
# Сначала сгенерируй схему
npx @better-auth/cli generate

# Затем примени миграцию
npx @better-auth/cli migrate

# Для ZenStack
nx zenstack:generate <app>
nx db:push <app>
```

### "Column emailVerified has wrong type"

NextAuth использует `DateTime?`, Better Auth использует `Boolean`:

```sql
-- Миграция типа
ALTER TABLE "User"
  ALTER COLUMN "emailVerified" TYPE BOOLEAN
  USING CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END;
```

### Медленные запросы

1. Включи `experimental_joins: true`
2. Добавь индексы на `Session.userId` и `Session.token`
3. Настрой cookie caching (см. session-management.md)

---

## См. также

- [session-management.md](session-management.md) — Кэширование сессий
- [nextjs-integration.md](nextjs-integration.md) — Интеграция с Next.js
- [troubleshooting.md](troubleshooting.md) — Решение проблем
