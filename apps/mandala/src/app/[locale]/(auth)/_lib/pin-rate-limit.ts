import { getClientIp } from '@letar/demo-protection'
import { createPinVerifyRateLimiter } from '@letar/pin-auth/server'

/** Лимит проверок PIN с одного IP — поверх счётчика попыток на email (pin-auth-adapters.ts). */
export const isPinVerifyRateLimited = createPinVerifyRateLimiter(getClientIp)
