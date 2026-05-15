# Паттерны связей (Relations)

## Типы связей

### One-to-Many

```zmodel
model User {
  id     String  @id @default(cuid())
  orders Order[]
}

model Order {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

### Many-to-Many (явная таблица)

```zmodel
model Student {
  id          String             @id @default(cuid())
  enrollments CourseEnrollment[]
}

model Course {
  id          String             @id @default(cuid())
  enrollments CourseEnrollment[]
}

model CourseEnrollment {
  id        String   @id @default(cuid())
  studentId String
  courseId  String
  student   Student  @relation(fields: [studentId], references: [id])
  course    Course   @relation(fields: [courseId], references: [id])
  enrolledAt DateTime @default(now())

  @@unique([studentId, courseId])
}
```

### One-to-One

```zmodel
model User {
  id           String            @id @default(cuid())
  measurements UserMeasurements?
}

model UserMeasurements {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
  bust   Int?
  waist  Int?
  hips   Int?
}
```

## Каскадное удаление

```zmodel
model User {
  id     String  @id @default(cuid())
  orders Order[]
}

model Order {
  id     String @id @default(cuid())
  userId String
  // При удалении User удаляются все Order
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Варианты onDelete:**

- `Cascade` — удалять связанные записи
- `SetNull` — установить FK в null (поле должно быть nullable)
- `Restrict` — запретить удаление если есть связи (по умолчанию)
- `NoAction` — не делать ничего (БД решает)

## Индексы на FK

Всегда добавляй индексы на foreign key поля:

```zmodel
model Order {
  id     String @id @default(cuid())
  userId String

  user User @relation(fields: [userId], references: [id])

  @@index([userId])  // Ускоряет JOIN и фильтрацию
}
```

## Политики доступа для relations

```zmodel
model Order {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
  items  OrderItem[]

  // Доступ через relation
  @@allow('read', auth() == user)
  @@allow('create', auth() == user)
}

model OrderItem {
  id      String @id @default(cuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Наследуем доступ от родителя
  @@allow('read', auth() == order.user)
  @@allow('create', auth() == order.user)
}
```

## Include в запросах

```typescript
// Загрузить связи
const order = await db.order.findUnique({
  where: { id },
  include: {
    items: true,
    user: { select: { id: true, name: true } },
  },
})

// Вложенные include
const user = await db.user.findUnique({
  where: { id },
  include: {
    orders: {
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
})
```

## Создание связанных записей

```typescript
// Создать Order с Items за один запрос
const order = await db.order.create({
  data: {
    userId: session.user.id,
    orderNumber: generateOrderNumber(),
    items: {
      create: [
        { productName: 'Item 1', price: 100, quantity: 2 },
        { productName: 'Item 2', price: 200, quantity: 1 },
      ],
    },
  },
  include: { items: true },
})
```

## Обновление через relations

```typescript
// Добавить item к существующему order
await db.order.update({
  where: { id: orderId },
  data: {
    items: {
      create: { productName: 'New Item', price: 150, quantity: 1 },
    },
  },
})

// Удалить все items и создать новые
await db.order.update({
  where: { id: orderId },
  data: {
    items: {
      deleteMany: {},
      create: newItems,
    },
  },
})
```
