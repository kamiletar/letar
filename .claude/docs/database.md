# База данных и ZenStack

> **Версия:** ZenStack 3.3.0+ (январь 2026)

## ⚠️ КРИТИЧНО - Воркфлоу ZenStack

**НИКОГДА не редактируй `src/generated/schema.prisma` напрямую. ВСЕГДА редактируй `schema.zmodel` вместо этого.**

**⚠️ `generator client` устарел в ZenStack v3!** Используй только `plugin prisma` для генерации Prisma клиента. Если видишь `generator client` в schema.zmodel — удали его.

### Воркфлоу редактирования схемы

1. Редактируй `apps/<app-name>/schema.zmodel` (источник истины)
2. Запусти `nx zenstack:generate <app-name>` для генерации всего в `src/generated/`:
   - `src/generated/schema.prisma` - Prisma схема
   - `src/generated/prisma/` - Prisma Client
   - `src/generated/zod/` - Zod схемы валидации для всех моделей
   - `src/generated/zenstack/` - Enhanced Prisma клиент с политиками доступа
   - `src/generated/hooks/` - TanStack Query хуки (опционально)
3. Запусти `nx db:push <app-name>` (dev) или `nx db:migrate <app-name>` (prod) для обновления базы данных

**Важно:** `zenstack:generate` автоматически запускает `prisma generate`, поэтому отдельный `db:generate` обычно не нужен!

### Функции ZenStack

- **Политики контроля доступа** определяются декораторами `@@allow()` и `@@deny()`
- Функция `auth()` в политиках ссылается на авторизованного пользователя
- **Row-level безопасность** обеспечивается на уровне ORM
- **Enhanced Prisma Client** автоматически фильтрует запросы на основе политик
- **Автогенерируемые Zod схемы** доступны в директории `src/generated/zod/` для валидации форм с @letar/forms

### Множественные роли

**ВАЖНО:** Пользователь может иметь несколько ролей одновременно (массив `roles` вместо одного `role`).

**Пример схемы с множественными ролями:**

```zmodel
model User {
  id    String     @id @default(cuid())
  roles UserRole[] // ← Массив ролей!

  // Политики доступа для множественных ролей используют has()
  @@allow('read', auth() == this)
  @@allow('all', has(auth().roles, ADMIN))
  @@allow('all', has(auth().roles, OWNER))
}

enum UserRole {
  STUDENT
  INSTRUCTOR
  SCHOOL_ADMIN
  OWNER
}
```

**Синтаксис политик для массива ролей:**

```zmodel
// ✅ Правильно - проверка наличия роли в массиве
@@allow('all', has(auth().roles, OWNER))
@@allow('read', has(auth().roles, INSTRUCTOR))

// ❌ Неправильно - старый синтаксис для одной роли
@@allow('all', auth().role == OWNER)
```

**Типичные комбинации ролей:**

- `['STUDENT']` — ученик
- `['INSTRUCTOR']` — инструктор
- `['STUDENT', 'INSTRUCTOR']` — ученик, который также преподаёт
- `['INSTRUCTOR', 'SCHOOL_ADMIN']` — инструктор-админ школы
- `['OWNER']` — владелец платформы (полный доступ)

### Использование Enhanced Prisma Client

```typescript
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
const db = getEnhancedPrisma(session?.user) // ← Enhanced клиент с политиками доступа

// Пользователь может видеть только свои данные
const orders = await db.order.findMany() // Автоматически фильтруется по userId
```

## ⚠️ КРИТИЧНО - Пути импортов

### Генерируемые файлы

Все генерируемые файлы теперь в `src/generated/` и используют алиас `@/generated/`:

```typescript
// ✅ ПРАВИЛЬНО - все генерируемые файлы используют @/generated/
import { GenderFormSchema } from '@/generated/form-schemas/enums/Gender.form'
import { Gender, PrismaClient } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'

// ❌ НЕПРАВИЛЬНО - @core/zod больше не используется (v3 не поддерживает)
import { Gender } from '@/../prisma/generated' // Устарело
import { GenderSchema } from '@/generated/zod/enums/Gender.schema' // Устарело
// import { enhance } from '@/generated/zenstack/enhance' // Устарело в v3!
```

