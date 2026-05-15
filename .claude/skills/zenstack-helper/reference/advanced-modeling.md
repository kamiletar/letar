# Продвинутое моделирование

## Mixin — переиспользование полей

Используй `type` для определения переиспользуемых полей:

```zmodel
// Базовые поля для всех моделей
type BaseFields {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Поля для soft delete
type SoftDelete {
  isDeleted Boolean  @default(false)
  deletedAt DateTime?
}

// Применение через `with`
model User with BaseFields, SoftDelete {
  email String @unique
  name  String?
}

model Order with BaseFields {
  orderNumber String @unique
  userId      String
  user        User   @relation(fields: [userId], references: [id])
}
```

**Правила:**

- `type` не создаёт таблицу в БД
- Несколько mixin через запятую: `with A, B, C`
- Mixin можно вкладывать: `type Extended with BaseFields { ... }`

## Typed JSON

Типизация JSON полей через `@json`:

```zmodel
type Address {
  street  String
  city    String
  zip     String
  country String @default("RU")
}

type ContactInfo {
  phone   String?
  email   String?
  address Address?
}

model Company {
  id      String      @id @default(cuid())
  name    String

  /// @json
  contact ContactInfo?
}
```

**В TypeScript:**

```typescript
const company = await db.company.create({
  data: {
    name: 'Acme',
    contact: {
      phone: '+7999123456',
      address: {
        street: 'ул. Пушкина',
        city: 'Москва',
        zip: '123456',
        country: 'RU',
      },
    },
  },
})

// Типизированный доступ
company.contact?.address?.city // "Москва"
```

## View — SQL Views

⚠️ Preview feature. Требует ручного создания VIEW в БД.

```zmodel
view UserStats {
  id          String @id  // Обязательно поле с @id
  email       String
  orderCount  Int
  totalSpent  Decimal

  @@ignore // Не создаёт таблицу
}
```

**SQL для создания:**

```sql
CREATE VIEW "UserStats" AS
SELECT
  u.id,
  u.email,
  COUNT(o.id) as "orderCount",
  COALESCE(SUM(o.total), 0) as "totalSpent"
FROM "User" u
LEFT JOIN "Order" o ON u.id = o."userId"
GROUP BY u.id;
```

**Использование:**

```typescript
// Только чтение
const stats = await db.userStats.findMany()
```

## Multi-file — разделение схемы

Для больших проектов разбивай схему на файлы:

```
apps/my-app/
├── schema.zmodel           # Главный файл
├── models/
│   ├── user.zmodel
│   ├── order.zmodel
│   └── product.zmodel
└── types/
    └── shared.zmodel
```

**schema.zmodel:**

```zmodel
import "./types/shared"
import "./models/user"
import "./models/order"
import "./models/product"

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
}
```

**models/user.zmodel:**

```zmodel
model User with BaseFields {
  email  String @unique
  orders Order[]
}
```

## Polymorphism — наследование моделей

MTI (Multiple Table Inheritance) через `extends` и `@@delegate`:

```zmodel
// Базовая модель (абстрактная)
model Asset {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  type      String   // Дискриминатор

  @@delegate(type) // Включает полиморфизм
}

// Конкретные модели
model Video extends Asset {
  url      String
  duration Int
}

model Image extends Asset {
  url    String
  width  Int
  height Int
}

model Document extends Asset {
  url      String
  pageCount Int
}
```

**Использование:**

```typescript
// Запрос базовой модели возвращает конкретные типы
const assets = await db.asset.findMany()

for (const asset of assets) {
  if (asset.type === 'Video') {
    console.log((asset as Video).duration)
  }
}

// Создание конкретного типа
const video = await db.video.create({
  data: {
    url: 'https://...',
    duration: 120,
  },
})
```

**Особенности:**

- Каждая модель создаёт отдельную таблицу
- `@@delegate(field)` указывает поле-дискриминатор
- Запросы к базовой модели автоматически JOIN'ят дочерние
- Используй type guards для narrowing типов
