# Computed Fields — вычисляемые поля

Вычисляемые поля на уровне БД через Kysely expression builder (ZenStack v3, `@zenstackhq/orm`).
Вычисляются на стороне БД, а не в JS — в отличие от Prisma client extensions.

## Определение

```zmodel
model Order {
  id        String   @id @default(cuid())
  quantity  Int
  unitPrice Decimal
  discount  Decimal  @default(0)

  total     Decimal  @computed
}
```

## Реализация

Реализация передаётся в опцию `computedFields` при создании `ZenStackClient` (обычно в `lib/db.ts`):

```typescript
import { ZenStackClient } from '@zenstackhq/orm'
import { sql } from '@zenstackhq/orm/helpers'

const db = new ZenStackClient(schema, {
  dialect,
  computedFields: {
    Order: {
      total: (eb) => eb.ref('quantity').multiply(eb.ref('unitPrice')).subtract(eb.ref('discount')),
    },
  },
})
```

Колбэк получает вторым аргументом `context` с `modelAlias` — именем, которым запрос сейчас
адресует содержащую модель (полезно при self-join'ах и конфликте имён полей):

```typescript
computedFields: {
  User: {
    postCount: (eb, { modelAlias }) =>
      eb.selectFrom('Post')
        .whereRef('Post.authorId', '=', sql.ref(`${modelAlias}.id`))
        .select(({ fn }) => fn.countAll<number>().as('count')),
  },
}
```

## Примеры вычислений

### Простые арифметические

```typescript
computedFields: {
  OrderItem: {
    subtotal: (eb) => eb.ref('quantity').multiply(eb.ref('unitPrice')),
  },
  Product: {
    finalPrice: (eb) =>
      eb.ref('price').subtract(eb.ref('price').multiply(eb.ref('discountPercent')).divide(100)),
  },
}
```

### Агрегации (через подзапрос)

```typescript
computedFields: {
  User: {
    orderCount: (eb, { modelAlias }) =>
      eb.selectFrom('Order')
        .whereRef('Order.userId', '=', sql.ref(`${modelAlias}.id`))
        .select(({ fn }) => fn.countAll<number>().as('count')),
  },
}
```

### Условные выражения

```typescript
computedFields: {
  Product: {
    stockStatus: (eb) =>
      eb.case()
        .when('quantity', '>', 10).then(sql.lit('in_stock'))
        .when('quantity', '>', 0).then(sql.lit('low_stock'))
        .else(sql.lit('out_of_stock'))
        .end(),
  },
}
```

## Параметризованные computed-поля (ZenStack v3.9.0+)

Computed-поле может объявить типизированные параметры — аргументы передаются в самом запросе,
там, где поле используется. Полезно для «агрегат за произвольный период», задаваемый на клиенте,
а не зашитый в код (например «часы/выручка за диапазон дат»).

Параметры объявляются прямо после имени поля в `schema.zmodel`:

```zmodel
model User {
  id    Int    @id
  posts Post[]
  recentPostCount(since: DateTime) Int @computed
}
```

Реализация получает `args` третьим аргументом — типизирован по объявленным параметрам:

```typescript
computedFields: {
  User: {
    recentPostCount: (eb, { modelAlias }, args) =>
      eb.selectFrom('Post')
        .whereRef('Post.authorId', '=', sql.ref(`${modelAlias}.id`))
        .where('Post.createdAt', '>=', args.since)
        .select(({ fn }) => fn.countAll<number>().as('count')),
  },
}
```

⚠️ **Операнд сравнения с `DateTime`-колонкой — строка, а не `Date`.** ZenStack мапит `DateTime`
на `string` в Kysely-схеме (`MapBaseType` в `@zenstackhq/orm`), хотя сам параметр поля типизирован
как `Date`. Поэтому внутри реализации нужен явный `.toISOString()`:

```typescript
// ❌ TS2345: Argument of type 'Date' is not assignable to parameter of type
//    'OperandValueExpressionOrList<…, "Invoice.paidAt">'
.where('Invoice.paidAt', '>=', args.since)

// ❌ то же самое с обёрткой — RawBuilder<Date> тоже не подходит
.where('Invoice.paidAt', '>=', sql.val(args.since))

// ✅ значения в колонке хранятся в UTC, toISOString() тоже UTC
.where('Invoice.paidAt', '>=', new Date(args.since).toISOString())
```

### Передача аргументов в запросах

Параметризованное поле не возвращается «по умолчанию» (ему нужны аргументы) — обычный
`findMany()` без явного запроса поле не включит:

```typescript
const since = new Date('2024-01-01')

// select / include
await db.user.findFirst({ select: { id: true, recentPostCount: { args: { since } } } })
await db.user.findMany({ include: { recentPostCount: { args: { since } } } })

// where / having
await db.user.findMany({ where: { recentPostCount: { args: { since }, gte: 5 } } })

// orderBy — { args, sort, nulls? }
await db.user.findMany({ orderBy: { recentPostCount: { args: { since }, sort: 'desc' } } })

// aggregate — _count/_sum/_avg/_min/_max
await db.user.aggregate({ _sum: { recentPostCount: { args: { since } } } })

// groupBy — ключевая запись { field, args } в `by`
await db.user.groupBy({
  by: [{ field: 'recentPostCount', args: { since } }],
  _count: { _all: true },
})
```

Аргументы — обычные данные (не колбэк), поэтому сериализуются по проводу: фронтенд может
задавать их через auto-CRUD API, оставаясь типобезопасным сквозным образом.

⚠️ Группировка по computed-полю, реализованному через коррелированный подзапрос, подчиняется
правилам БД для группировки по коррелированному выражению — PostgreSQL это отклоняет, SQLite
разрешает.

### Где в letar пригодится

Параметризованные computed-поля закрывают паттерн «диапазон дат считается в TS-обвязке
(`startOfMonth`/`getMonthRangeStudioTz`), запрос тянет сырые записи, суммирование — вручную через
`reduce` в компоненте/PDF-рендерере». **Применено 2026-08-06** в `studio`:
`Client.paidRevenueKopecks(since: DateTime)` — виджет «топ-5 клиентов по выручке» на
`/owner/finance` больше не тянет всю историю оплаченных счетов в память, БД сама суммирует,
сортирует и отдаёт пять строк (`where`/`orderBy` по computed-полю с `args`).

**Где параметризованное поле НЕ окупается** (разобрано там же, оставлено как есть):

- Строки уже загружены для таблицы или PDF (отчёт клиенту за месяц) — `SUM` в SQL не экономит
  ни запроса, ни трафика, а только дублирует логику.
- Бизнес-правило суммы сложнее `SUM` (в `studio` — `computeReportLineAmount`: `REWORK` считается
  по нулю). TS-версия всё равно нужна для суммы каждой строки, а SQL-версия сделала бы правило
  живущим в двух местах — это не дедуп, а его противоположность.
- Соседние места считают «то же самое» с **разными** фильтрами (кабинет клиента показывает и
  черновики, PDF/CSV — нет). Одно поле на всех молча поменяло бы поведение части из них.

Отдельно: если поле уже есть и **без** параметров, сначала проверь, не зовут ли его обёртку
в цикле. В `studio` `getTotalBillableSecondsForProject` был запросом-на-проект внутри `map` по
проектам (N+1) — лечится не новым полем, а выбором существующего в общем `findMany`.

## Использование в запросах

```typescript
// Computed поля автоматически включаются
const orders = await db.order.findMany({
  select: {
    id: true,
    quantity: true,
    unitPrice: true,
    total: true, // Вычисляется на уровне SQL
  },
})

// Фильтрация по computed полю
const expensiveOrders = await db.order.findMany({
  where: { total: { gte: 1000 } },
})

// Сортировка по computed полю
const sortedOrders = await db.order.findMany({
  orderBy: { total: 'desc' },
})
```

## Преимущества

1. **Производительность** — вычисление на уровне БД, не в JS
2. **Консистентность** — единая логика везде
3. **Фильтрация/сортировка** — работает в WHERE/ORDER BY
4. **Типизация** — полная поддержка TypeScript, включая параметры

## Ограничения

- Требует ZenStack v3 (Kysely-based)
- Сложные вычисления могут замедлить запросы
- Не все SQL функции доступны через expression builder
- Параметризованное поле не возвращается без явного `select`/`include` с `args`
- Группировка по параметризованному полю-подзапросу ограничена правилами конкретной БД
- Для очень сложной логики используй SQL Views
