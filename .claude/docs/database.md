# База данных и ZenStack

> **Версия:** ZenStack 3.8.3 (в корневом `package.json`, июль 2026)

## ⚠️ КРИТИЧНО - Воркфлоу ZenStack

**НИКОГДА не редактируй `src/generated/schema.prisma` напрямую. ВСЕГДА редактируй `schema.zmodel` вместо этого.**

**⚠️ `plugin prisma` генерирует только `schema.prisma` (текстовый файл), а не сам Prisma
Client.** Реальный клиент (`PrismaClient`, типы моделей, `enums.ts` и т.д.) собирает CLI-команда
`prisma generate` из этого `schema.prisma` — и для неё в самом `schema.zmodel` обязательно нужен
блок `generator client { provider = "prisma-client" ... }`. Без него `prisma generate` генерирует
пустышку. **`generator client` не устарел** — прошлая версия этого файла утверждала обратное, это
было ошибкой (см. предупреждение ниже).

### Воркфлоу редактирования схемы

1. Редактируй `apps/<app-name>/schema.zmodel` (источник истины)
2. Запусти `nx zenstack:generate <app-name>` для генерации всего в `src/generated/`:
   - `src/generated/schema.prisma` - Prisma схема (плагин `prisma`)
   - `src/generated/schema.ts`, `models.ts` - типы для ZenStackClient (плагин `typescript`)
   - `src/generated/prisma/` - Prisma Client (отдельная команда `prisma generate`, см. ниже)
   - `src/generated/zod/` - Zod схемы валидации для всех моделей
   - `src/generated/hooks/` - TanStack Query хуки (опционально)
3. Обнови базу данных — `nx db:push <app-name>` только на **локальной** dev-базе для
   быстрого прототипирования, `nx db:migrate <app-name>` для создания migration file (обязателен
   для production). Разрушающие операции на production запрещены — единственный источник по
   этому воркфлоу: [database.md](/.claude/rules/database.md)

### ⚠️ `zenstack generate` НЕ запускает `prisma generate` сам — раньше здесь было написано обратное

Проверено по исходнику CLI (`node_modules/@zenstackhq/cli/dist/index.mjs`, регион
`src/actions/generate.ts`): команда `zenstack generate` прогоняет только плагины схемы (`prisma`,
`typescript`, `policy`, `formSchema`) и ни разу не вызывает `prisma generate`. Таргет
`zenstack:generate` в `project.json` каждого приложения обязан включать оба шага явно —
канонический рецепт (3 шага, `parallel: false`):

```json
"zenstack:generate": {
  "executor": "nx:run-commands",
  "options": {
    "commands": [
      "zenstack generate",
      "prisma generate",
      "node -e \"require('fs').writeFileSync('src/generated/prisma/index.ts', 'export * from \\'./client\\'\\n')\""
    ],
    "cwd": "apps/<app-name>",
    "parallel": false
  }
}
```

Третий шаг — только удобство (даёт бэрарный импорт `@/generated/prisma` вместо
`@/generated/prisma/client`), не обязателен, если код везде импортирует явный подпуть. Приложения,
у которых Prisma Client используется и в браузере (SQLite/sql.js, Electron), экспортируют
`./browser` вместо `./client` — смотри `generator client { output = "./prisma" }` в своей
`schema.zmodel`, какие файлы (`client.ts` vs `browser.ts`) там реально появляются. Есть и другие
частные варианты (кастомный путь вывода вне `src/generated`, дополнительные шаги постобработки) —
разница обоснована архитектурой конкретного приложения, полный список — в приватном журнале
(ссылка внизу раздела).

**Инцидент, который это выявил** (2026-08-17): несколько приложений независимо ловили один и тот
же баг — `zenstack:generate` не включал `prisma generate` явно и/или `schema.zmodel` не имел
`generator client`, из-за чего `src/generated/prisma/*` либо не генерировался вовсе, либо
расходился со схемой при каждом следующем изменении модели, оставаясь рабочим только за счёт
случайно устаревшего файла на диске. На свежем клоне (`src/generated/` — build-артефакт,
не должен быть в git) такое приложение падает сразу. Один из случаев исправлен коммитом
`33af10ac`. Полный список задетых приложений, включая приватные submodule, и деталь про
второй вариант той же проблемы (`src/generated` случайно закоммичен в git submodule, что
маскирует поломку куда полнее) — `.claude/private/PLAN-JOURNAL.md`.

