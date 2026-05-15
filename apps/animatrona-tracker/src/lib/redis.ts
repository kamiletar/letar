/**
 * Redis клиент для animatrona-tracker.
 *
 * Graceful degradation: если Redis недоступен — все функции работают как no-op,
 * приложение продолжает работать напрямую через БД.
 */

import Redis from 'ioredis'

/** Singleton Redis клиент — ленивая инициализация */
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
        // Переподключение: 1с, 2с, 4с... макс 30с
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

    // Попытка подключения
    redis.connect().catch(() => {
      connectionFailed = true
      console.warn('[redis] Не удалось подключиться, работаем без кэша')
    })
  }

  return redis
}

/**
 * Cache-aside хелпер: проверяем Redis → если miss → вызываем fn → пишем в Redis.
 *
 * При ошибке Redis — прозрачный fallback на fn().
 *
 * @param key - Ключ кэша (например 'anime:genres')
 * @param ttlSec - TTL в секундах
 * @param fn - Функция для получения данных при cache miss
 */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const r = getRedis()

  if (r) {
    try {
      const hit = await r.get(key)
      if (hit) {
        return JSON.parse(hit) as T
      }
    } catch {
      // Redis недоступен — fallback на fn
    }
  }

  const data = await fn()

  if (r) {
    try {
      await r.set(key, JSON.stringify(data), 'EX', ttlSec)
    } catch {
      // Ошибка записи — не критично
    }
  }

  return data
}

/**
 * Инвалидировать ключи кэша.
 * Поддерживает glob-паттерны (например 'anime:*:similar').
 *
 * @param patterns - Ключи или glob-паттерны для удаления
 */
export async function invalidate(...patterns: string[]): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }

  try {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Glob — находим все совпадающие ключи
        const keys = await r.keys(pattern)
        if (keys.length > 0) {
          await r.del(...keys)
        }
      } else {
        await r.del(pattern)
      }
    }
  } catch {
    // Ошибка инвалидации — не критично
  }
}

/**
 * Rate limiter на основе Redis INCR + TTL.
 *
 * @param key - Идентификатор (например 'api-key:abc123' или 'ip:1.2.3.4')
 * @param maxReqs - Максимум запросов в окне
 * @param windowSec - Размер окна в секундах
 * @returns true если запрос разрешён, false если превышен лимит
 */
export async function rateLimit(key: string, maxReqs: number, windowSec: number): Promise<boolean> {
  const r = getRedis()
  if (!r) {
    return true // Без Redis — пропускаем
  }

  try {
    const rlKey = `rl:${key}`
    const current = await r.incr(rlKey)
    if (current === 1) {
      await r.expire(rlKey, windowSec)
    }
    return current <= maxReqs
  } catch {
    return true // При ошибке — пропускаем
  }
}
