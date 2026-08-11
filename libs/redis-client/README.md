# @letar/redis-client

Фабрика Redis-клиента с graceful degradation: без `REDIS_URL` (или переменной, заданной через
`envVar`) или при недоступности Redis клиент возвращает `null`, и вызывающий код продолжает
работать без Redis (кэш/rate-limit становятся no-op/fail-open — конкретное поведение решает
вызывающий модуль, эта библиотека даёт только сам клиент).

Вынесена из трёх независимо продублированных реализаций одного и того же паттерна:
`apps/animatrona-tracker/src/lib/redis.ts`, `apps/svoichuzhie/src/lib/redis.ts`,
`apps/dashboard-agent/src/lib/redis.ts` (2026-07-22).

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { createRedisClient } from '@letar/redis-client'
```

## API

### `createRedisClient(options?: CreateRedisClientOptions): GetRedisClient`

Возвращает ленивый singleton-геттер `() => Redis | null`. Каждый вызов `createRedisClient()`
создаёт независимый инстанс — состояние (клиент, флаг сбоя подключения) не шарится между разными
вызывающими модулями, даже в рамках одного процесса.

```typescript
export interface CreateRedisClientOptions {
  /** Имя переменной окружения с URL подключения. По умолчанию REDIS_URL. */
  envVar?: string
  /** URL по умолчанию, если переменная окружения не задана (например для локальной разработки). */
  fallbackUrl?: string
  /** Подавить console.error/console.warn при ошибках подключения. */
  silent?: boolean
  /** Доп. опции ioredis поверх дефолтных (maxRetriesPerRequest, enableOfflineQueue, lazyConnect, retryStrategy). */
  redisOptions?: RedisOptions
  /** Префикс для лога, например '[redis:svoichuzhie]'. */
  logPrefix?: string
}
```

### ⚠️ `enableOfflineQueue: false` по умолчанию — fail-fast, а не зависание

Дефолт ioredis (`enableOfflineQueue: true` + бесконечный `retryStrategy`) означает, что команда,
отправленная при недоступном Redis, **не падает и не зависает с таймаутом** — она ждёт
переподключения бесконечно. `await` на такой команде не завершается никогда, и это не ловится
`maxRetriesPerRequest` (он не про время ожидания очереди). Ровно так 2026-08-08 `dashboard-agent`
ушёл в crash loop на s3 — подробности в `apps/dashboard-agent/src/lib/with-timeout.ts` и
`PLAN-INFRA.md` §66.

Эта библиотека переопределяет дефолт на `enableOfflineQueue: false`: при недоступном Redis команда
отклоняется немедленно («Stream isn't writeable»), а не зависает. Все текущие потребители уже
оборачивают Redis-вызовы в `try/catch` с fail-open/no-op фоллбэком — для них это строго лучше
зависания и ничего не ломает. Цена — короткий разрыв соединения больше не переживается прозрачно
(команда, посланная во время реконнекта, падает вместо тихого ожидания в очереди); если конкретному
потребителю нужна старая семантика — `redisOptions: { enableOfflineQueue: true }`.

⚠️ **Эта настройка не влияет на `createRedisStorage` из `@letar/auth`** (хранилище сессий/rate-limit
Better Auth) — оно не использует эту библиотеку и создаёт свой независимый инстанс `ioredis` с
дефолтными настройками ioredis. Тот же класс риска (недоступный Redis → зависание вместо ошибки)
там не устранён; Better Auth вызывает `secondaryStorage.get/set` без своего `try/catch`, так что
зависший Redis-вызов там сейчас вешает обработку сессии целиком. Отдельная задача, не входит в эту
библиотеку — см. `PLAN-INFRA.md` §66.

### Пример: приложение со своим набором хелперов поверх клиента

```typescript
// apps/my-app/src/lib/redis.ts
import { createRedisClient } from '@letar/redis-client'

export const getRedis = createRedisClient({ logPrefix: '[redis]' })

export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const r = getRedis()
  if (r) {
    try {
      const hit = await r.get(key)
      if (hit) { return JSON.parse(hit) as T }
    } catch {
      // fallback на fn()
    }
  }
  const data = await fn()
  if (r) {
    try {
      await r.set(key, JSON.stringify(data), 'EX', ttlSec)
    } catch {
      // не критично
    }
  }
  return data
}
```

Конкретные хелперы (`cached`, `rateLimit`, персист чего-либо в Redis и т.п.) сознательно остаются
в приложениях поверх общего клиента — они у каждого приложения свои и не тянут на shared-абстракцию.

## Команды

```bash
nx test redis-client
nx lint redis-client
nx typecheck:tsgo redis-client
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/redis-client` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/redis-client` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).

`transpilePackages` в `next.config.*` добавлять **не нужно** — в том числе при
`output: 'standalone'`. Оба текущих Next.js-потребителя (`animatrona-tracker` — webpack,
`svoichuzhie` — Turbopack) собираются полностью и без этой записи, проверено удалением
2026-08-05. Почему так — [lib-entry-points.md](/.claude/docs/lib-entry-points.md), раздел
«`transpilePackages` — НЕ нужен».
