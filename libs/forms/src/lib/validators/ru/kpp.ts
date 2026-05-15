/**
 * Валидация КПП (Код причины постановки на учёт).
 *
 * 9 символов: NNNNPPXXX.
 * NNNN — код налогового органа (цифры).
 * PP — причина постановки (цифры или буквы A-Z).
 * XXX — порядковый номер (цифры).
 */
import { z } from 'zod/v4'

/**
 * Проверить формат КПП.
 */
export function validateKpp(value: string): boolean {
  // 4 цифры + 2 символа (цифры или A-Z) + 3 цифры
  return /^\d{4}[\dA-Z]{2}\d{3}$/.test(value)
}

/**
 * Zod-схема КПП (9 символов).
 */
export function kppSchema() {
  return z
    .string()
    .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
    .refine((v) => v.length === 9, { message: 'КПП должен содержать 9 символов' })
    .refine(validateKpp, { message: 'Неверный формат КПП (NNNNPPXXX)' })
}