> ⚠️ **Исключение:** `import { PrismaClient } from '@/generated/prisma'` в примере выше годится
> только для **типов** (`Gender` и т.п.) — как **класс для `new PrismaClient()`** он работает
> лишь в приложении, где само приложение реально его инстанцирует (не через `ZenStackClient`,
> см. `getEnhancedPrisma()` — большинство приложений так и делает, поэтому проблема почти нигде
> не всплывает). В **server-only скриптах** (`prisma/seed.ts`, `infra/migrations/*.ts`) — см.
> отдельный раздел [«`PrismaClient` в server-only скриптах»](#критично---prismaclient-в-server-only-скриптах-seed-миграции) ниже, там этот же импорт ломается.

### Структура директории generated

```
src/generated/
├── prisma/         # Prisma Client + типы + enum'ы
├── form-schemas/   # Zod схемы для форм (@letar/zenstack-form-plugin)
│   ├── enums/      # Схемы enum'ов с UI метаданными (Gender.form.ts)
│   └── models/     # Схемы моделей (User.form.ts)
├── schema.ts       # ZenStack v3 schema для ZenStackClient
├── models.ts       # Типы моделей
├── input.ts        # Input types для операций
└── hooks/          # TanStack Query хуки (опционально)
```

**Примечание:** В ZenStack v3 папка `zenstack/` с `enhance.ts` больше не используется. Enhanced клиент создаётся через `getEnhancedPrisma()` из `@/lib/db` с использованием `PolicyPlugin`.

### Типы и enum'ы Prisma vs ZenStack Query Types

**⚠️ КРИТИЧНО:** ZenStack v3 генерирует собственные типы для запросов, которые **несовместимы** с типами Prisma!

**Правило:**

- **Enum'ы и модельные типы** → `@/generated/prisma`
- **Query types (WhereInput, GetPayload, CreateArgs, etc.)** → `@/generated/input`

```typescript
// ✅ ПРАВИЛЬНО — enum'ы из @/generated/prisma
import type { LicenseCategory, TransmissionType } from '@/generated/prisma'

// ✅ ПРАВИЛЬНО — query types из @/generated/input
import type {
  InstructorProfileGetPayload,
  InstructorProfileWhereInput,
  InstructorVehicleWhereInput,
} from '@/generated/input'

// ❌ НЕПРАВИЛЬНО — Prisma namespace для query types
import type { Prisma } from '@/generated/prisma'
const where: Prisma.InstructorProfileWhereInput = { ... } // НЕ совместимо с ZenStack клиентом!
```

**Пример правильного использования:**

```typescript
import type { SchoolGetPayload, SchoolWhereInput } from '@/generated/input'
import type { LicenseCategory } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// Тип для результата запроса с include
type SchoolWithCount = SchoolGetPayload<{
  include: { _count: { select: { members: true } } }
}>

// Условия фильтрации с правильным типом
const where: SchoolWhereInput = {
  isPublic: true,
  ...(category && { licenseCategories: { has: category } }),
}

// Запрос без as any — типы совместимы!
const schools = await prisma.school.findMany({
  where, // ✅ Теперь работает
  include: { _count: { select: { members: true } } },
})
```

**OrderBy типы:**

- OrderBy типы НЕ экспортируются отдельно
- Используй функцию и позволь TypeScript вывести тип

```typescript
const getOrderBy = () => {
  switch (sortBy) {
    case 'experience':
      return [{ experienceStartDate: { sort: 'asc' as const, nulls: 'last' as const } }]
    case 'rating':
    default:
      return [{ averageRating: { sort: 'desc' as const, nulls: 'last' as const } }]
  }
}

const instructors = await prisma.instructorProfile.findMany({
  where,
  orderBy: getOrderBy(), // TypeScript выводит тип автоматически
})
```

## Модели базы данных

### Модели аутентификации

**User** - Аккаунты пользователей с ролевым доступом

- Поля: id, name, email, emailVerified, image, gender, birthdate, phoneNumber, role
- Доступ: Пользователи могут читать/обновлять свои данные, админы имеют полный доступ
- Связи: accounts, sessions, orders, cart, wishlist, measurements, addresses, notificationPreferences

**Account** - Привязки OAuth аккаунтов (Google, Yandex, VK, Telegram)

- Поля: id, userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token
- Доступ: Пользователи могут читать свои аккаунты

**Session** - Пользовательские сессии (JWT-based для Edge Runtime)

- Поля: id, sessionToken, userId, expires
- Доступ: Пользователи могут управлять своими сессиями

**VerificationToken** - Токены верификации email

- Поля: identifier, token, expires
- Доступ: Публичное чтение

### Модели товаров

**Product** - Основная сущность товара

- Поля: id, name, description, gender (MALE/FEMALE)
- Связи: variants (один-ко-многим)
- Доступ: Публичное чтение

**ProductVariant** - Варианты товара (цвет, состав)

- Поля: id, productId, composition, color
- Связи: product, items, images
- Доступ: Публичное чтение

**ProductItem** - Конкретные товарные позиции (размер + цена + остаток)

- Поля: id, variantId, sizeId, price (Decimal), availableCount
- Связи: variant, size
- Доступ: Публичное чтение

**ProductSize** - Размерная сетка с международными стандартами

- Поля: id, gender, international, ru, de, it, fr, uk, us, jeansFrom, jeansTo
- Мерки: bustMin/Max, waistMin/Max, hipsMin/Max (в см)
- Особое: sortOrder для кастомной сортировки, уникальное ограничение на (ru, gender)
- Доступ: Публичное чтение, полный доступ для админа

**VariantImage** - Изображения вариантов товара

- Поля: id, variantId, url, alt, order
- Доступ: Публичное чтение

### Модели профиля пользователя

**UserMeasurements** - Мерки пользователя для рекомендаций размеров

- Поля: id, userId (уникальный), gender, bust, waist, hips, height, preferredSize, notes
- Доступ: Пользователь может читать/обновлять свои, админ может читать
- Функции: Живые рекомендации размеров с алгоритмом взвешенного расстояния

**Cart & CartItem** - Корзина с товарами

- Cart: id, userId (уникальный), items[]
- CartItem: id, cartId, productItemId, quantity
- Доступ: Пользователь может управлять своей корзиной, админ может читать

**Wishlist & WishlistItem** - Список желаний пользователя

- Wishlist: id, userId (уникальный), items[]
- WishlistItem: id, wishlistId, productVariantId (уникальное ограничение)
- Доступ: Пользователь может управлять своим списком, админ может читать

**Address** - Адреса доставки с интеграцией DaData

- Поля: id, userId, label, fullAddress, postalCode, country, region, city, street, house, block, flat, recipientName, phone, isDefault
- Доступ: Пользователь может управлять своими адресами, админ может читать
- Функции: Автодополнение DaData, установка адреса по умолчанию

**Order & OrderItem** - История заказов со снэпшотами

- Order: id, userId, orderNumber (уникальный), status (enum), customerName, customerPhone, customerEmail, deliveryAddress, deliveryCity, deliveryRegion, deliveryPostalCode, deliveryCountry, totalAmount, notes
- OrderItem: id, orderId, productName, variantColor, sizeName, price, quantity (снэпшот данных)
- Доступ: Пользователь может читать свои заказы и создавать новые, админ может читать/обновлять/удалять все
- Функции: Уникальные номера заказов (ORD-YYYYMMDD-XXXXX), сохранение снэпшотов данных

**NotificationPreferences** - Настройки Email/SMS уведомлений

- Поля: id, userId (уникальный), emailOrderStatus, emailPromotions, emailNewsletter, smsOrderStatus
- Доступ: Пользователь может управлять своими настройками, админ может читать

### Тестовые модели

**TestModel** - Эталонная реализация для CRUD админки

- Поля: id, text (уникальный), gender
- Доступ: Публичное чтение, полный доступ для админа
- Назначение: Демонстрирует правильные паттерны Conform Future API + Zod v4

## Enum'ы

```typescript
enum UserRole {
  USER
  ADMIN
}

enum Gender {
  MALE
  FEMALE
}

enum OrderStatus {
  NEW
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

## Команды базы данных

```bash
# Генерация Prisma схемы из ZenStack
nx zenstack:generate premium-rosstil

# Watch mode — автоматическая регенерация при изменении schema.zmodel (v3.2.0+)
nx zenstack:generate premium-rosstil -- --watch

# Отправка схемы в базу данных (разработка)
nx db:push premium-rosstil

# Отправка с принудительным сбросом (⚠️ деструктивно!)
nx db:push:data-loss premium-rosstil

# Создание и применение миграции
nx db:migrate premium-rosstil

# Применение миграций (продакшн)
nx db:migrate:deploy premium-rosstil

# Открытие Prisma Studio GUI
nx db:studio premium-rosstil

# Наполнение базы данных тестовыми данными
nx db:seed premium-rosstil

# Сброс базы данных и применение всех миграций
nx db:reset premium-rosstil

# Генерация только Prisma Client (редко нужно)
nx db:generate premium-rosstil
```

## ⚠️ КРИТИЧНО - `PrismaClient` в server-only скриптах (seed, миграции)

**Симптом:** `TypeError: PrismaClient is not a constructor` или `PrismaClientInitializationError:
PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions` при запуске
`nx run <app>:db:seed` или ручного скрипта в `infra/migrations/`.

**Причина 1 — `browser`-экспорт по умолчанию.** У большинства приложений (`mandala`,
`grandslamcup`, `dsperevod`, `auth-hub`, `time`, `archetest`, `aprel8008`, `svoichuzhie`, `kami`,
`studio`) таргет `zenstack:generate` в `project.json` намеренно **перезаписывает**
`src/generated/prisma/index.ts` третьей командой:

```json
"node -e \"require('fs').writeFileSync('src/generated/prisma/index.ts', 'export * from \\'./browser\\'\\n')\""
```

Это защита от протечки Node-only `PrismaClient` в клиентские бандлы — `browser.ts` экспортирует
только модельные типы и enum'ы, **не класс**. Большинство приложений это не задевает: сам код
приложения обычно работает через `ZenStackClient`/`getEnhancedPrisma()` (`lib/db.ts`), а не через
сырой `PrismaClient`. Но **server-only скрипт**, которому нужен настоящий класс (`prisma/seed.ts`,
скрипты в `infra/migrations/`), обязан импортировать его из явного `client.ts`, а не из bare
`generated/prisma`:

```typescript
// ❌ НЕПРАВИЛЬНО в prisma/seed.ts — резолвится в browser-экспорт без класса
import { PrismaClient } from '../src/generated/prisma'

// ✅ ПРАВИЛЬНО — явный серверный entry-point
import { PrismaClient } from '../src/generated/prisma/client'
```

**Причина 2 — Prisma 7 требует driver adapter.** `new PrismaClient()` без параметров больше не
собирается (`prisma-client` TS-генератор, Prisma 7) — нужен явный адаптер:

```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter })
```

`@prisma/adapter-pg` уже в зависимостях корня монорепо. Эталонный пример —
`apps/animatrona-tracker/prisma/seed.ts`.

**Проверять локально:** `nx run <app>:db:seed --skip-nx-cache` — `--skip-nx-cache` обязателен,
иначе Nx может отдать закэшированный успех прошлого (не текущего) состояния файла. Прецедент —
`mandala` и `grandslamcup` (2026-07-21, батч §18.7 M1/2, оба фикса подтверждены живым прогоном
сида на dev-БД); остальные приложения того же списка не задеты — используют `ZenStackClient`
напрямую либо не имеют `prisma/seed.ts` вовсе.

## Типовые паттерны

### Создание записей с Enhanced клиентом

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function createOrder(data: OrderData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const db = getEnhancedPrisma(session.user)

  // Enhanced клиент автоматически добавляет userId к заказу
  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: data.customerName,
      // ... другие поля
    },
  })

  return order
}
```

