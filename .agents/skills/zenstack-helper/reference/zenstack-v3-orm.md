# ZenStack v3 ORM

ZenStack v3 использует Kysely для генерации SQL вместо Prisma Client runtime.

> **Версия:** 3.3.0+ (актуально на январь 2026)

## Ключевые отличия от Prisma

### 1. Типы возвращаются как строки для enum

```typescript
// ❌ Prisma — enum объект
user.role // UserRole.ADMIN

// ✅ ZenStack v3 — строка
user.role // "ADMIN"

// Приведение типа если нужен enum
user.role as UserRole
```

### 2. Нет \_count в select/include

```typescript
// ❌ НЕ РАБОТАЕТ
const user = await db.user.findUnique({
  where: { id },
  include: { _count: { select: { orders: true } } },
})

// ✅ РАБОТАЕТ — загрузи и посчитай
const user = await db.user.findUnique({
  where: { id },
  include: { orders: true },
})
const ordersCount = user?.orders.length ?? 0
```

### 3. `$transaction` — вернулся (v3.8+, было отсутствие в ранних v3)

⚠️ **Устаревшее утверждение ниже держалось в этом файле до 2026-09-04** — в v3.3 `$transaction`
действительно отсутствовал, но в текущей 3.9.3 он снова есть, в двух формах.

```typescript
// ✅ Sequential — массив операций, выполняется по порядку, без взаимного доступа между шагами
const [a, b] = await db.$transaction([
  db.user.create({ data: { name: 'Alice' } }),
  db.user.create({ data: { name: 'Bob' } }),
])

// ✅ Interactive — callback с транзакционным клиентом, результат шага доступен следующему
const post = await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { name: 'Alice' } })
  return tx.post.create({ data: { title: 'Hi', authorId: user.id } })
})
```

> Результаты вызовов ORM — ленивые промисы, не выполняются до `await` (напрямую или внутри
> `$transaction`).

**Не путать с `client.$transaction.useSequential()`** (v3.7+) — это отдельный TanStack Query хук
для последовательных мутаций **с фронта** (несколько связанных мутаций одним запросом), не метод
серверного ORM-клиента. Описан в [data-fetching.md](/.claude/docs/data-fetching.md) («Паттерн 3.5»).
Используется, когда фронту нужна атомарность нескольких `.mutate()` без ручного чейна.

### 4. Ограничения вложенных операций

```typescript
// ❌ Может не работать — глубокие вложенные upsert
await db.order.update({
  where: { id },
  data: {
    items: {
      upsert: {  // Ограничения в v3
        where: { id: itemId },
        create: {...},
        update: {...}
      }
    }
  }
})

// ✅ РАБОТАЕТ — разбей на операции
const item = await db.orderItem.findUnique({ where: { id: itemId } })
if (item) {
  await db.orderItem.update({ where: { id: itemId }, data: {...} })
} else {
  await db.orderItem.create({ data: {...} })
}
```

### 5. Новый `exists` API (v3.2.0+)

```typescript
// ✅ Проверка существования записи — новый метод!
const hasPublishedPosts = await db.post.exists({ where: { published: true } })

// Проверка с условиями
const userHasOrders = await db.order.exists({
  where: {
    userId: session.user.id,
    status: 'COMPLETED',
  },
})

// Использование в условной логике
if (await db.user.exists({ where: { email } })) {
  throw new Error('Email уже зарегистрирован')
}
```

**Преимущества перед findFirst:**

```typescript
// ❌ Старый способ — загружает данные
const exists = (await db.post.findFirst({ where: { published: true } })) !== null

// ✅ Новый способ — только проверка (быстрее!)
const exists = await db.post.exists({ where: { published: true } })
```

**Возвращает:** `Promise<boolean>`

### 6. Оператор `between` для фильтрации (v3.3.0+)

```typescript
// Фильтрация по диапазону значений
const teenagers = await db.user.findMany({
  where: {
    age: { between: [13, 19] },
  },
})

const products = await db.product.findMany({
  where: {
    price: { between: [100, 500] },
  },
})
```

### 7. `@updatedAt(ignore: [...])` (v3.3.0+)

Исключение полей из автообновления `updatedAt`:

```zmodel
model Post {
  id        String   @id @default(cuid())
  title     String
  meta      Json?    // Технические метаданные
  viewCount Int      @default(0)  // Счётчик просмотров
  updatedAt DateTime @updatedAt(ignore: [meta, viewCount])
}
```

Изменение `meta` или `viewCount` не обновит `updatedAt`.

### 8. Binding переменные в предикатах (v3.3.0+)

Явное именование элементов при обходе вложенных коллекций:

```zmodel
model User {
  posts Post[]

  // Простой синтаксис
  @@allow('read', posts?[published])

  // С binding переменными для вложенных коллекций
  @@allow('read', posts?[p, p.published && p.comments?[c, c.approved]])
}
```

### 9. MySQL поддержка (v3.3.0+ Preview)

```typescript
import { MySQLDialect } from 'zenstack/dialects'

const orm = new ZenStackClient(schema, {
  dialect: new MySQLDialect({
    pool: createPool({
      host: 'localhost',
      database: 'mydb',
      user: 'root',
      password: 'password',
    }),
  }),
})
```

> **Статус:** Preview — для production рекомендуется PostgreSQL.

### 10. Расширение ORM через плагины (v3.3.0+)

```typescript
const orm = new ZenStackClient(schema, {
  plugins: [
    {
      // Добавляет кастомные методы к клиенту
      extendClient: (client) => ({
        ...client,
        $invalidateCache: async () => {
          /* ... */
        },
      }),
      // Добавляет параметры к аргументам запросов
      extendQueryArgs: (args) => ({
        ...args,
        cacheKey: z.string().optional(),
      }),
    },
  ],
})

// Использование
await db.$invalidateCache()
const users = await db.user.findMany({ cacheKey: 'users-list' })
```

