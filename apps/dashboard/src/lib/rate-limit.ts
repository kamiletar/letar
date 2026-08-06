/**
 * Простой rate limiting в памяти
 *
 * Для продакшена рекомендуется использовать Redis
 */

import { RATE_LIMIT } from '@/lib/constants'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Конфигурация rate limit
 */
export interface RateLimitConfig {
  /**
   * Максимальное количество запросов
   * @default RATE_LIMIT.maxRequests (60)
   */
  maxRequests?: number

  /**
   * Временное окно в секундах
   * @default RATE_LIMIT.windowSeconds (60)
   */
  windowSeconds?: number
}

/**
 * Проверяет rate limit для заданного ключа
 *
 * @param key - Уникальный ключ (например, IP адрес или user ID)
 * @param config - Конфигурация rate limit
 * @returns true если запрос разрешен, false если лимит превышен
 *
 * @example
 * ```ts
 * const allowed = checkRateLimit('192.168.1.1', { maxRequests: 10, windowSeconds: 60 });
 * if (!allowed) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const { maxRequests = RATE_LIMIT.maxRequests, windowSeconds = RATE_LIMIT.windowSeconds } = config
  const now = Date.now()

  const entry = rateLimitMap.get(key)

  // Если запись не существует или окно истекло
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowSeconds * 1000
    rateLimitMap.set(key, { count: 1, resetAt })

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    }
  }

  // Если лимит уже превышен
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Увеличиваем счетчик
  entry.count++
  rateLimitMap.set(key, entry)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Сбрасывает rate limit для заданного ключа
 *
 * @param key - Уникальный ключ
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key)
}

/**
 * Очищает устаревшие записи rate limit
 *
 * Рекомендуется вызывать периодически для экономии памяти
 */
export function cleanupRateLimits(): void {
  const now = Date.now()

  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}

// Автоматическая очистка каждые 5 минут
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000)
}
