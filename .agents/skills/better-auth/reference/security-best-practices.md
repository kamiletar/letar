# Security Best Practices

Рекомендации по безопасности для Better Auth.

---

## Environment Variables

### Обязательные переменные

```bash
# Секретный ключ (КРИТИЧНО!)
# Генерируй: openssl rand -base64 32
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-chars

# URL приложения (для OAuth redirect)
BETTER_AUTH_URL=https://your-domain.com

# Публичный URL для клиента
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Правила

| Правило           | Описание                                                        |
| ----------------- | --------------------------------------------------------------- |
| Уникальный секрет | Каждое окружение (dev/staging/prod) — свой `BETTER_AUTH_SECRET` |
| Длина секрета     | Минимум 32 символа                                              |
| Не коммить        | `.env` в `.gitignore`                                           |
| Rotation          | Менять секрет раз в год или при компрометации                   |

---

## CSRF защита

Better Auth включает CSRF защиту по умолчанию.

### Конфигурация

```typescript
export const auth = betterAuth({
  // CSRF включен по умолчанию
  csrf: {
    enabled: true,

    // Проверять origin header
    checkOrigin: true,
  },
})
```

### Trusted Origins

```typescript
export const auth = betterAuth({
  trustedOrigins: [
    'https://your-domain.com',
    'https://app.your-domain.com',

    // Wildcard для поддоменов
    'https://*.your-domain.com',

    // Mobile schemes
    'myapp://',
    'com.myapp.auth://',
  ],
})
```

---

## Rate Limiting

### Production конфигурация

```typescript
export const auth = betterAuth({
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',

    // Глобальный лимит
    window: 60, // 60 секунд
    max: 100, // 100 запросов

    // Лимиты на конкретные endpoints
    customRules: {
      '/sign-in/*': {
        window: 60,
        max: 5, // 5 попыток входа в минуту
      },
      '/sign-up/*': {
        window: 60 * 60,
        max: 3, // 3 регистрации в час
      },
      '/forget-password': {
        window: 60 * 60,
        max: 3, // 3 запроса сброса в час
      },
    },
  },
})
```

### Кастомный storage (Redis)

```typescript
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const auth = betterAuth({
  rateLimit: {
    enabled: true,

    storage: {
      get: async (key) => {
        const value = await redis.get(key)
        return value ? JSON.parse(value) : null
      },
      set: async (key, value, ttl) => {
        await redis.setex(key, ttl, JSON.stringify(value))
      },
    },
  },
})
```

---

## Cookie настройки

```typescript
export const auth = betterAuth({
  session: {
    cookie: {
      // Только по HTTPS в production
      secure: process.env.NODE_ENV === 'production',

      // SameSite protection
      sameSite: 'lax', // или 'strict' для максимальной защиты

      // Недоступен из JavaScript
      httpOnly: true,

      // Время жизни
      maxAge: 60 * 60 * 24 * 7, // 7 дней

      // Имя cookie
      name: 'better-auth.session_token',
    },
  },
})
```

### SameSite значения

| Значение | Описание                      | Когда использовать        |
| -------- | ----------------------------- | ------------------------- |
| `strict` | Только same-site запросы      | Максимальная безопасность |
| `lax`    | + top-level навигация         | Рекомендуется (дефолт)    |
| `none`   | Cross-site (требует `secure`) | OAuth, iframe             |

---

## Secure Headers

Добавь в `next.config.ts`:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
]

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

---

## Password Security

### Требования к паролю

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,

    password: {
      validate: (password) => {
        const errors = []

        if (password.length < 8) { errors.push('Минимум 8 символов') }
        if (!/[A-Z]/.test(password)) { errors.push('Нужна заглавная буква') }
        if (!/[a-z]/.test(password)) { errors.push('Нужна строчная буква') }
        if (!/[0-9]/.test(password)) { errors.push('Нужна цифра') }
        if (!/[!@#$%^&*]/.test(password)) { errors.push('Нужен спецсимвол') }

        return errors.length > 0 ? { valid: false, message: errors.join(', ') } : { valid: true }
      },
    },
  },
})
```

### Hashing

Better Auth использует bcrypt по умолчанию. Можно настроить:

```typescript
export const auth = betterAuth({
  advanced: {
    // Количество раундов bcrypt (10-12 рекомендуется)
    hashRounds: 12,
  },
})
```