## Enhanced клиент

```typescript
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

// В Server Action или API
const session = await auth.api.getSession({ headers: await headers() })
const db = getEnhancedPrisma(session?.user)

// Автоматически применяются @@allow/@@deny политики
const orders = await db.order.findMany() // Только доступные пользователю
```

## Inferred Types

ZenStack предоставляет type-safe типы:

```typescript
import type { Prisma } from '@/generated/prisma'

// Тип для создания
type CreateUserInput = Prisma.UserCreateInput

// Тип для обновления
type UpdateUserInput = Prisma.UserUpdateInput

// Тип результата с включениями
type UserWithOrders = Prisma.UserGetPayload<{
  include: { orders: true }
}>
```

## Kysely escape hatch — `$qb` и `$expr`

Когда ORM API не выражает нужный запрос — полный типизированный Kysely query builder на клиенте
(API самого Kysely — https://kysely.dev):

```typescript
const rows = await db.$qb.selectFrom('User').select(['id', 'name']).where('age', '>', 18).execute()
```

`$expr` — вставка Kysely-выражения прямо в `where` ORM-запроса, смешивая оба API:

```typescript
await db.post.findMany({
  where: {
    published: true,
    $expr: (eb) => eb('viewCount', '>', 100),
  },
})
```

⚠️ **`$qb` обходит access-политики и ORM-валидацию** — если на клиенте навешан policy-плагин
(`getEnhancedPrisma`), `$qb` его не видит. Использовать только на заведомо доверенном пути
(background job, admin-скрипт), не в user-facing запросе с enhanced-клиентом.

## Обработка ошибок — `ORMError`

Все ошибки ORM — экземпляры `ORMError` из `@zenstackhq/orm`. Поле `reason` — один из
`CONFIG_ERROR`, `INVALID_INPUT`, `NOT_FOUND`, `REJECTED_BY_POLICY`, `DB_QUERY_ERROR`,
`NOT_SUPPORTED`, `INTERNAL_ERROR`. Остальные поля: `model`, `dbErrorCode`, `dbErrorMessage`,
`rejectedByPolicyReason`, и для `DB_QUERY_ERROR` — `sql`/`sqlParams`.

```typescript
import { ORMError } from '@zenstackhq/orm'

try {
  await userDb.post.create({ data: { title: '' } })
} catch (e) {
  if (e instanceof ORMError && e.reason === 'REJECTED_BY_POLICY') {
    // обработка отказа доступа
  }
}
```

Про `dbErrorCode` конкретно (сырой `SQLSTATE` вроде `23505`, не Prisma-код `P2002`) — отдельный
разбор с граблей на практике: [zenstack-v3-orm-error-codes.md](/.claude/docs/zenstack-v3-orm-error-codes.md).

Когда `reason === 'REJECTED_BY_POLICY'`, дополнительно доступен `rejectedByPolicyReason`:
`NO_ACCESS` (обычный отказ политикой), `CANNOT_READ_BACK` (запись прошла — часто именно `create` —
но текущий актор не вправе прочитать результат назад), `OTHER`. `CANNOT_READ_BACK` — тот самый
случай, который в этом монорепо обходится сырым `prisma`-клиентом заранее (см.
[zenstack-public-write-read-back.md](/.claude/docs/zenstack-public-write-read-back.md)); ветка по
этому коду нужна только если по какой-то причине остаёшься на enhanced-клиенте и хочешь
обработать именно этот случай отдельно от обычного отказа доступа.

## Отладка

### Логирование SQL

⚠️ **Ниже — реальный API.** До 2026-09-04 здесь был пример с несуществующим `zenstack.config.ts` —
такого файла в конфигурации `ZenStackClient` нет, логирование настраивается опцией `log` прямо в
конструкторе клиента (передаётся насквозь в Kysely):

```typescript
// Список уровней — логирует в консоль
const db = new ZenStackClient(schema, {
  ...
  log: ['query', 'error'],
})

// Или функция — полный контроль над форматом/приёмником
const db = new ZenStackClient(schema, {
  ...
  log: (event) => {
    // event.level: 'query' | 'error'
    // event.query — CompiledQuery от Kysely (SQL + параметры)
    // event.queryDurationMillis
    // event.error — только при level === 'error'
    console.log(`[${event.level}] ${event.queryDurationMillis}ms`)
  },
})
```

### Проверка политик

```typescript
// Если запрос возвращает пустой результат:
// 1. Проверь session.user — есть ли roles?
// 2. Используй getEnhancedPrisma, а не raw Prisma
// 3. Проверь @@allow политики в schema.zmodel
```

## Миграция с Prisma

При переходе с Prisma Client на ZenStack:

1. Замени `_count` на include + length
2. `$transaction` работает как в Prisma (sequential-массив и interactive-callback) — переносится
   без изменений, см. §3 выше
3. Добавь type assertions для enum
4. Используй Enhanced клиент вместо raw Prisma

## Новое в v3.3.0

- **MySQL поддержка (preview)** — первый preview диалект для MySQL
- **Оператор `between`** — `age: { between: [0, 18] }`
- **`@updatedAt(ignore: [...])`** — исключение полей из автообновления
- **Binding переменные** — `posts?[p, p.published]` для вложенных предикатов
- **Расширение ORM через плагины** — кастомные методы и параметры запросов
- **Улучшения производительности** — кэширование Zod схем
- **Исправления** — PostgreSQL timezone, массивы, миксины, Better-Auth генерация
