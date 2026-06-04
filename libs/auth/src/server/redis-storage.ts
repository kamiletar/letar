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
export function createRedisStorage(url: string) {
  const redis = new Redis(url, { lazyConnect: true })

  return {
    get: async (key: string) => redis.get(key),
    set: async (key: string, value: string, ttl?: number) => {
      if (ttl) {
        await redis.setex(key, ttl, value)
      } else {
        await redis.set(key, value)
      }
    },
    delete: async (key: string) => {
      await redis.del(key)
    },
  }
}
