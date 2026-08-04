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
  /** Доп. опции ioredis поверх дефолтных (maxRetriesPerRequest, lazyConnect, retryStrategy). */
  redisOptions?: RedisOptions
  /** Префикс для лога, например '[redis:svoichuzhie]'. */
  logPrefix?: string
}
```

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
      if (hit) return JSON.parse(hit) as T
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

В `tsconfig.json` приложения:

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/redis-client": ["../../libs/redis-client/src/index.ts"]
    }
  },
  "references": [{ "path": "../../libs/redis-client" }]
}
```

Затем добавь `@letar/redis-client` в `implicitDependencies` в `project.json` приложения — это
единственное обязательное. `paths`/`references` выше вспомогательные, а `nx sync` их не обновит:
генератор `@nx/js:typescript-sync` в репо отключён (см.
[environment.md](/.claude/docs/environment.md#разработка-shared-библиотек)).

Для Next.js-приложений (`output: 'standalone'`) дополнительно добавь `@letar/redis-client` в
`transpilePackages` в `next.config.*` — иначе прод-билд может не срезолвить импорт, даже если
`typecheck:tsgo` чист (см. `.claude/docs/nextjs-standalone-tracing.md`).
