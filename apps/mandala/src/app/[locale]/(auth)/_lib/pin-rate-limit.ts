import { createRateLimiter } from '@letar/api-server'
import { getClientIp } from '@letar/demo-protection'

/**
 * Лимит проверок PIN с одного IP — поверх счётчика попыток на email (pin-auth-adapters.ts).
 *
 * Счётчик на email не мешает перебирать PIN разных адресов с одного IP; этот лимит мешает.
 * Хранилище in-memory (sliding window из @letar/api-server): приложение работает одним
 * контейнером, рестарт обнуляет лимит — приемлемо, основной барьер всё равно счётчик в БД.
 */
const pinVerifyLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30 })

export async function isPinVerifyRateLimited(): Promise<boolean> {
  const ip = await getClientIp()
  return !pinVerifyLimiter.checkRateLimit(`pin-verify:${ip}`).allowed
}
