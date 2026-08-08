import { Redis } from 'ioredis'

/**
 * Создаёт secondaryStorage адаптер Better Auth на базе Redis.
 *
 * Используется для rate-limit и сессионного кэша в production.
 * Redis настроен с lazyConnect — не падает если Redis недоступен при старте.
 *
 * @example
 * ```typescript
 * import { createRedisStorage } from '@letar/auth/server'
 *
 * export const auth = betterAuth({
 *   secondaryStorage: createRedisStorage(process.env.REDIS_URL!),
 *   rateLimit: { storage: 'secondary-storage', ... },
 * })
 * ```
 */

/**
 * ⚠️ Better Auth вызывает `secondaryStorage.get/set/delete` без своего try/catch
 * (`internal-adapter.mjs`) — необработанное исключение или зависший промис здесь валит весь
 * запрос обработки сессии/логина. При `secondaryStorage` без `session.storeSessionInDatabase`
 * (текущий конфиг во всех потребителях — auth-hub, kami, svoichuzhie) сессия физически хранится
 * только в Redis, БД не пишется вообще, поэтому Redis здесь не «кэш поверх БД», а единственное
 * хранилище. Отсюда осознанный выбор поведения при ошибке/таймауте:
 * - `get` — вернуть `null` (Better Auth и так трактует `null` как «сессии нет»/cache miss, это
 *   штатное значение, а не новый случай отказа — фейл в сторону «разлогинен», не в сторону 500);
 * - `set`/`delete` — молча пропустить попытку записи (best-effort, как и остальные Redis-
 *   потребители в репозитории). Если Redis лежит целиком, а не просто моргнул — только что
 *   созданная сессия не переживёт запись, и следующий `get` по её токену закономерно вернёт
 *   `null`; это деградация до «войти не получилось», а не падение сервиса.
 *
 * Таймаут нужен отдельно от `try/catch`: при недоступном Redis и включённой (дефолтной у ioredis)
 * офлайн-очереди команда не отклоняется с ошибкой — она ждёт переподключения бесконечно, и
 * `try/catch` эту бесконечность не ловит. Тот же корень, что уронил `dashboard-agent` на s3
 * (`apps/dashboard-agent/src/lib/with-timeout.ts`, `PLAN-INFRA.md` §66) — здесь тот же паттерн,
 * но локально: `@letar/redis-client` (где эта проблема закрыта через `enableOfflineQueue: false`)
 * этот файл не использует, у него свой независимый `ioredis`-инстанс на дефолтах.
 */
const DEFAULT_TIMEOUT_MS = 2000
const TIMED_OUT = Symbol('redis-storage-timeout')

async function withRedisTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms)
  })

  try {
    const result = await Promise.race([promise, timeout])
    if (result === TIMED_OUT) {
      console.warn(`[redis-storage] ${label} не уложился в ${ms}мс — продолжаем без Redis`)
      return fallback
    }
    return result
  } catch (err) {
    console.warn(`[redis-storage] ${label} упал:`, err instanceof Error ? err.message : err)
    return fallback
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export interface CreateRedisStorageOptions {
  /** Сколько ждать одну команду, мс. По умолчанию 2000. */
  timeoutMs?: number
}

/** Минимальный интерфейс клиента, которого требует адаптер — выделен ради тестируемости без mock('ioredis'). */
export interface RedisStorageClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<unknown>
  setex(key: string, ttl: number, value: string): Promise<unknown>
  del(key: string): Promise<unknown>
}

/** @internal Принимает уже созданный клиент — используется `createRedisStorage` и тестами напрямую. */
export function createRedisStorageFromClient(redis: RedisStorageClient, options: CreateRedisStorageOptions = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options

  return {
    get: async (key: string) => withRedisTimeout(redis.get(key), timeoutMs, null, `get(${key})`),
    set: async (key: string, value: string, ttl?: number) => {
      const write = ttl ? redis.setex(key, ttl, value) : redis.set(key, value)
      await withRedisTimeout(write.then(() => undefined), timeoutMs, undefined, `set(${key})`)
    },
    delete: async (key: string) => {
      await withRedisTimeout(redis.del(key).then(() => undefined), timeoutMs, undefined, `delete(${key})`)
    },
  }
}

export function createRedisStorage(url: string, options: CreateRedisStorageOptions = {}) {
  const redis = new Redis(url, { lazyConnect: true })

  redis.on('error', (err) => {
    console.warn('[redis-storage] Ошибка соединения:', err.message)
  })

  return createRedisStorageFromClient(redis, options)
}
