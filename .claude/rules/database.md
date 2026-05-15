---
paths: apps/**/schema.zmodel, apps/**/prisma/**, apps/**/generated/**
---

# Правила для базы данных

## ZenStack воркфлоу

1. Редактируй **только** `schema.zmodel` (НИКОГДА не редактируй `schema.prisma` напрямую!)
2. Запусти `nx zenstack:generate <app-name>`
3. Запусти `nx db:migrate <app-name> -- --name <описание>` — **ВСЕГДА создавай migration file**

## ⛔ КРИТИЧНО: Миграции на production

**ЗАПРЕЩЕНО на production:**
- `db:push` — НИКОГДА, потеря данных
- `prisma migrate dev` — НИКОГДА, только локально
- Ручной SQL для schema changes — НИКОГДА

**ПРАВИЛЬНЫЙ воркфлоу:**

```bash
# 1. Локально: изменить schema.zmodel
# 2. Локально: сгенерировать
nx zenstack:generate <app>
# 3. Локально: создать миграцию
nx db:migrate <app> -- --name <name>
# 4. Закоммитить migration файл + schema
git add apps/<app>/prisma/migrations/ apps/<app>/schema.zmodel
git commit -m "feat(<app>): описание миграции"
# 5. Push + deploy — скрипт deploy-affected.sh сам применит миграцию
git push && ssh s2 'cd /home/deploy/letar && git pull && ./deploy-affected.sh --app <app>'
```

**`db:push`** допускается ТОЛЬКО на **локальной** dev-базе для быстрого прототипирования. Но даже тогда — потом нужно создать migration file через `prisma migrate diff` + `prisma migrate resolve`.

**Если drift** (db:push уже применил изменения, но migration file нет):

```bash
# Создать migration из diff
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel src/generated/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql
# Пометить как применённую
npx prisma migrate resolve --applied <migration_name>
```

## Структура schema.zmodel

```prisma
// Импорт базовых типов
import "base"

model Product {
  id          String   @id @default(cuid())
  name        String
  price       Int
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ZenStack политики доступа
  @@allow('read', true)
  @@allow('create,update,delete', auth() != null && auth().role == 'ADMIN')
}
```

## Генерируемые файлы

**driving-school**: генерируемые файлы в `libs/driving-school-db/src/generated/` (библиотека `@letar/driving-school-db`).
**Остальные приложения**: генерируемые файлы в `src/generated/`.

```typescript
// driving-school — импорт из библиотеки
import { GenderFormSchema } from '@letar/driving-school-db/form-schemas/enums/Gender.form'
import type { Gender, User } from '@letar/driving-school-db/prisma'
import { schema } from '@letar/driving-school-db/schema'

// Другие приложения — локальный импорт
import { ProductFormSchema } from '@/generated/form-schemas/models/Product.form'
import { Gender, PrismaClient } from '@/generated/prisma'

// ZenStack v3 enhanced клиент — из lib/db!
import { getEnhancedPrisma } from '@/lib/db'
```

## Правила

- **MUST** все enum'ы — в отдельных файлах или в начале schema.zmodel
- **MUST** использовать `@relation` для связей между моделями
- **MUST** использовать `@@allow` для политик доступа ZenStack
- **MUST** создавать migration file через `db:migrate` (НЕ `db:push` на production!)
- **SHOULD** для мягкого удаления — поле `deletedAt DateTime?`
- **NEVER** редактировать `schema.prisma` напрямую
- **NEVER** `db:push` на production

## Документация

→ **Skill: `zenstack-helper`** — полный воркфлоу работы с БД
→ **Skill: `tanstack-query`** — data fetching с ZenStack хуками
