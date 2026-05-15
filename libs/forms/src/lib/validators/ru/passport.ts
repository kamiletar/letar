/**
 * Валидация российского паспорта.
 *
 * Серия: 4 цифры (2 цифры региона + 2 цифры года).
 * Номер: 6 цифр.
 * Итого: 10 цифр.
 */
import { z } from 'zod/v4'
import { isDigitsOfLength } from './checksum'

/**
 * Проверить формат паспорта.
 */
export function validatePassport(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return isDigitsOfLength(digits, 10)
}

/**
 * Zod-схема паспорта (серия + номер, 10 цифр).
 */
export function passportSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 10), { message: 'Паспорт должен содержать 10 цифр (серия + номер)' })
}
