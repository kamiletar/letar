import { format } from '../mask'
import { detectBrand } from './detect-brand'

/**
 * Форматирует номер карты с пробелами по группам бренда.
 * Visa/MC: 4444 4444 4444 4444
 * Amex:    4444 444444 44444
 *
 * Фаза 8, Этап 4 (хвост, миграция FieldCreditCard): группы бренда (`gaps`) собираются в
 * маску движка `@letar/forms-core/mask` (`9` на цифру гэпа, разделитель — пробел) и
 * раскладка цифр по слотам делегируется общему `format()` вместо ручного цикла среза.
 * Цифры сверх суммы `gaps` (Visa 18/19-значная) движок не знает — маска фиксированной
 * длины, лишние цифры в неё физически не входят — поэтому хвост по-прежнему
 * дописывается вручную без разделителя, как и раньше.
 *
 * @param raw - Сырые цифры номера
 * @returns Отформатированная строка
 */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  const { gaps } = detectBrand(digits)
  const groupedLength = gaps.reduce((sum, gap) => sum + gap, 0)
  const mask = gaps.map((gap) => '9'.repeat(gap)).join(' ')

  const formatted = format(digits, mask)
  const leftover = digits.slice(groupedLength)
  return leftover ? `${formatted} ${leftover}` : formatted
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