Единой Nx-абстракции (shared target default / кастомный executor / генератор) под этот рецепт
сознательно не заводили: команда не идентична везде (`./client` vs `./browser` в реэкспорте,
кастомный путь вывода у части приложений, дополнительные шаги постобработки) — общий executor
либо не покрыл бы эти варианты, либо сам стал бы источником той же хрупкости, от которой
предостерегает [libs.md](/.claude/docs/libs.md) про tsconfig references. Рецепт документирован
здесь как единственный источник истины, а не автоматизирован.

**Чек-лист для любого приложения/submodule:** `grep -q generated apps/<app>/.gitignore` (или
`libs/<lib>/.gitignore` — для submodule корневой `.gitignore` letar не действует, см. `git.md`)
должен найти `src/generated/`. Если нет — `git rm -r --cached src/generated` + добавить строку
в `.gitignore`, одним коммитом без pathspec (см. `git.md` про `git rm --cached` + `commit --
<path>`).

### ⚠️ `zenstack:generate` зависит от собранного `libs/zenstack-form-plugin/dist/`

Приложения, чей `schema.zmodel` подключает `plugin formSchema { provider = '../../libs/zenstack-form-plugin/dist/index.js' ... }`,
на самом деле грузят **скомпилированный** JS — `dist/` в git не коммитится (build output) и на
свежем клоне/после `rm -rf dist` его просто нет. Без явной зависимости в графе Nx `zenstack generate`
падает не с понятной ошибкой, а с криптичным:

```
Failed to load plugin module "../../libs/zenstack-form-plugin/dist/index.js": Only URLs with a
scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute
paths must be valid file:// URLs. Received protocol 'c:'
```

Это ESM-лоадер жалуется на попытку импортировать несуществующий файл — реальная причина
(нет `dist/`) в тексте ошибки не упомянута вовсе.

**Фикс уже применён** в `project.json` каждого приложения, использующего плагин форм: таргет
`zenstack:generate` несёт `dependsOn` на таргет `build` библиотеки —

```json
"dependsOn": [
  {
    "projects": ["@letar/zenstack-form-plugin"],
    "target": "build"
  }
]
```

Nx сам соберёт плагин перед генерацией, если `dist/` отсутствует или устарел (таргет `build`
библиотеки кэшируемый). То же самое добавлено в `libs/generators/src/generators/new-app/files/project.json.template`
— новые приложения через `nx g @letar/generators:new-app` получают это сразу.

⚠️ `nx:run-commands` — обычный executor без встроенной логики зависимостей, но `dependsOn` в
`project.json` — это фича самого Nx (граф задач), а не executor'а, поэтому работает одинаково
для любого таргета независимо от того, что он запускает.

Если заводишь **новое** приложение вручную (не через генератор) или подключаешь форм-плагин к
уже существующему приложению — не забудь добавить этот `dependsOn` в его `zenstack:generate`
сам, генератор его не пересоздаст автоматически для уже существующего `project.json`.

### `plugin typescript` не обязателен — без него типы генерируются в корень приложения

`animatrona` и `form-example` — единственные два `schema.zmodel` в репозитории без блока `plugin
typescript { provider = '@core/typescript'; output = './src/generated' }`. Это не дрейф от
эталона (в отличие от отсутствующего `generator client` выше) — плагин `typescript` включён в
ZenStack v3 всегда, блок в схеме нужен только чтобы **переопределить** путь вывода. Без него
`zenstack generate` кладёт `schema.ts`/`models.ts`/`input.ts` в каталог самого `schema.zmodel`
(корень приложения), а не в `src/generated/`. Оба приложения импортируют оттуда напрямую
(`animatrona`: `'../../../schema'` из `renderer/src/lib/`; `form-example` аналогично из корня) —
код и генерация согласованы, проверено полным прогоном `rm -rf` + `nx zenstack:generate`. Корневые
`schema.ts`/`models.ts`/`input.ts` уже в `.gitignore` общим паттерном `apps/*/{schema,models,input}.ts`.
Переносить эти два приложения на `src/generated/` не требуется — это осознанный, а не случайный
вариант компоновки.

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
nx zenstack:generate <app-name>

# Watch mode — автоматическая регенерация при изменении schema.zmodel (v3.2.0+)
nx zenstack:generate <app-name> -- --watch

# Отправка схемы в базу данных (только локальная dev-база, см. rules/database.md)
nx db:push <app-name>

# Отправка с принудительным сбросом (⚠️ деструктивно!)
nx db:push:data-loss <app-name>

