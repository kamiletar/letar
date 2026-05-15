import { detectBrand } from './detect-brand'

/**
 * Форматирует номер карты с пробелами по группам бренда.
 * Visa/MC: 4444 4444 4444 4444
 * Amex:    4444 444444 44444
 *
 * @param raw - Сырые цифры номера
 * @returns Отформатированная строка
 */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  const brand = detectBrand(digits)
  const { gaps } = brand

  const parts: string[] = []
  let pos = 0

  for (const gap of gaps) {
    if (pos >= digits.length) break
    parts.push(digits.slice(pos, pos + gap))
    pos += gap
  }

  // Оставшиеся цифры (если длина > суммы gaps)
  if (pos < digits.length) {
    parts.push(digits.slice(pos))
  }

  return parts.join(' ')
}

/**
 * Удаляет форматирование, оставляя только цифры.
 */
export function stripCardNumber(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

/**
 * Максимальная длина отформатированного номера (с пробелами).
 */
export function maxFormattedLength(raw: string): number {
  const brand = detectBrand(raw)
  const maxDigits = Math.max(...brand.lengths)
  const spaces = brand.gaps.length - 1
  return maxDigits + spaces
}