### Запросы с Row-Level безопасностью

```typescript
// Пользователь может видеть только свои заказы
const orders = await db.order.findMany({
  orderBy: { createdAt: 'desc' },
})

// Админ может видеть все заказы (на основе роли в сессии)
```

### Проверка существования записи (v3.2.0+)

```typescript
// ✅ Новый exists API — эффективнее findFirst
const emailTaken = await db.user.exists({ where: { email } })

if (emailTaken) {
  throw new Error('Email уже зарегистрирован')
}

// Проверка наличия заказов у пользователя
const hasOrders = await db.order.exists({
  where: { userId: session.user.id },
})
```

### Обработка нарушений уникального ограничения

```typescript
try {
  await db.entity.create({ data })
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return report(submission, {
      error: {
        fieldErrors: {
          text: ['Запись с таким текстом уже существует'],
        },
      },
    })
  }
  throw error
}
```

## Стратегия миграций

**Разработка:**

- Используй `nx db:push premium-rosstil` для быстрых итераций схемы
- Файлы миграций не создаются, прямая отправка схемы в БД

**Продакшн:**

1. Создай миграцию: `nx db:migrate premium-rosstil`
2. Закоммить файлы миграций в git
3. Задеплой и примени: `nx db:migrate:deploy premium-rosstil`
4. Миграции версионированы и безопасны для продакшна