# Создание и применение миграции
nx db:migrate <app-name>

# Применение миграций (продакшн)
nx db:migrate:deploy <app-name>

# Открытие Prisma Studio GUI
nx db:studio <app-name>

# Наполнение базы данных тестовыми данными (конвенция — seed-scripts.md)
nx db:seed <app-name>

# Сброс базы данных и применение всех миграций
nx db:reset <app-name>

# Генерация только Prisma Client (редко нужно)
nx db:generate <app-name>
```

> **Как писать `prisma/seed.ts`:** подключение ORM-клиента напрямую (не через `@/lib/db`),
> идемпотентность (`upsert` по естественному ключу / `findFirst`+`create` без него), Nx target —
> см. [seed-scripts.md](seed-scripts.md).

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
  if (!session?.user) { throw new Error('Unauthorized') }

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

> Полный воркфлоу, включая запрет `db:push`/`prisma migrate dev` на production и рецепт при
> drift — единственный источник: [rules/database.md](/.claude/rules/database.md). Ниже —
> краткая выжимка, не расходящаяся с ним.

**Разработка:**

- `nx db:push <app-name>` — только на **локальной** dev-базе, для быстрых итераций схемы
- Файлы миграций не создаются, прямая отправка схемы в БД

**Продакшн:**

1. Создай миграцию: `nx db:migrate <app-name>`
2. Закоммить файлы миграций в git
3. Задеплой и примени: `nx db:migrate:deploy <app-name>`
4. Миграции версионированы и безопасны для продакшна

### ⚠️ Изменил схему — файл миграции обязан ехать в ТОМ ЖЕ коммите

`db push` — только локальная поза для итераций: он молча приводит **твою dev-базу** в
соответствие со схемой, и рассинхрон становится невидимым на машине разработчика. Если
закоммитить изменение `schema.zmodel` (и сгенерированного `schema.prisma`) без `nx db:migrate`,
деплой выкатит код, который запрашивает колонки, отсутствующие в прод-БД.

**Почему деплой это не поймает:** шаг миграций в `deploy-affected.sh` опирается на
`prisma migrate status`, а тот сверяет только **файлы миграций против таблицы
`_prisma_migrations`**. Drift Prisma-схемы против фактической БД он не видит: скажет
«No pending migrations» и спокойно пропустит шаг. Дальше первый же `SELECT` по затронутой
модели падает с P2022 («column does not exist») — в Server Components это 500 на всю
страницу. Прецедент 2026-07-30: страница тайм-трекинга одного из приложений лежала ~7,5 часов
(попадание под auth-редирект скрывало 500 от незалогиненных проверок снаружи).

**Чек перед коммитом изменений схемы:** в диффе рядом со `schema.zmodel` должна быть новая
папка `prisma/migrations/<timestamp>_*/`. Нет папки — миграцию забыли (`nx db:migrate <app>`).

**Автоматизировано:** pre-commit хук `scripts/hooks/pre-commit-schema-migration-check.sh`
(ставится вместе с остальными — `bash scripts/hooks/install.sh`, `--all-submodules` для
приватных приложений) блокирует коммит именно этого класса бага. Логика — не «любой diff
`schema.zmodel`», а только строки внутри блоков `model`/`enum`, которые не являются
`@@allow(`/`@@deny(`/комментарием и не образуют пару «то же имя+тип поля с обеих сторон
диффа» (правка `@default`/`@meta("form.*", ...)`/legacy `@form.*`/field-level `@allow` на существующем поле — не
структурная и не блокируется). Полная эвристика и её ограничения —
`scripts/check-schema-migration.mjs`. Ложное срабатывание или осознанная отдельная
миграция — `GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1 git commit ...`.

**Диагностика прод-проблем с БД:** помни, что `postgres-<app>` MCP-серверы подключены к
**dev-базам** (`apps/<app>/.env.local`), если явно не заведён отдельный `postgres-<app>-prod`.
Вывод «колонки на месте» из dev-подключения ничего не говорит о проде — при том инциденте
именно это увело первую диагностику в ложное «drift безобиден».

### CLI-команды под nx-таргетами миграций — что реально происходит

`nx db:migrate`/`db:migrate:deploy` — тонкие обёртки над `prisma migrate dev`/`prisma migrate
deploy` (в летаре — Prisma CLI, не `zen` из официального ZenStack CLI, но команды и флаги
идентичны один в один — ZenStack V3 сама реализована как обёртка над Prisma Migrate). Полезные
флаги нижнего уровня, которых нет ни в одном nx-таргете, но которые иногда нужны напрямую внутри
`apps/<app>` (там же, где `prisma.config.ts`):

- **`prisma migrate dev --create-only --name <name>`** — сгенерировать файл миграции **без
  применения**. Нужен, когда движок миграций не умеет сгенерировать нужный SQL сам (например,
  `CREATE EXTENSION pg_trgm` под `@fuzzy` — см. выше, или Postgres views) — создаёшь пустую
  миграцию, дописываешь SQL руками, применяешь обычным `prisma migrate dev`.
- **`prisma migrate status`** — что из истории миграций применено на текущей БД, без изменений.
  Дёшево прогнать перед `migrate deploy` в CI/деплое, если нужна ранняя диагностика дрейфа
  (см. предупреждение выше про то, что сам `migrate status` дрейф схема↔БД не ловит — только
  файлы↔таблица `_prisma_migrations`).
- **`prisma migrate resolve --applied <name>` / `--rolled-back <name>`** — вручную пометить
  конкретную миграцию как применённую/откаченную в таблице `_prisma_migrations`, не выполняя её
  SQL. Нужен при ручном вмешательстве в БД в обход миграций (прямой `ALTER` на проде,
  восстановление из бэкапа на другом состоянии схемы) — без этого `migrate deploy` следующего
  деплоя откажется работать, видя рассинхрон истории.
- **`prisma db pull`** — интроспекция существующей БД в `schema.prisma` при подключении к чужой/
  унаследованной базе (для нас редкость — обычно `schema.zmodel` уже источник истины с первого
  дня приложения).

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
    },
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

## Новые возможности v3.4.0-v3.6.0 — Slicing, `@zenstackhq/zod`, `$diagnostics`, relations в `type`

> Аудит релизов между v3.3.0 и v3.7.0 (не был сделан раньше — эти версии вышли до того, как мы
> начали системно сверяться с changelog). Мажорные фичи трёх релизов ниже.

### Slicing ORM API (v3.4.0) — урезанный клиент для узкого назначения

Опция `slicing` при создании/переконфигурации клиента ограничивает, какие модели, операции и виды
фильтров ему видны — не access control (это делает `@@allow`/`@@deny`), а сокращение самой
поверхности API:

```typescript
const slicedDb = db.$setOptions({
  ...db.$options,
  slicing: {
    excludedModels: ['Comment'], // модель не существует для этого клиента вовсе
    models: {
      post: {
        excludedOperations: ['deleteMany'],
        fields: { title: { includedFilterKinds: ['Equality'] } }, // только `=`, не `contains`/`gt`
      },
    },
  },
})
```

**Кандидат на использование** — везде, где клиенту передаётся урезанный ORM-инстанс с намерением
«эта часть кода не должна даже пытаться делать X» (кастомные процедуры, внешние интеграции,
QaaS-подобные сценарии). Не подменяет access policies — сокращает форму запроса, а не проверяет
права на конкретную строку.

### `@zenstackhq/zod` — фабрика Zod-схем прямо из ZModel (v3.4.0)

Отдельный пакет `@zenstackhq/zod` даёт `createSchemaFactory`/`makeModelSchema` — генерирует Zod-схемы
для валидации моделей/типов/enum'ов **из самого ZModel**, независимо от ORM-клиента. Второй кусок
той же фичи — `db.$zod`, схемы для валидации входных аргументов ORM-вызовов (`findUnique`,
`createMany` и т.п.), полезно как раз когда пользовательский ввод идёт в ORM API через
промежуточный слой (custom procedure, REST-хендлер).

> ⚠️ **Это ядро активной миграции `zenstack-form-plugin` на нативные атрибуты**
> (`libs/forms/PLAN.md`, раздел «Миграция на нативные возможности ZModel») — `ZodUtils` из этого
> пакета уже держит полную карту нативных валидационных атрибутов → Zod-ограничений, которую наш
> плагин частично дублирует руками. Важный контекст: пакет существует с v3.4.0 (март 2026), то
> есть на момент миграции (сентябрь 2026) — уже полгода в проде у апстрима, не вчерашний preview.

### `$diagnostics` — метрики производительности клиента (v3.5.0)

```typescript
const db = new ZenStackClient(schema, { ... })
// db.$diagnostics — метрики выполнения запросов
```

Полезно как первый шаг при разборе «почему медленно» до того, как тянуть `EXPLAIN` через
`postgres-*` MCP — точечно, не как постоянный мониторинг.

### Relations в кастомных `type` (v3.6.0) — общие связи через миксин

`type`-декларации (миксины) теперь могут объявлять relation-поля, не только скалярные — общую
связь можно вынести в миксин и переиспользовать в нескольких моделях, а не дублировать в каждой:

```zmodel
type Timestamped {
  createdAt DateTime @default(now())
}

type HasAuthor {
  author   User @relation(fields: [authorId], references: [id])
  authorId String
}

model Post with Timestamped, HasAuthor { id String @id @default(cuid()) }
model Comment with Timestamped, HasAuthor { id String @id @default(cuid()) }
```

**Кандидат** — там, где одна и та же relation (типично `author`/`createdBy`/`organizationId`)
сейчас руками повторена в нескольких моделях. Аудит конкретных моделей — по факту задачи, не
здесь (см. правило `public-repo-hygiene.md` про список моделей приватных приложений).

### `dangerouslyAllowRawSql` (v3.5.0) — сырой SQL при подключённом policy-плагине

По умолчанию `executeRaw`/`queryRaw` **отклоняются** ORM-клиентом, если подключён policy-плагин —
это отдельный механизм от `getEnhancedPrisma()`/сырого `prisma`-обхода в
[zenstack-self-only-user-policy-staff-picker.md](/.claude/docs/zenstack-self-only-user-policy-staff-picker.md)
(тот паттерн — про построчную read-политику `findMany`, не про сырой SQL). Опция явно
отключает эту защиту, если raw-запрос действительно нужен внутри той же транзакции:

```typescript
const authDb = db.$use(new PolicyPlugin({ dangerouslyAllowRawSql: true }))
```

Не включать «на всякий случай» — по умолчанию запрет существует именно потому, что raw SQL
обходит `@@allow`/`@@deny` целиком.

## Новые возможности v3.7.0 — Full-Text и Fuzzy Search (только Postgres)

> ⚠️ **TODO — внедрить проактивно.** Мы давно ждали эту фичу под поиск по каталогам/спискам
> (товары, посты, любой текстовый контент). Как только появится задача с текстовым поиском —
> заменять `contains`/`ILIKE` на эти операторы вместо ручного написания raw SQL или сторонних
> поисковых движков.

### Full-Text Search — `@fullText` + `fts`/`_ftsRelevance`

Для длинных текстовых полей (описания, статьи, заголовки) — токенизированный поиск с учётом
словоформ и релевантности:

```zmodel
model Article {
  id       Int     @id @default(autoincrement())
  title    String  @fullText
  body     String  @fullText
  subtitle String? @fullText
  notes    String? // не участвует в full-text поиске
}
```

```typescript
await db.article.findMany({
  where: { title: { fts: { search: 'cat & dog' } } },
})

await db.article.findMany({
  orderBy: {
    _ftsRelevance: { fields: ['body'], search: 'cat & dog', sort: 'desc' },
  },
})
```

### Fuzzy Search — `@fuzzy` + `fuzzy`/`_fuzzyRelevance`

Для коротких полей, где пользователи опечатываются (имена, названия, SKU). Требует расширение
Postgres `pg_trgm`:

```zmodel
model Flavor {
  id          Int     @id @default(autoincrement())
  name        String? @fuzzy
  description String  @fuzzy
  notes       String? // не fuzzy-searchable
}
```

```typescript
await db.flavor.findMany({
  where: { name: { fuzzy: { search: 'Aple' } } }, // найдёт "Apple"
})

await db.flavor.findMany({
  orderBy: {
    _fuzzyRelevance: { fields: ['name'], search: 'Apple', sort: 'desc' },
  },
})
```

**Когда что использовать:** `fullText` — для длинного связного текста (описания, статьи, контент);
`fuzzy` — для коротких полей, где важна устойчивость к опечаткам (имена, названия, артикулы).
Оба требуют PostgreSQL — не работают на SQLite/MySQL.

### ⚠️ Грабли `@fuzzy`, найденные при первом внедрении (domwellbes, 2026-08-08)

**1. `pg_trgm` не создаётся автоматически.** `@fuzzy` транслируется ZenStack в вызовы Postgres-функций
`similarity()`/`word_similarity()` — обе определены расширением `pg_trgm`, которое не подключено
ни в `schema.zmodel` (там нет понятия «расширение БД»), ни само по себе никаким генератором. Ни
`nx zenstack:generate`, ни `prisma migrate dev` его не создают — без него запрос с `fuzzy` падает
с `function similarity(text, text) does not exist`. Нужна отдельная ручная миграция:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Полноценный GIN-индекс по триграммам (`CREATE INDEX ... USING GIN (col gin_trgm_ops)`) в той же
миграции ускоряет поиск, но у Prisma есть подводный камень: индекс с operator class'ом не
выражается через `@@index` без preview-фичи `extendedIndexes`, поэтому Prisma его не видит и
считает «дрейфом» — следующий `prisma migrate dev` молча сгенерирует миграцию, которая этот
индекс дропает. Итоговое состояние БД (расширение включено, без кастомного индекса) корректно и
воспроизводимо, просто история миграций выглядит как «создали и тут же снесли». На малых объёмах
(десятки-сотни строк) отсутствие индекса не критично; для реального каталога — либо смириться с
full scan на каждый поиск, либо подключать `extendedIndexes` целиком.

**2. Режим по умолчанию `mode: 'simple'` не находит опечатки в многословных полях.** `simple`
сравнивает всю строку целиком (`similarity(query, field)`). На коротком одиночном слове
(`"Apple"` из примера выше) это работает, но на реалистичном поле вроде названия товара —
`similarity('кирпч', 'Кирпич керамический одинарный')` даёт **0.13**, ниже дефолтного порога
Postgres 0.3: сходство размывается лишними словами, и запрос не находит очевидное совпадение.

Решение — режим `word` (ищет наиболее похожий **фрагмент** внутри строки, а не сходство со всей
строкой): `word_similarity('кирпч', 'Кирпич керамический одинарный')` = **0.67**, уверенное
совпадение. Указывается явно и в фильтре, и в relevance-сортировке — оба параметра нужно
проставить одинаково, иначе порядок результатов разойдётся с тем, что реально нашли:

```typescript
await db.material.findMany({
  where: { name: { fuzzy: { search: query, mode: 'word' } } },
  orderBy: { _fuzzyRelevance: { fields: ['name'], search: query, mode: 'word', sort: 'desc' } },
})
```

`mode: 'simple'` остаётся уместным для полей, где ожидается сравнение всей строки целиком (короткие
однословные значения, коды, SKU) — проблема именно в применении дефолта к длинным составным полям
без явного выбора режима.

---

## Новые возможности v3.8.0 — Soft Delete (Preview, ещё не устоялось)

> ⚠️ **TODO — внедрить проактивно, как только API стабилизируется.** `@zenstackhq/plugin-soft-delete`
> закрывает паттерн, который до сих пор приходится писать руками в каждом приложении (булево поле
> `isDeleted`/nullable `deletedAt` + вручную дописанный `where: { deletedAt: null }` в каждом запросе,
> который не должен видеть удалённые строки). Плагин помечен `Preview Feature` — **может ломать
> обратную совместимость в будущих релизах**, поэтому до внедрения в прод сверяться с changelog
> `@zenstackhq/plugin-soft-delete` на момент старта задачи, не полагаться на описание ниже как на
> зафиксированный контракт.

### Как работает

Единственный маркер — nullable `DateTime`-поле с `@deletedAt` (максимум одно на модель). Плагин
перехватывает Kysely-запросы в рантайме:

```zmodel
plugin softDelete {
    provider = '@zenstackhq/plugin-soft-delete'
}

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  deletedAt DateTime? @deletedAt
}
```

```typescript
import { SoftDeletePlugin } from '@zenstackhq/plugin-soft-delete'

const db = new ZenStackClient(schema, { ... }).$use(new SoftDeletePlugin())

await db.user.delete({ where: { id } }) // переписывается в UPDATE deletedAt = now()
await db.user.findMany() // WHERE deletedAt IS NULL добавляется автоматически, включая join'ы
```

Модели без `@deletedAt` плагин не трогает вообще — внедрение точечное, не all-or-nothing.
Действует и на низкоуровневый `$qb` (query builder escape hatch), не только на ORM API.

### Грабли, которые ждут при первом внедрении (документированы заранее, из доков плагина)

- **Не каскадирует.** Soft-delete родителя не трогает детей — ручное управление остаётся на
  приложении (в отличие от `onDelete: Cascade`, который для hard-delete модели без `@deletedAt`
  продолжает работать как обычно).
- **Join/multi-table DELETE отклоняется**, а не тихо превращается в hard-delete — придётся сводить
  к single-table delete там, где сейчас используется составной.
- **`@unique` + tombstone.** Физически удалённая строка остаётся в таблице — обычный `@unique`
  запрещает повторно использовать значение (email и т.п.), которое держит уже soft-deleted запись.
  Митигация — partial unique index (`WHERE deletedAt IS NULL`) через ручную правку
  `--create-only`-миграции; ZModel такой индекс выразить не может. Для MySQL (нет partial index)
  обходной путь другой — `CASE WHEN deletedAt IS NULL THEN email END` в выражении индекса.

### Кандидаты на первое внедрение

Модели, где сейчас руками написан аналог soft-delete (`isDeleted`/`archivedAt`/подобное) —
приоритет на замену штатным плагином, когда API станет stable. Конкретные модели-кандидаты — по
факту audit при старте задачи, не фиксировать список здесь заранее (список моделей — не то, что
стоит держать в публичном доке, см. `public-repo-hygiene.md`, если модель специфична для приватного
приложения).

---

## Новые возможности v3.8.0 — `@date`/`@time` + автоопределение расширения импорта

### `@date`/`@time` — валидация ISO-строк без ручного `.regex()`

Новые атрибуты для `String`-полей, хранящих дату/время как строку (не `DateTime`-колонку) —
за кулисами `zod.iso.date()`/`zod.iso.time()`:

```zmodel
model Event {
  id        Int    @id @default(autoincrement())
  startDate String @date
  startTime String @time(3)  // необязательная точность
}
```

> ⚠️ **Пересекается с активной миграцией `zenstack-form-plugin` на нативные атрибуты**
> (`libs/forms/PLAN.md`, раздел «Миграция на нативные возможности ZModel»). `@date`/`@time` уже
> входят в каталог из stdlib.zmodel, который собирает эта миграция — отдельно внедрять здесь не
> нужно, они автоматически попадут в `extractNativeConstraints()` вместе с остальными 11
> атрибутами Фазы 1. Прямое использование в `schema.zmodel` до завершения миграции — не
> заблокировано (атрибут нативный, ORM его понимает уже сейчас), просто наш плагин пока не
> прокинет его в форму как ограничение.

### Автоопределение расширения импорта в генерируемом коде

CLI теперь сам определяет `.js` vs без расширения из `tsconfig.json` при генерации импортов —
меньше ручной подгонки после `zenstack:generate` в приложениях с нестандартным module-резолвом.
Не требует действий с нашей стороны — просто фон.

## Новые возможности v3.9.0 — `exactQueryArgs` + `zen studio --introspect`

### `typing.exactQueryArgs` — ловит опечатки в `where`/`select`, которые TS 6/7 научился пропускать

TypeScript 6/7 изменили проверку избыточных свойств для параметров функций, выведенных из
дженериков — лишний/опечатанный ключ в `where`/`select`/`include`/`orderBy` (и во вложенных
relations) теперь может пройти typecheck и упасть только в рантайме на валидации ZenStack.
Опциональный флаг клиента закрывает именно этот случай:

```typescript
const db = new ZenStackClient(schema, {
  dialect,
  typing: { exactQueryArgs: true },
})

// ✗ ошибка компиляции вместо тихого прохода и рантайм-исключения
await db.user.findMany({ where: { activated: true, emial: 'a@b.com' } })
```

По умолчанию выключен — доп. проверка стоит времени typecheck, зависит от сложности схемы.
**Кандидат на включение** там, где `tsgo` уже достаточно быстрый (см. `typecheck:tsgo`) и где
были/будут инциденты класса «опечатка в фильтре не поймана компилятором» — оценивать точечно per
app, не глобальным флагом на весь монорепо.

### `zen studio --introspect` — Studio без файла схемы

```bash
npx zen studio --introspect
```

Генерирует схему на лету через интроспекцию БД, если `schema.zmodel` не найден — полезно для
разового просмотра чужой/прод БД без разворачивания приложения целиком (например при
диагностике через `postgres-*` MCP, когда под рукой нет полного checkout приложения).

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
4. **`$transaction` работает** (v3.8+, был убран в ранних v3, вернулся) — sequential-массив и
   interactive-callback, синтаксис как в Prisma, см. ниже

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
  if (!data?.pages) { return [] }
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

### Паттерн: `$transaction` (v3.8+ — вернулся, была устаревшая рекомендация)

⚠️ Раньше здесь было написано «`$transaction` не работает, используй последовательные операции
без атомарности». Это относилось к ранним v3 (≤3.3) — в текущей 3.9.3 метод снова есть, в двух
формах, синтаксис идентичен Prisma:

```typescript
// ✅ Interactive — callback с транзакционным клиентом, атомарность сохраняется
await db.$transaction(async (tx) => {
  await tx.lesson.update({ ... })
  await tx.attendance.createMany({ ... })
})

// ✅ Sequential — массив операций, выполняется по порядку в одной транзакции
await db.$transaction([
  db.lesson.update({ ... }),
  db.attendance.createMany({ ... }),
])
```

Подробнее, включая Kysely escape hatch (`$qb`/`$expr`) и обработку `ORMError` —
[zenstack-v3-orm.md](/.claude/skills/zenstack-helper/reference/zenstack-v3-orm.md).

### Чеклист для ZenStack v3

- [ ] Заменить все `_count` на `include` + `.length`
- [ ] Создать явные интерфейсы для типов с relations
- [ ] Использовать `as unknown as T[]` для type assertions
- [ ] Кастовать enum'ы из `string` к правильному типу
- [ ] `$transaction` работает как в Prisma (v3.8+) — переносить без изменений, не разбивать
- [ ] Использовать `!= null` вместо `&&` для `unknown` типов в JSX

## ⚠️ postgres-* MCP искажает вывод timestamp без зоны

**Симптом:** запрос `SELECT column FROM table` к колонке типа `timestamp without time zone`
через `mcp__postgres-*__query` возвращает значение с суффиксом `Z` (как будто это UTC), хотя
физически в БД лежит "наивное" время без указания зоны. Диагностика такого столбца через MCP
выглядит так, будто данные сдвинуты на несколько часов относительно ожидаемых.

**Причина:** сам инструмент `postgres-*` MCP при сериализации результата в JSON пропускает
значение через свою сессионную `TimeZone` (проверяется `SHOW TimeZone;`, у части подключений —
не UTC, например Europe/Moscow) и дописывает смещение. У колонки без зоны физически нет
смещения для конвертации — MCP это смещение придумывает сам, на лету, только в момент показа.
Данные в БД при этом не тронуты и с самого начала были верны.

**Как проверить по-настоящему:**

```sql
SELECT column::text AS column_raw FROM table;
```

`::text` отдаёт буквальные хранимые цифры без реинтерпретации инструментом — сравнивай с этим,
а не с обычным JSON-выводом запроса.

**Касается** любого приложения, где есть колонки `timestamp without time zone` и подключён
`postgres-*` MCP (не только конкретное приложение, где баг был найден) — не гоняйся за
несуществующим сдвигом, если единственный источник расхождения — вывод MCP-запроса.

## ⚠️ `EACCES` от Prisma-адаптера на dev — чаще всего остановленный Docker-контейнер БД, не права

**Симптом:** `nx dev <app>` падает 500 на любой странице, которая делает запрос к БД. В логе —
`Error: Failed to execute query: AggregateError` с `dbErrorCode: 'EACCES'` где-то внутри стека.
Выглядит как отказ в доступе на уровне роли/прав Postgres или `pg_hba.conf`.

**Частая настоящая причина:** локальный dev-Postgres приложения (контейнер вида
`<app>-postgres-dev` из `docker-compose.dev.yml`) просто не запущен — порт из `DATABASE_URL` в
`.env.local` никто не слушает. Драйвер Prisma/`pg` мисклассифицирует «соединение недоступно» как
`EACCES`, хотя реальной причины «в доступе отказано» на стороне Postgres нет вообще — сервер
физически не поднят.

**Диагностика — раньше, чем лезть в права роли:**

```bash
docker ps --format "{{.Names}}\t{{.Ports}}" | grep <app>-postgres
docker ps -a --format "{{.Names}}\t{{.Ports}}\t{{.Status}}" | grep <app>-postgres  # если не нашлось — искать среди остановленных
```

Если контейнер `Exited` — просто поднять его обратно, данные в volume при этом сохраняются
(миграции повторно гонять не нужно):

```bash
cd apps/<app> && docker compose -f docker-compose.dev.yml up -d db
```

**Прецедент:** `dsperevod`, 2026-08-04 — контейнер `dsperevod-postgres-dev` был остановлен 6 дней
как побочный эффект перезагрузки машины, никто не обратил внимания. `EACCES` в логе указывал на
запрос `prisma.socialProvider.findMany()` в `libs/auth/src/server/social-loader.ts` — выглядело
как проблема прав `SocialProvider`/access policy, но модель и данные были ни при чём.
