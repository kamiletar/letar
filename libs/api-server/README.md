# @letar/api-server

Серверные утилиты для REST API.

## Возможности

- **API Response** — стандартные ответы `apiSuccess`, `apiError`
- **API Keys** — генерация и хеширование API-ключей
- **Cron Secret** — проверка `X-Cron-Secret` в cron-эндпоинтах, вызываемых dashboard-agent
- **Rate Limiting** — sliding window алгоритм с whitelist/blacklist
- **Role Utils** — проверка ролей `hasRole`, `hasAnyRole`, `hasAllRoles`

## Установка

```bash
# Добавь в implicitDependencies приложения
{
  "implicitDependencies": ["@letar/api-server"]
}
```

## Использование

### API Response

```typescript
import { apiError, apiSuccess, getRateLimitHeaders } from '@letar/api-server'

// Успешный ответ
const { body, status } = apiSuccess(data, { total: 100, page: 1 })
return NextResponse.json(body, { status })

// Ответ с ошибкой
const { body, status } = apiError('Not found', 404, 'NOT_FOUND')
return NextResponse.json(body, { status })

// Rate limit headers
const headers = getRateLimitHeaders(rateLimitResult)
return NextResponse.json(body, { status, headers })
```

### API Keys

```typescript
import { createApiKeyGenerator, generateApiKey, hashApiKey } from '@letar/api-server'

// Генерация ключа
const { key, keyHash, keyPrefix } = generateApiKey('api_live_')
// key: "api_live_abc123..." — показать пользователю один раз
// keyHash: "sha256..." — хранить в БД
// keyPrefix: "api_live_..." — для отображения

// Проверка ключа
const hash = hashApiKey(userProvidedKey)
const apiKey = await db.apiKey.findUnique({ where: { keyHash: hash } })

// Фабрика генератора
const generateKey = createApiKeyGenerator('ds_live_')
const { key } = generateKey()
```

### Cron Secret

```typescript
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'

// app/api/cron/my-job/route.ts
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... логика cron-задачи
}
```

`verifyCronSecret` сравнивает заголовок `X-Cron-Secret` с `process.env.CRON_SECRET` (fail-closed —
если `CRON_SECRET` не задан, всегда `false`). Вызывающая сторона — `executeJob` в `dashboard-agent`,
который шлёт этот заголовок на все cron-эндпоинты по расписанию.

### Rate Limiting

```typescript
import { addToBlacklist, addToWhitelist, checkRateLimit, createRateLimiter, setCustomLimit } from '@letar/api-server'

// Глобальный rate limiter (100 req/min по умолчанию)
const result = checkRateLimit(userId)
if (!result.allowed) {
  return NextResponse.json({ error: `Rate limited. Retry after ${result.retryAfter}s` }, { status: 429 })
}

// Кастомный rate limiter
const limiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 100, // 100 запросов
})

// Управление
addToWhitelist('premium-user-id') // Без лимитов
addToBlacklist('banned-user-id') // Полная блокировка
setCustomLimit('vip-user-id', 1000) // 1000 req/min
```

### Role Utils

```typescript
import { createMembershipChecker, hasAllRoles, hasAnyRole, hasRole } from '@letar/api-server'

// Базовые проверки
if (hasRole(user.roles, 'ADMIN')) {
  /* ... */
}
if (hasAnyRole(user.roles, ['ADMIN', 'MODERATOR'])) {
  /* ... */
}
if (hasAllRoles(user.roles, ['VERIFIED', 'PREMIUM'])) {
  /* ... */
}

// Membership checker (для multi-tenant)
const schoolChecker = createMembershipChecker<SchoolMembership>('schoolId')

schoolChecker.isMember(memberships, schoolId) // в школе?
schoolChecker.hasRole(memberships, schoolId, 'ADMIN') // админ школы?
schoolChecker.hasAnyRole(memberships, schoolId, roles) // любая роль?
schoolChecker.getRole(memberships, schoolId) // получить роль
```

## API

### API Response

| Функция                            | Описание                                  |
| ---------------------------------- | ----------------------------------------- |
| `apiSuccess(data, meta?)`          | Успешный ответ с data и опциональной meta |
| `apiError(message, status, code?)` | Ответ с ошибкой                           |
| `getRateLimitHeaders(result?)`     | Заголовки X-RateLimit-\*                  |

### API Keys

| Функция                         | Описание                 |
| ------------------------------- | ------------------------ |
| `generateApiKey(prefix?)`       | Генерация нового ключа   |
| `hashApiKey(key)`               | SHA-256 хеш для хранения |
| `createApiKeyGenerator(prefix)` | Фабрика генератора       |

### Rate Limiting

| Функция                           | Описание            |
| --------------------------------- | ------------------- |
| `checkRateLimit(key, secondary?)` | Проверка лимита     |
| `createRateLimiter(config)`       | Создание экземпляра |
| `setCustomLimit(key, limit)`      | Кастомный лимит     |
| `addToWhitelist(key)`             | Без лимитов         |
| `addToBlacklist(key)`             | Полная блокировка   |
| `getRateLimiterStats()`           | Статистика          |
| `getAllSettings()`                | Все настройки       |

### Role Utils

| Функция                        | Описание              |
| ------------------------------ | --------------------- |
| `hasRole(roles, role)`         | Есть роль?            |
| `hasAnyRole(roles, required)`  | Любая из ролей?       |
| `hasAllRoles(roles, required)` | Все роли?             |
| `createRoleChecker(role)`      | Фабрика проверки      |
| `createMembershipChecker(key)` | Multi-tenant проверки |

## Миграция

Если ты использовал старые библиотеки:

```diff
- import { apiSuccess } from '@letar/api-utils'
- import { hasRole } from '@letar/auth-utils'
- import { checkRateLimit } from '@letar/rate-limiter'
+ import { apiSuccess, hasRole, checkRateLimit } from '@letar/api-server'
```