### ⚠️ `prisma.config.ts` — источник истины для schema/migrations, не хардкод-путь

Каждое приложение с БД (Prisma 7) имеет `apps/<app>/prisma.config.ts` с полями `schema` и
`migrations.path`. Рабочие nx-таргеты (`db:migrate`, `db:migrate:deploy`) вызывают `prisma
migrate deploy` **вообще без `--schema`** — CLI сам находит и читает `prisma.config.ts` в текущей
директории. Это не деталь реализации, а единственный надёжный способ резолвить оба пути
согласованно.

**Shared-lib паттерн** (эталон — `driving-school`): если schema.prisma генерируется ВНЕ
`apps/<app>/` (например, в `libs/<app>-db/src/generated/schema.prisma` — когда библиотека с БД
переиспользуется несколькими проектами, `@letar/driving-school-db` используется и приложением, и
`driving-school-e2e`), `prisma.config.ts` держит `schema` (путь в `libs/`) и `migrations.path`
(обычно всё ещё `apps/<app>/prisma/migrations/`) **согласованными между собой** — эти два пути не
обязаны совпадать по директории, а `prisma.config.ts` — единственное место, которое это учитывает.

**Не делай так:** не пытайся резолвить путь к `schema.prisma` вручную (например, парсингом
`output` из `plugin prisma { ... }` в `schema.zmodel`) для инструментов вне nx-таргетов (CI-скрипты,
`deploy-affected.sh` и т.п.) — велик риск получить путь к самой схеме, но не туда, где реально
лежат `migrations/`, и Prisma будет искать миграции не там (тихий провал без ошибки). Всегда
опирайся на `prisma.config.ts`, если он есть у приложения — читай `.env.local`/`.env`
(`config({ path: ... })` в начале файла) так же, как это делает сам конфиг, и запускай без
`--schema`.

