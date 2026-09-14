import { createRateLimiter, type RateLimiterConfig } from '@letar/api-server'

/**
 * Лимит проверок PIN с одного IP — поверх счётчика попыток на identifier (email), который
 * даёт `reserveAttempt`/`incrementAttempts` (см. `pin-validator.ts`).
 *
 * Счётчик на email не мешает перебирать PIN разных адресов с одного IP; этот лимит мешает.
 * Хранилище in-memory (sliding window из `@letar/api-server`): приложение работает одним
 * контейнером, рестарт обнуляет лимит — приемлемо, основной барьер всё равно `reserveAttempt`.
 *
 * `getClientIp` внедряется вызывающим приложением — способ получить IP разный у разных
 * приложений (свой `lib/api-logger.ts` с явным `headers()` vs `@letar/demo-protection`,
 * читающий заголовки сам), унифицировать нечем и не нужно.
 */
export function createPinVerifyRateLimiter(
  getClientIp: () => Promise<string | null | undefined> | string | null | undefined,
  config: Partial<RateLimiterConfig> = {},
): () => Promise<boolean> {
  const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30, ...config })

  return async function isPinVerifyRateLimited(): Promise<boolean> {
    const ip = (await getClientIp()) ?? 'unknown'
    return !limiter.checkRateLimit(`pin-verify:${ip}`).allowed
  }
}
