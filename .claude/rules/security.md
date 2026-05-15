---
paths: "**/auth/**", "**/_actions/**", "**/api/**"
---

# Правила безопасности

## Валидация входных данных

```typescript
// ✅ Всегда .strip() для удаления лишних полей
const Schema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email(),
  })
  .strip()

const parsed = Schema.safeParse(input)
if (!parsed.success) {
  return { error: parsed.error.flatten() }
}
```

## Access Control (ZenStack)

```zmodel
// schema.zmodel
model Post {
  id        String   @id @default(cuid())
  title     String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String

  // Политики доступа
  @@allow('read', true)
  @@allow('create', auth() != null)
  @@allow('update', auth() == author)
  @@allow('delete', auth() == author || auth().role == 'ADMIN')
}
```

```typescript
// ZenStack v3: использование getEnhancedPrisma() с сессией
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function getDb() {
  const session = await auth()
  return getEnhancedPrisma(session?.user)
}
```

## XSS защита

```tsx
// ❌ Опасно — не использовать
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Безопасно — React экранирует
<div>{userInput}</div>

// ✅ Если нужен HTML — санитизация
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
```

## SQL Injection защита

```typescript
// ❌ Опасно — сырой SQL
const user = await db.$queryRaw`SELECT * FROM users WHERE id = ${userId}`

// ✅ Безопасно — Prisma/ZenStack ORM
const user = await db.user.findUnique({ where: { id: userId } })
```

## Secrets

```bash
# .env файлы НИКОГДА не коммитить
# .gitignore должен содержать:
.env
.env.local
.env.production
```

```typescript
// ❌ Хардкод секретов
const API_KEY = 'sk-1234567890'

// ✅ Переменные окружения
const API_KEY = process.env.API_KEY
```

## Аутентификация

```typescript
// Защита роута
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  // ... защищённый контент
}
```

## Чеклист

- [ ] Валидация всех входных данных (Zod + `.strip()`)
- [ ] Access control через ZenStack policies
- [ ] Нет `dangerouslySetInnerHTML` с пользовательским вводом
- [ ] Secrets только в `.env` файлах
- [ ] Защита роутов через middleware или `auth()`
- [ ] HTTPS для production
