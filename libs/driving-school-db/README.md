# @letar/driving-school-db

Генерируемые типы и схемы для driving-school. Экспортирует Prisma-модели, ZenStack-схему и автогенерируемые form-schemas.

## Установка

```typescript
// Prisma типы
import type { Student, User } from '@letar/driving-school-db/prisma'

// ZenStack схема
import { schema } from '@letar/driving-school-db/schema'

// Form schemas
import { StudentFormSchema } from '@letar/driving-school-db/form-schemas/Student'
```

## Экспорты

- `./prisma` — Prisma Client типы (модели, перечисления)
- `./schema` — ZenStack схема
- `./models` — генерируемые модели
- `./input` — Input типы
- `./form-schemas/*` — автогенерируемые Zod-схемы для форм

---

**Версия:** 0.1.0
