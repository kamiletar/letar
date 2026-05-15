/**
 * Валидация ИНН (Идентификационный номер налогоплательщика).
 *
 * ИНН юрлица — 10 цифр, ИНН физлица — 12 цифр.
 * Контрольные суммы по алгоритму ФНС.
 */
import { z } from 'zod/v4'
import { extractDigits, isDigitsOfLength, isDigitsOfLengths, weightedChecksum } from './checksum'

// Веса для ИНН-10 (юрлицо)
const WEIGHTS_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8]

// Веса для ИНН-12 (физлицо), два раунда
const WEIGHTS_12_1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
const WEIGHTS_12_2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]

/**
 * Проверить контрольную сумму ИНН юрлица (10 цифр).
 */
export function validateInn10(value: string): boolean {
  const digits = extractDigits(value)
  if (digits.length !== 10) return false

  const check = weightedChecksum(digits, WEIGHTS_10)
  return check === digits[9]
}

/**
 * Проверить контрольную сумму ИНН физлица (12 цифр).
 */
export function validateInn12(value: string): boolean {
  const digits = extractDigits(value)
  if (digits.length !== 12) return false

  const check1 = weightedChecksum(digits, WEIGHTS_12_1)
  const check2 = weightedChecksum(digits, WEIGHTS_12_2)

  return check1 === digits[10] && check2 === digits[11]
}

/**
 * Zod-схема ИНН юрлица (10 цифр).
 */
export function innLegalSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 10), { message: 'ИНН юрлица должен содержать 10 цифр' })
    .refine(validateInn10, { message: 'Неверная контрольная сумма ИНН' })
}

/**
 * Zod-схема ИНН физлица (12 цифр).
 */
export function innIndividualSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 12), { message: 'ИНН физлица должен содержать 12 цифр' })
    .refine(validateInn12, { message: 'Неверная контрольная сумма ИНН' })
}

/**
 * Zod-схема ИНН (10 или 12 цифр).
 */
export function innSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLengths(v, [10, 12]), { message: 'ИНН должен содержать 10 или 12 цифр' })
    .refine(
      (v) => {
        if (v.length === 10) return validateInn10(v)
        if (v.length === 12) return validateInn12(v)
        return false
      },
      { message: 'Неверная контрольная сумма ИНН' }
    )
}