## Мультитенантность (Organizations)

Для мультитенантных приложений с Better Auth Organizations.

### Паттерн Organization → Member

```zmodel
model Organization {
  id      String   @id @default(cuid())
  name    String
  members Member[]

  @@allow('read', true)
  @@allow('update,delete', members?[userId == auth().id && role == 'owner'])
}

model Member {
  organizationId String
  organization   Organization @relation(...)
  userId         String
  role           String       // owner, manager, member

  @@unique([organizationId, userId])
  @@allow('read', organization.members?[userId == auth().id])
}

model Project {
  organizationId String
  organization   Organization @relation(...)

  // Доступ через membership
  @@allow('read', organization.members?[userId == auth().id])
  @@allow('update', organization.members?[userId == auth().id && role in ['owner', 'manager']])
}
```

> **Эталон:** `apps/driving-school/schema.zmodel`
> **Подробнее:** `.claude/skills/zenstack-helper/reference/zenstack-better-auth.md`

## Field-level Access Control (v3.2.0+)

Защита отдельных полей модели с помощью `@allow`/`@deny` на уровне поля.

### Синтаксис

```zmodel
model User {
  id             String   @id @default(cuid())

  // Field-level ACL: email видят только владелец или OWNER
  email          String   @unique @allow('read', auth() == this || has(auth().roles, OWNER))

  // Полностью скрытое поле — никто не читает через API
  hashedPassword String?  @deny('read', true)

  // Телефон видят только владелец или OWNER
  phone          String?  @allow('read', auth() == this || has(auth().roles, OWNER))
}

model Payment {
  // Финансовые данные видит только владелец подписки
  amount         Decimal  @allow('read', subscription.userId == auth().id || has(auth().roles, OWNER))
  externalId     String?  @allow('read', subscription.userId == auth().id || has(auth().roles, OWNER))
}
```

