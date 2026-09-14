'use server'

import { createPinValidator, generateToken, type PinValidationResult } from '@letar/pin-auth/server'
import { pinValidatorAdapter } from '../_adapters/pin-auth-adapters'
import { isPinVerifyRateLimited } from '../_lib/pin-rate-limit'

export type { PinValidationResult as VerifyPinResult } from '@letar/pin-auth/server'

/**
 * Валидатор PIN-кодов с настройками для mandala
 */
const pinValidator = createPinValidator({
  maxAttempts: 5,
  pinValidityMs: 10 * 60 * 1000, // 10 минут
})

/**
 * Server action для верификации email по PIN-коду.
 * Лимиты: 5 попыток на email (атомарный счётчик в БД, см. pin-auth-adapters.ts) и общий лимит по IP.
 */
export async function verifyPinAction(email: string, pin: string): Promise<PinValidationResult> {
  if (await isPinVerifyRateLimited()) {
    return { success: false, error: 'TOO_MANY_ATTEMPTS' }
  }
  return pinValidator.verifyPin(email, pin, pinValidatorAdapter, generateToken)
}
