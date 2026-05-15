# Custom Procedures (ZenStack v3)

Встроенная возможность ZenStack v3 для определения пользовательских процедур прямо в ZModel с реализацией на TypeScript.

## Обзор

Custom Procedures позволяют:

- Инкапсулировать сложную бизнес-логику в ZModel
- Автоматически получать доступ через ORM клиент (`$procs`)
- Генерировать HTTP API эндпоинты (`POST /api/$procs/procedureName`)
- Генерировать TanStack Query хуки

## Синтаксис

### Определение типов входных данных

```zmodel
type SignUpInput {
  email   String
  name    String?
}

type TransferInput {
  connectionId    String
  toInstructorId  String
  reason          String?
  transferBalance Boolean @default(false)
}
```

### Определение процедур

```zmodel
// Процедура возвращает модель
proc signUp(args: SignUpInput): User

// Процедура возвращает nullable
proc getCurrentUser(): User?

// Процедура возвращает массив
proc getUserFeeds(userId: String, limit: Int?): Post[]

// Процедура без возврата
proc sendNotification(userId: String, message: String): Void
```

## Реализация на TypeScript

Процедуры реализуются при создании ZenStackClient в опции `procs`:

```typescript
// lib/db.ts
import { schema } from '@/generated/zenstack'
import { ZenStackClient } from '@zenstackhq/orm'

// Реализации процедур
const procs = {
  signUp: async (client, args: { email: string; name?: string }) => {
    const hashedPassword = await hashPassword(args.password)
    const user = await client.user.create({
      data: {
        email: args.email,
        name: args.name,
        password: hashedPassword,
      },
    })
    await sendWelcomeEmail(user.email)
    return user
  },

  initiateTransfer: async (
    client,
    args: { connectionId: string; toInstructorId: string; reason?: string; transferBalance: boolean }
  ) => {
    // Бизнес-логика передачи ученика
    const connection = await client.studentInstructorConnection.findUnique({
      where: { id: args.connectionId },
    })

    if (!connection) {
      throw new Error('CONNECTION_NOT_FOUND')
    }

    return client.studentTransfer.create({
      data: {
        connectionId: args.connectionId,
        toInstructorId: args.toInstructorId,
        reason: args.reason,
        transferBalance: args.transferBalance,
        status: 'PENDING',
      },
    })
  },
}

export function getEnhancedPrisma(user?: { id: string; roles: string[] }) {
  return new ZenStackClient(schema, {
    dialect: { type: 'postgres', connectionString: process.env.DATABASE_URL },
    user,
    procs,
  })
}
```

## Использование

### Через ORM клиент

```typescript
import { getEnhancedPrisma } from '@/lib/db'

const db = getEnhancedPrisma(session?.user)

// Вызов процедуры
const user = await db.$procs.signUp({
  email: 'user@example.com',
  name: 'John',
})

const transfer = await db.$procs.initiateTransfer({
  connectionId: 'conn_123',
  toInstructorId: 'inst_456',
  reason: 'Переезд в другой район',
  transferBalance: true,
})
```

### Через HTTP API

```bash
# POST запрос на автогенерируемый эндпоинт
curl -X POST /api/$procs/signUp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John"}'
```

### Через TanStack Query хуки

```typescript
import { useInitiateTransfer, useSignUp } from '@/generated/hooks'

// Mutation хук
const { mutate: signUp, isPending } = useSignUp()

const handleSignUp = () => {
  signUp(
    { email, name },
    {
      onSuccess: (user) => {
        console.log('User created:', user)
      },
    }
  )
}
```

## Примеры для driving-school

### Transfer Module

```zmodel
// Типы
type InitiateTransferInput {
  connectionId    String
  toInstructorId  String
  reason          String?
  transferBalance Boolean @default(false)
}

type TransferResult {
  success   Boolean
  transferId String?
  error     String?
}

// Процедуры
proc initiateTransfer(args: InitiateTransferInput): TransferResult
proc acceptTransfer(transferId: String): TransferResult
proc rejectTransfer(transferId: String, reason: String?): TransferResult
proc cancelTransfer(transferId: String): TransferResult
```

### Lesson Module

```zmodel
type LessonResult {
  success   Boolean
  lessonId  String?
  error     String?
}

proc confirmLesson(lessonId: String): LessonResult
proc cancelLesson(lessonId: String, reason: String?): LessonResult
proc completeLesson(lessonId: String, notes: String?): LessonResult
proc markNoShow(lessonId: String): LessonResult
```

### Enrollment Module

```zmodel
type EnrollmentResult {
  success     Boolean
  connectionId String?
  error       String?
}

proc approveEnrollmentRequest(requestId: String): EnrollmentResult
proc rejectEnrollmentRequest(requestId: String, reason: String?): EnrollmentResult
```

## Преимущества перед Server Actions

| Аспект            | Custom Procedures          | Server Actions         |
| ----------------- | -------------------------- | ---------------------- |
| Типизация         | Автогенерируемая из ZModel | Ручная                 |
| Доступ            | ORM + хуки + HTTP API      | Только серверный вызов |
| Тестирование      | Изолированные функции      | Требует моки Next.js   |
| Переиспользование | Везде где есть ORM клиент  | Только в Next.js       |
| Авторизация       | Встроенная через policies  | Ручная проверка        |

## Особенности

- Процедуры выполняются с контекстом авторизации (auth())
- Access policies применяются к операциям внутри процедур
- Можно использовать транзакции через `client.$transaction()`
- Ошибки пробрасываются клиенту с сохранением типа

## Миграция с Server Actions

```typescript
// ❌ Было — Server Action
'use server'
export async function initiateTransfer(data: TransferData) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const db = getEnhancedPrisma(session.user)
  // ... бизнес-логика
}

// ✅ Стало — Custom Procedure в schema.zmodel
proc initiateTransfer(args: InitiateTransferInput): TransferResult

// Использование (авторизация встроена):
const result = await db.$procs.initiateTransfer({ connectionId, toInstructorId })
```

---

> **Версия:** ZenStack 3.x
> **Документация:** https://zenstack.dev/blog/next-chapter-2
