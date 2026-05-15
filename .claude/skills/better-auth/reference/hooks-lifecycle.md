# Hooks & Lifecycle

Хуки для модификации поведения Better Auth.

---

## Структура хуков

```typescript
export const auth = betterAuth({
  hooks: {
    // Глобальные хуки (все endpoints)
    before: [...],
    after: [...],

    // Хуки для конкретных сущностей
    session: {
      create: { before, after },
      update: { before, after },
    },
    user: {
      create: { before, after },
      update: { before, after },
    },
  },
})
```

---

## Before Hooks

Выполняются **до** обработки запроса. Можно:

- Модифицировать данные запроса
- Валидировать данные
- Прервать выполнение с ошибкой

### Пример: валидация email домена

```typescript
export const auth = betterAuth({
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === '/sign-up/email',
        handler: async (ctx) => {
          const email = ctx.body?.email

          // Разрешить только корпоративные email
          if (!email?.endsWith('@company.com')) {
            throw new APIError('BAD_REQUEST', {
              message: 'Только корпоративные email',
            })
          }
        },
      },
    ],
  },
})
```

### Пример: модификация данных

```typescript
export const auth = betterAuth({
  hooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Нормализация email
          user.email = user.email.toLowerCase().trim()

          // Добавить дефолтную роль
          user.roles = ['USER']

          return user // Вернуть модифицированные данные
        },
      },
    },
  },
})
```

---

## After Hooks

Выполняются **после** успешной обработки. Используются для:

- Логирования
- Уведомлений
- Синхронизации с внешними системами

### Пример: отправка welcome email

```typescript
export const auth = betterAuth({
  hooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          await sendEmail({
            to: user.email,
            subject: 'Добро пожаловать!',
            html: `<h1>Привет, ${user.name}!</h1>`,
          })
        },
      },
    },
  },
})
```

### Пример: логирование

```typescript
export const auth = betterAuth({
  hooks: {
    after: [
      {
        matcher: () => true, // Все endpoints
        handler: async (ctx) => {
          await db.auditLog.create({
            data: {
              path: ctx.path,
              method: ctx.method,
              userId: ctx.context.session?.user?.id,
              ip: ctx.headers.get('x-forwarded-for'),
              userAgent: ctx.headers.get('user-agent'),
              status: ctx.context.responseStatus,
              timestamp: new Date(),
            },
          })
        },
      },
    ],
  },
})
```

---

## Context (ctx)

### Доступные свойства

```typescript
interface HookContext {
  // Запрос
  path: string // '/sign-in/email'
  method: string // 'POST'
  headers: Headers // HTTP заголовки
  body: any // Тело запроса
  query: Record<string, string> // Query параметры

  // Контекст auth
  context: {
    session?: Session // Текущая сессия (если есть)
    user?: User // Текущий пользователь
    adapter: DatabaseAdapter // Адаптер БД
    responseStatus?: number // Статус ответа (в after hooks)
  }
}
```

### Получение данных из headers

```typescript
handler:;
;async (ctx) => {
  const ip = ctx.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = ctx.headers.get('user-agent')
  const authorization = ctx.headers.get('authorization')
}
```

---

## Matcher

Фильтрует, для каких endpoints срабатывает хук.

### По пути

```typescript
// Один путь
matcher:;
;(ctx) => ctx.path === '/sign-in/email'

// Несколько путей
matcher:;
;(ctx) => ['/sign-in/email', '/sign-up/email'].includes(ctx.path)

// По префиксу
matcher:;
;(ctx) => ctx.path.startsWith('/sign-in')

// Regex
matcher:;
;(ctx) => /^\/api\/auth/.test(ctx.path)
```

### По методу

```typescript
matcher:;
;(ctx) => ctx.method === 'POST'
```

### Комбинация

```typescript
matcher:;
;(ctx) => ctx.path === '/sign-in/email' && ctx.method === 'POST'
```

---

## APIError

Типизированные ошибки для прерывания выполнения.

### Синтаксис

```typescript
throw new APIError(code, options)
```

### Коды ошибок

| Код                     | HTTP Status | Описание          |
| ----------------------- | ----------- | ----------------- |
| `BAD_REQUEST`           | 400         | Невалидные данные |
| `UNAUTHORIZED`          | 401         | Не авторизован    |
| `FORBIDDEN`             | 403         | Доступ запрещён   |
| `NOT_FOUND`             | 404         | Не найдено        |
| `TOO_MANY_REQUESTS`     | 429         | Rate limit        |
| `INTERNAL_SERVER_ERROR` | 500         | Внутренняя ошибка |

### Примеры

