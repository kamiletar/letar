/**
 * Redis клиент для dashboard-agent.
 *
 * Используется для персистентности deploy-истории (routes/deploy.ts) — переживает
 * рестарт/пересоздание контейнера, в отличие от чистого in-memory ring-buffer.
 *
 * Graceful degradation: если REDIS_URL не задан или подключение не удалось — все
 * вызывающие используют null-клиент и продолжают работать в чистом in-memory режиме
 * (как раньше), просто без персистентности между рестартами.
 */

import Redis from 'ioredis'

let redis: Redis | null = null
let connectionFailed = false

/**
 * Получить Redis клиент. Возвращает null если REDIS_URL не задан
 * или подключение ранее провалилось.
 */
export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL || connectionFailed) {
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 1000, 30000)
        return delay
      },
    })

    redis.on('error', (err) => {
      console.error('[redis] Ошибка:', err.message)
    })

    redis.on('connect', () => {
      connectionFailed = false
    })

    redis.connect().catch(() => {
      connectionFailed = true
      console.warn('[redis] Не удалось подключиться — deploy-история будет только в памяти процесса')
    })
  }

  return redis
}
