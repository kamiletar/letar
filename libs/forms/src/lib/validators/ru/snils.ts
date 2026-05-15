/**
 * Валидация СНИЛС (Страховой номер индивидуального лицевого счёта).
 *
 * 11 цифр. Формат: XXX-XXX-XXX YY.
 * Контрольная сумма: модуль 101.
 */
import { z } from 'zod/v4'
import { extractDigits, isDigitsOfLength } from './checksum'

/**
 * Проверить контрольную сумму СНИЛС.
 *
 * Алгоритм: сумма (digit[i] × (9-i)) для i=0..8, mod 101.
 * Если результат < 100 — это контрольное число.
 * Если 100 или 101 — контрольное число = 00.
 */
export function validateSnils(value: string): boolean {
  const digits = extractDigits(value)
  if (digits.length !== 11) return false

  // СНИЛС 001-001-998 и ниже — специальные номера, не проверяем
  const number = Number(digits.slice(0, 9).join(''))
  if (number <= 1001998) return true

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (9 - i)
  }

  let checkNumber: number
  if (sum < 100) {
    checkNumber = sum
  } else if (sum === 100 || sum === 101) {
    checkNumber = 0
  } else {
    checkNumber = sum % 101
    if (checkNumber === 100) checkNumber = 0
  }

  const actualCheck = digits[9] * 10 + digits[10]
  return checkNumber === actualCheck
}

/**
 * Zod-схема СНИЛС (11 цифр).
 */
export function snilsSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 11), { message: 'СНИЛС должен содержать 11 цифр' })
    .refine(validateSnils, { message: 'Неверная контрольная сумма СНИЛС' })
}
