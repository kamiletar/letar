# Security Check - Проверка безопасности

Проведи аудит безопасности приложения.

## Когда использовать

- Перед релизом в продакшн
- После добавления авторизации
- При работе с пользовательскими данными
- Регулярно (раз в месяц)

## Области проверки

### 1. OWASP Top 10

#### Injection (SQL, NoSQL, Command)

```typescript
// ❌ Опасно
const user = await db.$queryRaw`SELECT * FROM users WHERE id = ${userId}`

// ✅ Безопасно — ZenStack/Prisma
const user = await db.user.findUnique({ where: { id: userId } })
```

#### XSS (Cross-Site Scripting)

```tsx
// ❌ Опасно
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Безопасно — React экранирует
<div>{userInput}</div>
```

#### CSRF (Cross-Site Request Forgery)

- Server Actions защищены автоматически в Next.js
- Проверь что формы не используют GET для мутаций

#### Broken Access Control

```typescript
// ✅ ZenStack access policies
model Post {
  @@allow('read', true)
  @@allow('update', auth() == author)
  @@allow('delete', auth() == author || auth().role == 'ADMIN')
}
```

### 2. Зависимости

```bash
# Проверка уязвимостей
bun audit

# Обновление уязвимых пакетов
bun update <package>
```

**Проверить:**

- [ ] Нет критичных уязвимостей
- [ ] Устаревшие пакеты обновлены

### 3. Secrets & Environment

```bash
# Проверить .gitignore
cat .gitignore | grep -E "\.env|secrets"

# Проверить нет ли secrets в коде
grep -r "password\|secret\|api_key" --include="*.ts" --include="*.tsx" .
```

**Проверить:**

- [ ] `.env` файлы в `.gitignore`
- [ ] Нет хардкода паролей/ключей
- [ ] `BETTER_AUTH_SECRET` установлен
- [ ] `DATABASE_URL` не содержит пароль в логах

### 4. Аутентификация

```typescript
// Проверить middleware.ts
export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}

// Проверить защиту роутов
import { auth } from '@/lib/auth'

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/')
  // ...
}
```

**Проверить:**

- [ ] Защищённые роуты требуют авторизацию
- [ ] Ролевой доступ работает
- [ ] Сессии инвалидируются при logout

### 5. Входные данные

```typescript
// ✅ Валидация на сервере
const Schema = z
  .object({
    email: z.email(),
    name: z.string().min(2).max(100),
  })
  .strip() // Удаляет лишние поля

const parsed = Schema.safeParse(input)
if (!parsed.success) {
  return { error: 'Некорректные данные' }
}
```

**Проверить:**

- [ ] Все входные данные валидируются
- [ ] Используется `.strip()` в Zod схемах
- [ ] Файлы проверяются на тип и размер

### 6. HTTP Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
]
```

## Чеклист

### Критичные

- [ ] SQL/NoSQL injection защита (ZenStack)
- [ ] XSS защита (React экранирование)
- [ ] Авторизация на всех защищённых роутах
- [ ] Secrets не в коде

### Важные

- [ ] CSRF защита (Server Actions)
- [ ] Валидация всех входных данных
- [ ] `bun audit` без критичных уязвимостей
- [ ] Ролевой доступ настроен

### Рекомендуемые

- [ ] Security headers настроены
- [ ] Rate limiting на API
- [ ] Логирование подозрительных действий

## Результат

Выведи отчёт:

- Критичные уязвимости (исправить немедленно)
- Важные проблемы (исправить до релиза)
- Рекомендации (улучшить со временем)

## Документация

- [auth.md](/.claude/docs/auth.md) — аутентификация
- [database.md](/.claude/docs/database.md) — ZenStack access control
