# ZenStack v3 — Документация

> Источник: https://zenstack.dev/docs/welcome + внутренние skills letar\
> **Версия:** 3.x (3.3.0+, актуально на январь 2026)

## Что такое ZenStack

ZenStack — надстройка над Prisma с добавлением:

- **Access Control** прямо в схему (row-level security без ручного кода)
- **Enhanced Client** — Prisma-совместимый клиент с проверкой политик
- **Плагины** — генерация Zod схем, TanStack Query хуков, OpenAPI, форм (@letar/zenstack-form-plugin)
- **ZModel** — Prisma Schema Language + расширения (auth(), @@allow, @@deny, плагины)

## ZModel — схема данных

```zmodel
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
}

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String
  roles     UserRole[]
  posts     Post[]

  @@allow('read', auth() == this)
  @@allow('all', has(auth().roles, ADMIN))
}

model Post {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String

  @@allow('read', published == true)
  @@allow('all', auth() == author)
  @@allow('all', has(auth().roles, ADMIN))
}

enum UserRole {
  ADMIN
  USER
}
```

## Access Control Policies

### Синтаксис

```zmodel
@@allow('операция', условие)   // Разрешить если условие true
@@deny('операция', условие)    // Запретить если условие true (приоритет выше allow)
```

**Операции:** `create`, `read`, `update`, `delete`, `all`

### auth() — текущий пользователь

```zmodel
// Пользователь видит только свои записи
@@allow('read', auth() == author)
@@allow('read', auth().id == userId)

// Проверка роли (массив roles!)
@@allow('all', has(auth().roles, ADMIN))
@@allow('read', has(auth().roles, INSTRUCTOR))

// Публичное чтение
@@allow('read', true)

// Только авторизованным
@@allow('create', auth() != null)
```

### Типичные паттерны

```zmodel
// Пользователь — свои данные
model Order {
  userId String
  user   User @relation(fields: [userId], references: [id])

  @@allow('read', auth() == user)
  @@allow('create', auth() == user)
  @@allow('all', has(auth().roles, ADMIN))
}

// Публичное чтение, только авторы могут изменять
model Article {
  @@allow('read', true)
  @@allow('create', auth() != null)
  @@allow('update,delete', auth() == author)
  @@allow('all', has(auth().roles, ADMIN))
}

// Мультитенантность через организацию
model Project {
  organizationId String
  organization Organization @relation(...)

  @@allow('read', auth().organizationId == organizationId)
  @@allow('all', organization.members?[userId == auth().id && role == ADMIN])
}
```

## Enhanced Client

### Создание

```typescript
// lib/db.ts
import { createEnhancedClient } from '@zenstackhq/runtime'
import { schema } from './schema'

export function getEnhancedPrisma(user?: { id: string; roles: string[]; organizationId?: string }) {
  return createEnhancedClient(schema, { user })
}
```

### Использование в Server Actions

```typescript
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function getMyPosts() {
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)
  // Автоматически применяет @@allow политики
  return db.post.findMany()
}
```

## ZenStack v3 vs Prisma — ключевые отличия

```typescript
// 1. Enum возвращается как строка
user.roles // ["ADMIN", "USER"] — не UserRole enum объект

// 2. Нет _count в include
// ❌ НЕ РАБОТАЕТ
db.user.findUnique({ include: { _count: { select: { posts: true } } } })
// ✅ РАБОТАЕТ
const user = await db.user.findUnique({ include: { posts: true } })
const count = user?.posts.length

// 3. Нет $transaction в enhanced client
// Используй последовательные операции или raw Prisma для транзакций

// 4. exists() — новый метод (v3.2.0+)
const exists = await db.post.exists({ where: { published: true } })

// 5. Вложенные upsert могут не работать — разбивай на операции
```

## Плагины в schema.zmodel

```zmodel
// Zod схемы для валидации
plugin zod {
  provider = '@core/zod'
  output = './src/generated/zod'
}

// TanStack Query хуки
plugin hooks {
  provider = '@zenstackhq/tanstack-query'
  target = 'react'
  output = './src/generated/hooks'
}

// OpenAPI документация
plugin openapi {
  provider = '@zenstackhq/openapi'
  output = './openapi.json'
}

// Формы (@letar/zenstack-form-plugin)
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
  i18n = true  // Опционально: генерация i18nKey
}
```

## @form.\* директивы (letar-specific)

```zmodel
model Product {
  id    String @id @default(cuid())

  /// @form.title("Название продукта")
  /// @form.placeholder("Введите название")
  title String

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ min: 0, currency: "RUB" })
  price Int

  /// @form.title("Рейтинг")
  /// @form.fieldType("rating")
  rating Float @default(0)

  /// @form.exclude
  internalNotes String?
}
```

| Директива                  | Описание                                              |
| -------------------------- | ----------------------------------------------------- |
| `@form.title("...")`       | Label поля                                            |
| `@form.placeholder("...")` | Placeholder                                           |
| `@form.description("...")` | Helper text                                           |
| `@form.fieldType("...")`   | Тип UI компонента (currency, rating, switch, tags...) |
| `@form.props({...})`       | UI props + Zod constraints (min, max, pattern...)     |
| `@form.relation({...})`    | Настройки relation поля                               |
| `@form.exclude`            | Исключить из формы                                    |

## Команды (letar)

```bash
# Генерация всех артефактов из schema.zmodel
nx zenstack:generate <app-name>

# Применить изменения схемы к БД (dev)
nx db:push <app-name>

# Создать миграцию (production)
nx db:migrate <app-name>

# Открыть Prisma Studio
nx db:studio <app-name>
```

## Workflow изменения схемы

1. Редактируй `schema.zmodel`
2. `nx zenstack:generate <app>` — генерация типов, хуков, form-schemas
3. `nx db:push <app>` — применить к БД (dev) или `nx db:migrate` (production)
4. Обновить код, использующий сгенерированные типы

## Ссылки

- Docs: https://zenstack.dev/docs/welcome
- Modeling: https://zenstack.dev/docs/modeling
- Blog: https://zenstack.dev/blog
- GitHub: https://github.com/zenstackhq/zenstack
- Внутренние skills: `.claude/skills/zenstack-helper/reference/`
