/**
 * API Response Utilities
 *
 * Стандартные ответы для REST API
 */

import type { RateLimitResult } from './rate-limiter'

/**
 * Формирует стандартный ответ об ошибке API
 */
export function apiError(
  error: string,
  status: number,
  code?: string,
): { body: { error: string; code?: string }; status: number } {
  return {
    body: { error, ...(code && { code }) },
    status,
  }
}

/**
 * Формирует стандартный успешный ответ API
 */
export function apiSuccess<T>(
  data: T,
  meta?: { total?: number; page?: number; limit?: number },
): {
  body: { data: T; meta?: { total?: number; page?: number; limit?: number } }
  status: 200
} {
  return {
    body: { data, ...(meta && { meta }) },
    status: 200,
  }
}

/**
 * Формирует заголовки rate limit для ответа
 */
export function getRateLimitHeaders(rateLimit?: RateLimitResult): Record<string, string> {
  if (!rateLimit) {
    return {}
  }

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining)),
    'X-RateLimit-Reset': String(rateLimit.resetAt),
  }

  if (rateLimit.retryAfter !== undefined) {
    headers['Retry-After'] = String(rateLimit.retryAfter)
  }

  return headers
}
