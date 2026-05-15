/**
 * Общие функции контрольных сумм для российских документов.
 */

/**
 * Извлечь массив цифр из строки (убирая всё кроме цифр).
 */
export function extractDigits(value: string): number[] {
  return value.replace(/\D/g, '').split('').map(Number)
}

/**
 * Взвешенная контрольная сумма.
 * Используется в ИНН, СНИЛС.
 *
 * @param digits — массив цифр
 * @param weights — массив весов
 * @returns remainder mod 11
 */
export function weightedChecksum(digits: number[], weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  const remainder = sum % 11
  return remainder > 9 ? 0 : remainder
}

/**
 * Проверить что строка содержит только цифры заданной длины.
 */
export function isDigitsOfLength(value: string, length: number): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === length && /^\d+$/.test(digits)
}

/**
 * Проверить что строка содержит только цифры одной из заданных длин.
 */
export function isDigitsOfLengths(value: string, lengths: number[]): boolean {
  const digits = value.replace(/\D/g, '')
  return lengths.includes(digits.length) && /^\d+$/.test(digits)
}