### Принцип работы

- `@allow` — разрешить операцию если условие true
- `@deny` — запретить операцию если условие true (приоритет над @allow)
- Field-level ACL применяется **после** model-level `@@allow`/`@@deny`
- Если модель разрешает чтение, но поле запрещает — поле будет `null`

> **Эталон:** `apps/driving-school/schema.zmodel` (User, Payment, PersonalDataChange, InstructorProfile)
> **Подробнее:** `.claude/skills/zenstack-helper/reference/access-policies.md`

## Custom Procedures (v3.2.0+)

Инкапсуляция бизнес-логики в переиспользуемые процедуры с доступом через ORM, REST API и TanStack Query.

### Определение в schema.zmodel

```zmodel
// Типы результатов
type TransferResult {
  success     Boolean
  transferId  String?
  error       String?
}

// Процедура
/// Инициировать передачу ученика другому инструктору
mutation procedure initiateTransfer(
  connectionId: String,
  toInstructorId: String,
  type: String,
  reason: String,
  transferBalance: Boolean
) : TransferResult
```

### Реализация в TypeScript

```typescript
// lib/db-procedures.ts
export const procedures = {
  initiateTransfer: async (
    client: any, // ZenStack ORM клиент
    args: {
      connectionId: string
      toInstructorId: string
      type: string
      reason: string
      transferBalance: boolean
    }
  ): Promise<TransferResult> => {
    // Бизнес-логика
    const connection = await client.studentInstructorConnection.findUnique({
      where: { id: args.connectionId },
    })

    if (!connection) {
      return { success: false, error: 'CONNECTION_NOT_FOUND' }
    }

    const transfer = await client.studentTransfer.create({
      data: {/* ... */},
    })

    return { success: true, transferId: transfer.id }
  },
}
```

### Подключение к ORM

```typescript
// lib/db.ts
import { procedures } from './db-procedures'

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }),
  procedures: procedures as any,
})
```

### Вызов процедур

```typescript
// Через ORM клиент
const result = await db.$procs.initiateTransfer({
  connectionId: 'conn_123',
  toInstructorId: 'inst_456',
  type: 'VOLUNTARY',
  reason: 'Переезд',
  transferBalance: true,
})

// Через REST API (автогенерируемый)
// POST /api/model/$procs/initiateTransfer

// Через TanStack Query хуки (автогенерируемые)
const { mutate } = useInitiateTransfer()
```

### Преимущества перед Server Actions

| Аспект       | Custom Procedures     | Server Actions       |
| ------------ | --------------------- | -------------------- |
| Типизация    | Автогенерируемая      | Ручная               |
| Доступ       | ORM + REST + хуки     | Только Next.js       |
| Тестирование | Изолированные функции | Требует моки Next.js |
| Авторизация  | Встроенная (auth())   | Ручная проверка      |

> **Эталон:** `apps/driving-school/src/lib/db-procedures.ts`
> **Подробнее:** `.claude/skills/zenstack-helper/reference/custom-procedures.md`

## Новые возможности v3.3.0

### Оператор `between` для фильтрации

Новый фильтр для диапазонных запросов:

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

### Игнорирование полей для `@updatedAt`

Поле можно пометить как не обновляющее `updatedAt` при изменении:

```zmodel
model Post {
  id        String   @id @default(cuid())
  title     String
  meta      Json?    // Метаданные не влияют на updatedAt
  updatedAt DateTime @updatedAt(ignore: [meta])
}
```

