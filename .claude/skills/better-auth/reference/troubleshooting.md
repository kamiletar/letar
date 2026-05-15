# Troubleshooting

Типичные проблемы и их решения при работе с Better Auth.

---

## "Unauthorized" или "Session is undefined"

### Проблема

Сессия возвращает `null` или `undefined` в Server Components/Actions.

### Решения

**1. Проверь паттерн получения сессии:**

```typescript
// ❌ Неправильно
const session = await auth()

// ✅ Правильно
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({
  headers: await headers(),
})
```

**2. Добавь плагин `nextCookies()`:**

```typescript
// src/lib/auth.ts
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  plugins: [nextCookies()], // ОБЯЗАТЕЛЬНО!
  // ...
})
```

**3. Проверь route handler:**

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

---

## OAuth redirect ошибки

### "redirect_uri_mismatch"

**Причина:** URL в конфигурации провайдера не совпадает с `BETTER_AUTH_URL`.

**Решение:**

1. Проверь `BETTER_AUTH_URL` в `.env`
2. В консоли провайдера добавь правильный redirect URI:
   - `https://your-domain.com/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/yandex`

### "Invalid redirect_uri"

**Причина:** В консоли провайдера не добавлен callback URL.

**Решение:**

```
Google:    https://your-domain.com/api/auth/callback/google
Yandex:    https://your-domain.com/api/auth/callback/yandex
GitHub:    https://your-domain.com/api/auth/callback/github
VK:        https://your-domain.com/api/auth/callback/vk
```

### "state mismatch"

**Причина:** CSRF токен не совпадает (обычно из-за cookies).

**Решение:**

1. Проверь `sameSite` настройку cookie:
   ```typescript
   session: {
     cookie: {
       sameSite: 'lax', // не 'strict' для OAuth!
     },
   },
   ```
2. Убедись, что `BETTER_AUTH_URL` совпадает с доменом

---

## proxy.ts не работает

### Проблема

Защита роутов не срабатывает, редиректы не происходят.

### Решения

**1. Убедись, что используется Node.js Runtime:**

```typescript
// src/proxy.ts
// НЕ добавляй: export const runtime = 'edge'
```

**2. Проверь matcher:**

```typescript
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**3. Экспортируй как default:**

```typescript
// Если файл называется middleware.ts
export { proxy as middleware } from './proxy'

// Или переименуй proxy.ts в middleware.ts
```

---

## Cookie issues

### "Cookie not set"

**Причина:** Cookie не устанавливается из-за настроек безопасности.

**Решение:**

```typescript
session: {
  cookie: {
    secure: process.env.NODE_ENV === 'production', // false для localhost
    sameSite: 'lax',
    httpOnly: true,
  },
},
```

### "Cookie не отправляется"

**Причина:** Cross-origin запросы без credentials.

**Решение для клиента:**

```typescript
// src/lib/auth-client.ts
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  fetchOptions: {
    credentials: 'include', // Включить cookies
  },
})
```

---

## Prisma ошибки

### "Table does not exist"

**Решение:**

```bash
# Сгенерируй схему
npx @better-auth/cli generate

# Примени миграцию
npx @better-auth/cli migrate

# Для ZenStack
nx zenstack:generate <app>
nx db:push <app>
```

### "Column emailVerified type mismatch"

**Причина:** NextAuth использует `DateTime?`, Better Auth — `Boolean`.

**Решение (SQL):**

```sql
ALTER TABLE "User"
  ALTER COLUMN "emailVerified" TYPE BOOLEAN
  USING CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END;
```

**Решение (Prisma):**

```prisma
model User {
  emailVerified Boolean @default(false)  // Было DateTime?
}
```

---

## TypeScript ошибки

### "Property does not exist on type Session"

**Решение:** Добавь type declaration:

```typescript
// src/types/auth.d.ts
declare module 'better-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      roles?: string[]
      // Добавь свои поля
    }
  }
}
```

### "Module not found: better-auth/next-js"

**Решение:** Проверь установку:

```bash
bun add better-auth
```

---

## Rate Limiting

### "Too Many Requests"

**Причина:** Превышен лимит запросов.

**Решение для разработки:**

```typescript
export const auth = betterAuth({
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production', // Отключить в dev
  },
})
```

---

## Email не отправляется

### Проблема

Письма подтверждения/сброса не приходят.

### Решения

**1. Проверь конфигурацию:**

```typescript
emailVerification: {
  sendVerificationEmail: async (user, url, token) => {
    console.log('Sending email to:', user.email)
    console.log('URL:', url)

    // Убедись, что функция вызывается
    await yourEmailService.send({
      to: user.email,
      subject: 'Подтверждение',
      html: `<a href="${url}">Подтвердить</a>`,
    })
  },
},
```

**2. Проверь SMTP настройки:**

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

---

## Сессия теряется после деплоя

### Проблема

После деплоя все пользователи разлогиниваются.

### Причина

`BETTER_AUTH_SECRET` изменился или не установлен в production.

### Решение

1. Убедись, что `BETTER_AUTH_SECRET` одинаков между деплоями
2. Добавь переменную в секреты CI/CD:
   ```yaml
   env:
     BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
   ```

---

## Debug режим

Включи логирование для отладки:

```typescript
export const auth = betterAuth({
  // Логирование запросов
  advanced: {
    debug: process.env.NODE_ENV === 'development',
  },
})
```

Или вручную:

```typescript
export const auth = betterAuth({
  hooks: {
    before: [
      {
        matcher: () => true,
        handler: async (ctx) => {
          console.log('[AUTH]', ctx.method, ctx.path)
          console.log('[AUTH] Headers:', Object.fromEntries(ctx.headers))
        },
      },
    ],
  },
})
```

---

## Чеклист диагностики

При проблемах проверь:

1. [ ] `BETTER_AUTH_SECRET` установлен и достаточно длинный (32+ символов)
2. [ ] `BETTER_AUTH_URL` соответствует текущему домену
3. [ ] Плагин `nextCookies()` добавлен в конфигурацию
4. [ ] Route handler в `[...all]/route.ts`, не `[...nextauth]`
5. [ ] Паттерн `auth.api.getSession({ headers: await headers() })`
6. [ ] Таблицы БД созданы (`npx @better-auth/cli migrate`)
7. [ ] Cookie `secure: false` для localhost
8. [ ] OAuth redirect URIs совпадают с `BETTER_AUTH_URL`

---

## Получить помощь

1. Официальная документация: https://www.better-auth.com/docs
2. GitHub Issues: https://github.com/better-auth/better-auth/issues
3. Discord: https://discord.gg/better-auth

---

## См. также

- [nextjs-integration.md](nextjs-integration.md) — Правильная интеграция
- [prisma-adapter.md](prisma-adapter.md) — Проблемы с БД
- [security-best-practices.md](security-best-practices.md) — Настройки безопасности
