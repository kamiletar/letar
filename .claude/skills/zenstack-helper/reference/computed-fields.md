# Computed Fields — вычисляемые поля

Вычисляемые поля на уровне БД через Kysely expression builder.

## Определение

```zmodel
model Order {
  id        String   @id @default(cuid())
  quantity  Int
  unitPrice Decimal
  discount  Decimal  @default(0)

  /// Вычисляемое поле — итоговая сумма
  /// @computed
  total     Decimal
}
```

## Реализация

В `lib/db.ts` или отдельном файле:

```typescript
import { sql } from 'kysely'
import { computed } from 'zenstack/enhancer'

// Определение вычисляемого поля
computed('Order', 'total', (eb) => {
  // eb — Kysely expression builder
  return eb.ref('quantity').multiply(eb.ref('unitPrice')).subtract(eb.ref('discount'))
})
```

## Примеры вычислений

### Простые арифметические

```typescript
// Сумма: quantity * unitPrice
computed('OrderItem', 'subtotal', (eb) => eb.ref('quantity').multiply(eb.ref('unitPrice')))

// С условием: price с учётом скидки
computed('Product', 'finalPrice', (eb) =>
  eb.ref('price').subtract(eb.ref('price').multiply(eb.ref('discountPercent')).divide(100))
)
```

### Строковые операции

```typescript
// Полное имя
computed('User', 'fullName', (eb) => eb.fn('concat', [eb.ref('firstName'), sql.lit(' '), eb.ref('lastName')]))
```

### Агрегации (через подзапрос)

```typescript
import { jsonArrayFrom } from 'kysely/helpers/postgres'

// Количество заказов пользователя
computed('User', 'orderCount', (eb) =>
  eb.selectFrom('Order').whereRef('Order.userId', '=', 'User.id').select(eb.fn.count('id').as('count'))
)
```

### Условные выражения

```typescript
// Статус на основе количества
computed('Product', 'stockStatus', (eb) =>
  eb
    .case()
    .when('quantity', '>', 10)
    .then(sql.lit('in_stock'))
    .when('quantity', '>', 0)
    .then(sql.lit('low_stock'))
    .else(sql.lit('out_of_stock'))
    .end()
)
```

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
  where: {
    total: { gte: 1000 },
  },
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
4. **Типизация** — полная поддержка TypeScript

## Ограничения

- Требует ZenStack v3 (Kysely-based)
- Сложные вычисления могут замедлить запросы
- Не все SQL функции доступны через expression builder
- Для очень сложной логики используй SQL Views
