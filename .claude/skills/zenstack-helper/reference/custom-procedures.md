# Custom Procedures (ZenStack v3)

Встроенная возможность ZenStack v3 для определения пользовательских процедур прямо в ZModel с реализацией на TypeScript. Preview-фича, доступна с v3.2.0.

⚠️ **Синтаксис ниже сверен с официальными доками (`orm/custom-proc`, `modeling/custom-proc`) и
типом `ProcedureHandlerFunc` из `@zenstackhq/orm` на 2026-09-04** — до этой правки файл описывал
устаревший/никогда не существовавший синтаксис (`proc` вместо `procedure`, позиционные
`(client, args)` вместо объекта-контекста, вызов без обёртки `{ args: {...} }`). Если где-то в
монорепо встретишь код по старому образцу — это не альтернативный валидный вариант, а расхождение
с типами, которое стоит перепроверить (см. `.claude/docs/` на предмет открытой находки по
`driving-school`, если её ещё не закрыли).

## Обзор

Custom Procedures позволяют:

- Инкапсулировать сложную бизнес-логику в ZModel
- Автоматически получать доступ через ORM клиент (`$procs`)
- Генерировать HTTP API эндпоинты Query-as-a-Service (RPC- и RESTful-стиль)
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

Ключевое слово — `procedure` для чтения, `mutation procedure` для операций, которые пишут в БД
(семантической разницы на уровне ORM пока нет, но она зарезервирована на будущее — например для
кеширования запросов):

```zmodel
// Процедура возвращает модель
mutation procedure signUp(args: SignUpInput): User

// Процедура возвращает nullable
procedure getCurrentUser(): User?

// Процедура возвращает массив
procedure getUserFeeds(userId: String, limit: Int?): Post[]

// Процедура без возврата
mutation procedure sendNotification(userId: String, message: String): Void
```

Параметры можно передавать и напрямую (без обёртки в `type`), и через именованный `type` — как
в примере `signUp(args: SignUpInput)` выше.

## Реализация на TypeScript

Процедуры реализуются при создании `ZenStackClient` в опции `procedures`. Каждый обработчик —
функция **одного** аргумента-контекста (не двух позиционных!) с полями `client` и `args`:

```typescript
// lib/db.ts
import { schema } from '@/generated/zenstack'
import { ZenStackClient } from '@zenstackhq/orm'

const procedures = {
  signUp: async ({ client, args }: { client: typeof client; args: { email: string; name?: string } }) => {
    const user = await client.user.create({
      data: { email: args.email, name: args.name },
    })
    await sendWelcomeEmail(user.email)
    return user
  },

  initiateTransfer: async ({
    client,
    args,
  }: {
    client: typeof client
    args: { connectionId: string; toInstructorId: string; reason?: string; transferBalance: boolean }
  }) => {
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
    procedures,
  })
}
```

При типизации через сгенерированную схему `client`/`args` выводятся автоматически из объявления в
`schema.zmodel` — аннотации типов в примере выше явные только для читаемости вне контекста
конкретного приложения.

## Использование

### Через ORM клиент

Методы процедур сгруппированы под `$procs`. Аргументы передаются **обёрнутыми** в объект с
ключом `args` — это отдельный параметр вызова, не сами аргументы напрямую:

```typescript
import { getEnhancedPrisma } from '@/lib/db'

const db = getEnhancedPrisma(session?.user)

// ⚠️ args — обязательная обёртка, не db.$procs.signUp({ email, name })
const user = await db.$procs.signUp({
  args: { email: 'user@example.com', name: 'John' },
})

const transfer = await db.$procs.initiateTransfer({
  args: {
    connectionId: 'conn_123',
    toInstructorId: 'inst_456',
    reason: 'Переезд в другой район',
    transferBalance: true,
  },
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
    },
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
mutation procedure initiateTransfer(args: InitiateTransferInput): TransferResult
mutation procedure acceptTransfer(transferId: String): TransferResult
mutation procedure rejectTransfer(transferId: String, reason: String?): TransferResult
mutation procedure cancelTransfer(transferId: String): TransferResult
```

### Lesson Module

```zmodel
type LessonResult {
  success   Boolean
  lessonId  String?
  error     String?
}

mutation procedure confirmLesson(lessonId: String): LessonResult
mutation procedure cancelLesson(lessonId: String, reason: String?): LessonResult
mutation procedure completeLesson(lessonId: String, notes: String?): LessonResult
mutation procedure markNoShow(lessonId: String): LessonResult
```

### Enrollment Module

```zmodel
type EnrollmentResult {
  success     Boolean
  connectionId String?
  error       String?
}

mutation procedure approveEnrollmentRequest(requestId: String): EnrollmentResult
mutation procedure rejectEnrollmentRequest(requestId: String, reason: String?): EnrollmentResult
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
mutation procedure initiateTransfer(args: InitiateTransferInput): TransferResult

// Использование (авторизация встроена, args — обязательная обёртка):
const result = await db.$procs.initiateTransfer({ args: { connectionId, toInstructorId } })
```

---

> **Версия:** ZenStack 3.x
> **Документация:** https://zenstack.dev/blog/next-chapter-2