```typescript
import { APIError } from 'better-auth'

// Простая ошибка
throw new APIError('FORBIDDEN', {
  message: 'Доступ запрещён',
})

// С дополнительными данными
throw new APIError('BAD_REQUEST', {
  message: 'Ошибка валидации',
  data: {
    field: 'email',
    error: 'Некорректный формат',
  },
})
```

---

## Cookie Utilities

Работа с cookies в хуках.

```typescript
import { deleteCookie, getCookie, setCookie } from 'better-auth/cookies'

handler:;
;async (ctx) => {
  // Получить cookie
  const value = getCookie(ctx, 'my-cookie')

  // Установить cookie
  setCookie(ctx, 'my-cookie', 'value', {
    maxAge: 60 * 60 * 24, // 1 день
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  })

  // Удалить cookie
  deleteCookie(ctx, 'my-cookie')
}
```

---

## Типичные паттерны

### Ограничение регистрации по домену

```typescript
hooks: {
  before: [
    {
      matcher: (ctx) => ctx.path === '/sign-up/email',
      handler: async (ctx) => {
        const allowedDomains = ['company.com', 'partner.com']
        const email = ctx.body?.email
        const domain = email?.split('@')[1]

        if (!allowedDomains.includes(domain)) {
          throw new APIError('FORBIDDEN', {
            message: 'Регистрация только для сотрудников',
          })
        }
      },
    },
  ],
}
```

### Автоматическое присвоение роли

```typescript
hooks: {
  user: {
    create: {
      after: async (user, ctx) => {
        // Первый пользователь — владелец
        const count = await ctx.context.adapter.countUsers()

        if (count === 1) {
          await ctx.context.adapter.updateUser(user.id, {
            roles: ['OWNER'],
          })
        }
      },
    },
  },
}
```

### Уведомление о входе с нового устройства

```typescript
hooks: {
  session: {
    create: {
      after: async (session, ctx) => {
        // Проверить, новое ли устройство
        const existingSessions = await ctx.context.adapter.listSessions(session.userId)
        const isNewDevice = !existingSessions.some(
          s => s.userAgent === session.userAgent
        )

        if (isNewDevice) {
          await sendEmail({
            to: session.user.email,
            subject: 'Вход с нового устройства',
            html: `
              <p>Обнаружен вход с нового устройства:</p>
              <ul>
                <li>IP: ${session.ipAddress}</li>
                <li>Устройство: ${session.userAgent}</li>
              </ul>
              <p>Если это были не вы, смените пароль.</p>
            `,
          })
        }
      },
    },
  },
}
```

### Блокировка подозрительных IP

```typescript
const suspiciousIPs = new Set<string>()

hooks: {
  before: [
    {
      matcher: (ctx) => ctx.path.startsWith('/sign-in'),
      handler: async (ctx) => {
        const ip = ctx.headers.get('x-forwarded-for') || ''

        if (suspiciousIPs.has(ip)) {
          throw new APIError('TOO_MANY_REQUESTS', {
            message: 'Слишком много попыток',
          })
        }
      },
    },
  ],
  after: [
    {
      matcher: (ctx) => ctx.path === '/sign-in/email',
      handler: async (ctx) => {
        // Отслеживать неудачные попытки
        if (ctx.context.responseStatus === 401) {
          const ip = ctx.headers.get('x-forwarded-for') || ''
          const attempts = await incrementFailedAttempts(ip)

          if (attempts >= 10) {
            suspiciousIPs.add(ip)
            // Разблокировать через час
            setTimeout(() => suspiciousIPs.delete(ip), 60 * 60 * 1000)
          }
        }
      },
    },
  ],
}
```

### Синхронизация с CRM

```typescript
hooks: {
  user: {
    create: {
      after: async (user, ctx) => {
        // Создать контакт в CRM
        await crm.contacts.create({
          email: user.email,
          name: user.name,
          source: 'website',
        })
      },
    },
    update: {
      after: async (user, ctx) => {
        // Обновить контакт в CRM
        await crm.contacts.update({
          email: user.email,
          name: user.name,
        })
      },
    },
  },
}
```

---

## Порядок выполнения

```
1. Global before hooks (по порядку в массиве)
2. Entity-specific before hooks
3. Main handler (обработка запроса)
4. Entity-specific after hooks
5. Global after hooks (по порядку в массиве)
```

---

## Async/Await

Все хуки могут быть асинхронными:

```typescript
handler:;
;async (ctx) => {
  // Асинхронные операции
  await someAsyncOperation()
  await anotherAsyncOperation()
}
```

---

## См. также

- [security-best-practices.md](security-best-practices.md) — Безопасность через хуки
- [admin-plugin.md](admin-plugin.md) — Хуки админ-плагина
- [session-management.md](session-management.md) — Session хуки
