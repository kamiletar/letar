/**
 * In-memory rate limiter для демо-приложений.
 * Sliding window по IP-адресу, без внешних зависимостей.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Очистка просроченных записей каждые 5 минут
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store) {
    if (now > val.resetAt) {
      store.delete(key)
    }
  }
}, 5 * 60_000).unref()

/**
 * Проверяет rate limit для IP-адреса.
 * @returns `true` если запрос разрешён, `false` если лимит превышен
 */
export function checkRateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}

export const RATE_LIMIT_ERROR = 'Слишком много запросов. Попробуйте через минуту.'
