/**
 * Валидация кода подразделения, выдавшего паспорт РФ.
 *
 * Формат `999-999` — 6 цифр. Проверено на открытом справочнике hflabs/fms-unit
 * (CC BY-SA 4.0, https://github.com/hflabs/fms-unit): все 16 582 записи совпадают
 * с `^\d{3}-\d{3}$`, исключений ноль. Первые две цифры — код региона (01–92).
 *
 * ⚠️ Третью цифру НЕ валидировать по списку 0–3 (MASK_ENGINE.md §7.1) — в реальных данных
 * встречаются 4, 5, 9; последние три цифры включают 000.
 */
import { z } from 'zod/v4'
import { isDigitsOfLength } from './checksum'

/**
 * Проверить формат кода подразделения (6 цифр).
 */
export function validateDepartmentCode(value: string): boolean {
  return isDigitsOfLength(value, 6)
}

/**
 * Zod-схема кода подразделения (6 цифр, `999-999`).
 */
export function departmentCodeSchema() {
  return z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isDigitsOfLength(v, 6), { message: 'Код подразделения должен содержать 6 цифр' })
}
