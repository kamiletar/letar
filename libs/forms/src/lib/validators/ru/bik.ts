/**
 * Валидация БИК (Банковский идентификационный код).
 *
 * 9 цифр, первые 2 = "04" (код России).
 */
import { z } from 'zod/v4'
import { isDigitsOfLength } from './checksum'

/**
 * Проверить формат БИК.
 */
export function validateBik(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (!isDigitsOfLength(digits, 9)) return false
  return digits.startsWith('04')
}

/**
 * Zod-схема БИК (9 цифр, начинается с "04").
 */
export function bikSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 9), { message: 'БИК должен содержать 9 цифр' })
    .refine((v) => v.startsWith('04'), { message: 'БИК должен начинаться с "04"' })
}
