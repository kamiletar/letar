/**
 * Валидация ОГРН и ОГРНИП.
 *
 * ОГРН — 13 цифр: первые 12 mod 11, младший разряд = 13-я цифра.
 * ОГРНИП — 15 цифр: первые 14 mod 13, младший разряд = 15-я цифра.
 */
import { z } from 'zod/v4'
import { extractDigits, isDigitsOfLength } from './checksum'

/**
 * Проверить контрольную сумму ОГРН (13 цифр).
 */
export function validateOgrn(value: string): boolean {
  const digits = extractDigits(value)
  if (digits.length !== 13) return false

  const number = Number(value.replace(/\D/g, '').slice(0, 12))
  const check = number % 11
  return check % 10 === digits[12]
}

/**
 * Проверить контрольную сумму ОГРНИП (15 цифр).
 */
export function validateOgrnip(value: string): boolean {
  const digits = extractDigits(value)
  if (digits.length !== 15) return false

  const number = Number(value.replace(/\D/g, '').slice(0, 14))
  const check = number % 13
  return check % 10 === digits[14]
}

/**
 * Zod-схема ОГРН (13 цифр).
 */
export function ogrnSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 13), { message: 'ОГРН должен содержать 13 цифр' })
    .refine(validateOgrn, { message: 'Неверная контрольная сумма ОГРН' })
}

/**
 * Zod-схема ОГРНИП (15 цифр).
 */
export function ogrnipSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 15), { message: 'ОГРНИП должен содержать 15 цифр' })
    .refine(validateOgrnip, { message: 'Неверная контрольная сумма ОГРНИП' })
}
