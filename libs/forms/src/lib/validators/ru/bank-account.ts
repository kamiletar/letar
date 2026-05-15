/**
 * Валидация расчётного и корреспондентского счёта.
 *
 * Расчётный счёт — 20 цифр, контрольный ключ (3-я цифра) с учётом БИК.
 * Корр. счёт — 20 цифр, начинается с "301".
 */
import { z } from 'zod/v4'
import { isDigitsOfLength } from './checksum'

// Веса для контрольного ключа банковского счёта
const ACCOUNT_WEIGHTS = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1]

/**
 * Проверить контрольный ключ банковского счёта с учётом БИК.
 *
 * Алгоритм:
 * 1. Для расч. счёта: последние 3 цифры БИК + 20 цифр счёта = 23 цифры
 * 2. Для корр. счёта: "0" + первые 2 цифры БИК + 20 цифр счёта = 23 цифры
 */
export function validateBankAccountWithBik(account: string, bik: string, isCorrAccount = false): boolean {
  const accountDigits = account.replace(/\D/g, '')
  const bikDigits = bik.replace(/\D/g, '')

  if (!isDigitsOfLength(accountDigits, 20)) return false
  if (!isDigitsOfLength(bikDigits, 9)) return false

  // Формируем 23-значную строку для проверки
  let prefix: string
  if (isCorrAccount) {
    prefix = `0${bikDigits.slice(0, 2)}` // "0" + первые 2 цифры БИК
  } else {
    prefix = bikDigits.slice(6, 9) // Последние 3 цифры БИК
  }

  const combined = `${prefix}${accountDigits}`
  const digits = combined.split('').map(Number)

  // Контрольная сумма: сумма (digit[i] * weight[i]) mod 10 должна быть 0
  const sum = ACCOUNT_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0)
  return sum % 10 === 0
}

/**
 * Zod-схема расчётного счёта (20 цифр).
 * Без проверки контрольного ключа (нет БИК в контексте).
 */
export function bankAccountSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 20), { message: 'Расчётный счёт должен содержать 20 цифр' })
}

/**
 * Zod-схема расчётного счёта с проверкой по БИК.
 */
export function bankAccountWithBikSchema(bikValue: string) {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 20), { message: 'Расчётный счёт должен содержать 20 цифр' })
    .refine((v) => validateBankAccountWithBik(v, bikValue, false), {
      message: 'Неверный контрольный ключ расчётного счёта',
    })
}

/**
 * Zod-схема корреспондентского счёта (20 цифр, начинается с "301").
 */
export function corrAccountSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 20), { message: 'Корр. счёт должен содержать 20 цифр' })
    .refine((v) => v.startsWith('301'), { message: 'Корр. счёт должен начинаться с "301"' })
}

/**
 * Zod-схема корр. счёта с проверкой по БИК.
 */
export function corrAccountWithBikSchema(bikValue: string) {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 20), { message: 'Корр. счёт должен содержать 20 цифр' })
    .refine((v) => v.startsWith('301'), { message: 'Корр. счёт должен начинаться с "301"' })
    .refine((v) => validateBankAccountWithBik(v, bikValue, true), { message: 'Неверный контрольный ключ корр. счёта' })
}