Полезно когда технические поля (счётчики просмотров, кэш метаданных) не должны влиять на время последнего обновления.

### Binding переменные в предикатах коллекций

Явное обозначение элементов при обходе вложенных отношений:

```zmodel
model User {
  posts Post[]

  // Старый синтаксис (работает для простых случаев)
  @@allow('read', posts?[published])

  // Новый синтаксис с binding переменными (v3.3.0+)
  // Полезен для вложенных отношений
  @@allow('read', posts?[p, p.published && p.comments?[c, c.approved]])
}
```

### Расширение ORM клиента через плагины

Добавление кастомных методов и параметров запросов:

```typescript
// Пример: добавление метода инвалидации кэша
const orm = new ZenStackClient(schema, {
  plugins: [
    {
      // Добавляет метод $invalidateCache()
      extendClient: (client) => ({
        ...client,
        $invalidateCache: async () => {
          // логика инвалидации
        },
      }),
      // Добавляет параметр cacheKey к query args
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

### MySQL поддержка (Preview)

Первый preview релиз с поддержкой MySQL:

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

> **Статус:** Preview — может содержать ограничения. Для production рекомендуется PostgreSQL.

### Улучшения производительности

Исправлена проблема с высоким потреблением памяти из-за недостаточного кэширования Zod схем валидации. Существенное улучшение для схем со сложными отношениями.

### Исправления v3.3.0

- Исправлена обработка временных зон в PostgreSQL при использовании `TIMESTAMPTZ`
- Исправлена обработка массивов в PostgreSQL
- Исправлено разрешение полей из миксинов в импортированных файлах
- Исправлена генерация схемы Better-Auth с кастомными полями
- Исправлена регрессия в QaaS с параметром `externalIdMapping`

---

## Устранение неполадок

**"Cannot find module '@/generated/zod/...'" или "@/generated/prisma"**

- Запусти `nx zenstack:generate <app-name>` для перегенерации всех файлов

**"Prisma schema.prisma not found"**

- Запусти `nx zenstack:generate <app-name>`

**Ошибки отказа в доступе**

- Проверь, что используешь `getEnhancedPrisma(session.user)`, а не raw Prisma клиент
- Убедись, что пользователь авторизован в серверных экшенах

**Схема не синхронизирована**

- Разработка: `nx db:push <app-name>`
- Продакшн: `nx db:migrate <app-name>` затем `nx db:migrate:deploy <app-name>`

**Ошибка "Параметр задан неверно. (os error 87)" на Windows с Nx Cloud**

Эта ошибка возникает при попытке Nx Cloud закэшировать результаты команд генерации Prisma/ZenStack на Windows, особенно после введения `prisma.config.ts`.

**Решение:**

- Отключи кэширование для `db:generate` и `zenstack:generate` в `project.json`:

```json
"db:generate": {
  "executor": "nx:run-commands",
  "options": {
    "command": "prisma generate",
    "cwd": "apps/<app-name>"
  },
  "cache": false,  // ← Добавь это
  "metadata": {
    "description": "Generate Prisma Client from schema",
    "technologies": ["prisma"]
  }
}
```

- Также добавь `"cache": false` ко всем db таргетам, которые изменяют базу данных (`db:push`, `db:migrate`, `db:seed`, `db:reset` и их варианты)
- Кэширование для генерации в локальной среде не критично, т.к. генерация работает достаточно быстро (~200ms)

## ⚠️ ZenStack v3 ORM — Особенности типизации

**ZenStack v3** использует новый ORM на базе Kysely вместо Prisma Client. Это требует специальных паттернов при работе с типами.

### Проблемы с типами в ZenStack v3

1. **`_count` не поддерживается** — используй `include` + `.length`
2. **Relations не отражаются в типах** — TypeScript не знает о включённых отношениях
3. **Enum'ы возвращаются как `string`** — требуется явный type cast
4. **`$transaction` не поддерживается** — используй последовательные операции

### Паттерн: Relations и type assertions

```typescript
// ZenStack v3: типы не отражают include, создаём явный интерфейс
interface StudyGroupWithRelations {
  id: string
  name: string
  schedule: string // ZenStack v3: enum как string
  categories: string[] // ZenStack v3: enum[] как string[]
  members: Array<{ leftAt: Date | null }>
  lessons: Array<{ id: string }>
}

