# Безопасность: Платформа для автошкол

> Rate Limiting, Аудит, Защита данных.

## Защита данных

### HTTPS

- Let's Encrypt сертификаты через Nginx Proxy Manager
- HSTS заголовки включены
- TLS 1.3 минимум

### Санитизация ввода

- XSS защита: экранирование через React
- SQL Injection: защита через Prisma ORM (параметризованные запросы)
- CSRF: встроенная защита NextAuth.js

### Шифрование

- Пароли: bcrypt (cost factor 12)
- Чувствительные данные: шифрование в БД (телефоны, адреса)
- Сессии: JWT с коротким TTL + refresh tokens

### Content Security Policy

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js требует
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.telegram.org",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
]
```

## Rate Limiting

### Конфигурация

| Endpoint                | Лимит   | Окно   | Блокировка          |
| ----------------------- | ------- | ------ | ------------------- |
| `/api/*`                | 100 req | 1 min  | 429 + Retry-After   |
| `/api/auth/signin`      | 5 req   | 15 min | Временный бан IP    |
| `/api/auth/signup`      | 3 req   | 1 hour | Капча               |
| `/api/email/*`          | 10 req  | 1 hour | Очередь             |
| `/api/telegram/webhook` | 30 req  | 1 sec  | Встроенный Telegraf |
| `/api/push/*`           | 100 req | 1 hour | Throttle            |

### Реализация

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    })
  }

  return NextResponse.next()
}
```

## Аудит действий

### Логируемые операции

| Категория          | Действия                                             |
| ------------------ | ---------------------------------------------------- |
| **Аутентификация** | Регистрация, Вход, Выход, Сброс пароля               |
| **Занятия**        | Создание, Подтверждение, Отмена, Перенос, Завершение |
| **Финансы**        | Начисление штрафа, Оплата, Отмена штрафа             |
| **Расписание**     | Изменение настроек, Блокировка слотов                |
| **Ученики**        | Приглашение, Передача, Отключение                    |
| **Админ**          | Любые действия администратора автошколы              |

### Структура лога

```typescript
interface AuditLog {
  id: string
  userId: string | null // null для системных действий
  action: AuditAction
  entityType: string // "Lesson", "Penalty", "User"
  entityId: string | null
  payload: Record<string, unknown> | null // Изменённые данные
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}
```

### Пример записи

```json
{
  "id": "clx...",
  "userId": "user_123",
  "action": "LESSON_CANCEL",
  "entityType": "Lesson",
  "entityId": "lesson_456",
  "payload": {
    "previousStatus": "CONFIRMED",
    "newStatus": "CANCELLED",
    "reason": "Болезнь",
    "cancelledAt": "2025-12-04T10:30:00Z"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-12-04T10:30:00Z"
}
```

### Retention Policy

- **Hot storage:** 30 дней (PostgreSQL)
- **Cold storage:** 90 дней (архив)
- **Автоочистка:** Cron job ежедневно в 03:00

```typescript
// /api/cron/cleanup-audit
export async function GET() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  })

  return Response.json({ success: true })
}
```

## Защита от злоупотреблений

### Лимиты сущностей

| Параметр                | Лимит | Действие при превышении           |
| ----------------------- | ----- | --------------------------------- |
| Учеников у инструктора  | 100   | Ошибка "Достигнут лимит учеников" |
| Предоплаченных занятий  | 50    | Ошибка "Максимальный баланс"      |
| Приглашений в день      | 20    | Ошибка "Лимит приглашений"        |
| Занятий в день (ученик) | 5     | Предупреждение                    |
| Неоплаченных штрафов    | 10    | Блокировка бронирования           |

### Валидация

```typescript
// Пример валидации лимита
async function validateStudentLimit(instructorId: string) {
  const count = await prisma.studentInstructorConnection.count({
    where: {
      instructorId,
      status: 'ACTIVE',
    },
  })

  if (count >= 100) {
    throw new Error('Достигнут лимит учеников (100)')
  }
}
```

## Доступ к данным (ZenStack)

### Политики доступа на уровне модели

```zmodel
model Lesson {
  // Ученик видит только свои занятия
  @@allow('read', auth().id == studentId)

  // Инструктор видит занятия своих учеников
  @@allow('read', auth().id == instructorId)

  // Создавать может ученик или инструктор
  @@allow('create', auth().id == studentId || auth().id == instructorId)

  // Отменять может создатель или инструктор
  @@allow('update', auth().id == createdBy || auth().id == instructorId)

  // Админ автошколы видит всё
  @@allow('all', auth().role == SCHOOL_ADMIN)
}
```

### Field-level Access Control (ZenStack v3.2.0)

Защита чувствительных полей на уровне отдельных атрибутов:

```zmodel
model User {
  // Email и телефон видны только владельцу или OWNER
  email    String   @unique @allow('read', auth() == this || has(auth().roles, OWNER))
  phone    String?  @allow('read', auth() == this || has(auth().roles, OWNER))

  // Пароль никогда не читается через API
  hashedPassword String? @deny('read', true)
}

model Payment {
  // Финансовые данные доступны только владельцу подписки или OWNER
  amount        Decimal  @allow('read', subscription.userId == auth().id || has(auth().roles, OWNER))
  externalId    String?  @allow('read', subscription.userId == auth().id || has(auth().roles, OWNER))
  failureReason String?  @allow('read', subscription.userId == auth().id || has(auth().roles, OWNER))
}

model PersonalDataChange {
  // Паспортные данные скрыты от фрилансеров
  oldValue String? @deny('read', has(auth().roles, FREELANCE_INSTRUCTOR))
  newValue String  @deny('read', has(auth().roles, FREELANCE_INSTRUCTOR))
}

model InstructorProfile {
  // Штрафы видны только владельцу профиля или OWNER
  lateCancelPenalty Decimal? @allow('read', auth().id == userId || has(auth().roles, OWNER))
  noShowPenalty     Decimal? @allow('read', auth().id == userId || has(auth().roles, OWNER))
}
```

**Принцип:** Даже если модель разрешает чтение (@@allow), field-level @deny блокирует доступ к конкретным полям.

## Мониторинг безопасности

### Алерты

| Событие                   | Порог       | Действие                       |
| ------------------------- | ----------- | ------------------------------ |
| Неудачные входы           | 10/час с IP | Telegram алерт + временный бан |
| Rate limit срабатывания   | 100/час     | Логирование                    |
| Подозрительная активность | Паттерн     | Ручная проверка                |
| Ошибки авторизации        | 50/час      | Telegram алерт                 |

### Логирование

```typescript
// Структурированные логи безопасности
logger.warn('security', {
  event: 'failed_login',
  email: masked(email),
  ip: request.ip,
  userAgent: request.headers.get('user-agent'),
  attempts: failedAttempts,
})
```