---

## OAuth Security

### Проверка state

Better Auth проверяет `state` parameter автоматически для защиты от CSRF.

### Проверка ID Token audience

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      idToken: {
        enabled: true,
        // КРИТИЧНО: проверка audience
        aud: [process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_IOS_CLIENT_ID!],
      },
    },
  },
})
```

### Проверка email верификации

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      // Принимать только verified emails
      allowUnverifiedEmail: false, // дефолт
    },
  },
})
```

---

## Session Security

### Привязка к устройству

```typescript
export const auth = betterAuth({
  hooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          // Логирование нового устройства
          await logNewDevice({
            userId: session.userId,
            ip: session.ipAddress,
            userAgent: session.userAgent,
          })
        },
      },
    },
  },
})
```

### Ограничение параллельных сессий

```typescript
export const auth = betterAuth({
  hooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          const sessions = await ctx.context.adapter.listSessions(session.userId)

          // Максимум 5 активных сессий
          if (sessions.length >= 5) {
            const oldest = sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]

            await ctx.context.adapter.deleteSession(oldest.id)
          }
        },
      },
    },
  },
})
```

---

## IP и GeoIP

### Блокировка по IP

```typescript
const blockedIPs = ['1.2.3.4', '5.6.7.8']
const blockedCountries = ['XX', 'YY']

export const auth = betterAuth({
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path.startsWith('/sign-in'),
        handler: async (ctx) => {
          const ip = ctx.headers.get('x-forwarded-for') || 'unknown'

          if (blockedIPs.includes(ip)) {
            throw new APIError('FORBIDDEN', { message: 'Access denied' })
          }

          // GeoIP проверка (требует geoip сервис)
          // const country = await getCountryByIP(ip)
          // if (blockedCountries.includes(country)) { ... }
        },
      },
    ],
  },
})
```

---

## Logging и Monitoring

### Логирование событий

```typescript
export const auth = betterAuth({
  hooks: {
    after: [
      {
        matcher: () => true,
        handler: async (ctx) => {
          // Логировать все auth события
          await logAuthEvent({
            path: ctx.path,
            method: ctx.method,
            ip: ctx.headers.get('x-forwarded-for'),
            userAgent: ctx.headers.get('user-agent'),
            userId: ctx.context.session?.userId,
            timestamp: new Date(),
          })
        },
      },
    ],
  },
})
```

### Алерты на подозрительную активность

```typescript
export const auth = betterAuth({
  hooks: {
    after: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/email',
        handler: async (ctx) => {
          if (ctx.context.responseStatus === 401) {
            // Неудачная попытка входа
            await trackFailedLogin({
              email: ctx.body?.email,
              ip: ctx.headers.get('x-forwarded-for'),
            })

            // Уведомление при 10+ неудачных попытках
            const attempts = await getFailedAttempts(ctx.body?.email)
            if (attempts >= 10) {
              await sendSecurityAlert({
                type: 'brute_force_attempt',
                email: ctx.body?.email,
              })
            }
          }
        },
      },
    ],
  },
})
```

---

## Чеклист безопасности

### Обязательно

- [ ] `BETTER_AUTH_SECRET` — уникальный, 32+ символов
- [ ] `BETTER_AUTH_URL` — корректный production URL
- [ ] HTTPS в production
- [ ] Rate limiting включен
- [ ] CSRF защита включена

### Рекомендуется

- [ ] Cookie `secure: true` в production
- [ ] Cookie `sameSite: 'lax'` или `'strict'`
- [ ] Минимальная длина пароля 8 символов
- [ ] Email верификация для новых пользователей
- [ ] Логирование auth событий
- [ ] Ограничение параллельных сессий

### Дополнительно

- [ ] 2FA для админов
- [ ] GeoIP блокировка подозрительных стран
- [ ] Security headers (HSTS, X-Frame-Options)
- [ ] Алерты на brute-force попытки
- [ ] Регулярная ротация секретов

---

## См. также

- [session-management.md](session-management.md) — Cookie caching, revoke
- [2fa-plugin.md](2fa-plugin.md) — Двухфакторная аутентификация
- [hooks-lifecycle.md](hooks-lifecycle.md) — Хуки для логирования