const { data: groups } = useFindManyStudyGroup({
  include: {
    members: { select: { leftAt: true } },
    lessons: { select: { id: true } },
  },
})

// ZenStack v3: приводим к типу с relations
const typedGroups = groups as StudyGroupWithRelations[] | undefined

// ZenStack v3: enum'ы требуют cast
const summary = typedGroups?.map((g) => ({
  ...g,
  schedule: g.schedule as StudyGroupSchedule,
  categories: g.categories as LicenseCategory[],
  membersCount: g.members.filter((m) => !m.leftAt).length,
  lessonsCount: g.lessons.length,
}))
```

### Паттерн: Замена `_count` на include + `.length`

```typescript
// ❌ Старый подход (Prisma) — НЕ РАБОТАЕТ в ZenStack v3
const users = await db.user.findMany({
  include: {
    _count: {
      select: {
        orders: true,
        reviews: true,
      },
    },
  },
})

// ✅ Новый подход (ZenStack v3)
interface UserWithRelations {
  id: string
  name: string | null
  orders: Array<{ id: string }>
  reviews: Array<{ id: string }>
}

const rawUsers = await db.user.findMany({
  include: {
    orders: { select: { id: true } },
    reviews: { select: { id: true } },
  },
})

const typedUsers = rawUsers as unknown as UserWithRelations[]

const users = typedUsers.map((user) => ({
  ...user,
  _count: {
    orders: user.orders.length,
    reviews: user.reviews.length,
  },
}))
```

### Паттерн: Infinite Queries с type assertions

```typescript
interface LessonWithDetails {
  id: string
  status: string
  slot: {
    startTime: Date
    endTime: Date
    instructor: { name: string | null } | null
  }
  student: { name: string | null } | null
  school: { name: string }
}

const { data } = useInfiniteFindManyLesson({
  include: {
    slot: { include: { instructor: true } },
    student: true,
    school: true,
  },
})

// ZenStack v3: приводим к типу с relations
const allLessons = useMemo(() => {
  if (!data?.pages) return []
  return data.pages.flat() as unknown as LessonWithDetails[]
}, [data])
```

### Паттерн: Работа с `unknown` полями (payload, metadata)

```typescript
interface AuditLogWithRelations {
  id: string
  payload: unknown // JSON поле
  user: { name: string | null } | null
}

// ❌ Неправильно — `&&` с unknown даёт ReactNode ошибку
{
  log.payload && <Code>{String(JSON.stringify(log.payload))}</Code>
}

// ✅ Правильно — явная проверка и тернарный оператор
{
  log.payload != null ? <Code>{String(JSON.stringify(log.payload))}</Code> : null
}
```

### Паттерн: Enum type cast

```typescript
import type { LessonStatus, LicenseCategory } from '@/generated/prisma'

// ZenStack v3: enum возвращается как string
interface LessonFromDB {
  status: string
  categories: string[]
}

// Приводим к правильному enum типу
const lesson = {
  ...rawLesson,
  status: rawLesson.status as LessonStatus,
  categories: rawLesson.categories as LicenseCategory[],
}
```

### Паттерн: Отсутствие `$transaction`

```typescript
// ❌ НЕ РАБОТАЕТ в ZenStack v3
await db.$transaction(async (tx) => {
  await tx.lesson.update(...)
  await tx.attendance.createMany(...)
})

// ✅ Используй последовательные операции
// (атомарность теряется, но это единственный вариант)
await db.lesson.update(...)
await db.attendance.createMany(...)
```

### Чеклист для ZenStack v3

- [ ] Заменить все `_count` на `include` + `.length`
- [ ] Создать явные интерфейсы для типов с relations
- [ ] Использовать `as unknown as T[]` для type assertions
- [ ] Кастовать enum'ы из `string` к правильному типу
- [ ] Заменить `$transaction` на последовательные операции
- [ ] Использовать `!= null` вместо `&&` для `unknown` типов в JSX
