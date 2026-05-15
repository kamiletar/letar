'use server'

import { createPinValidator, generateToken } from '@letar/pin-auth/server'
import { pinValidatorAdapter } from '../_adapters/pin-auth-adapters'

export type { PinValidationResult as VerifyPinResult } from '@letar/pin-auth/server'

/**
 * Валидатор PIN-кодов с настройками для mandala
 */
const pinValidator = createPinValidator({
  maxAttempts: 5,
  pinValidityMs: 10 * 60 * 1000, // 10 минут
})

/**
 * Server action для верификации email по PIN-коду
 */
export async function verifyPinAction(email: string, pin: string) {
  return pinValidator.verifyPin(email, pin, pinValidatorAdapter, generateToken)
}
