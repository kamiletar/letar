/**
 * Утилиты для форматирования денежных сумм (ru-RU, ₽)
 */

export interface FormatMoneyOptions {
  /** Текст для `null`/`undefined`, например «по запросу» или «Бесплатно». По умолчанию — пустая строка. */
  fallback?: string
  /** Текст перед суммой, например «от ». */
  prefix?: string
  /** Текст после суммы (после «₽»), например « / мес». */
  suffix?: string
}

// toLocaleString('ru-RU') разделяет тысячи обычным неразрывным пробелом (U+00A0);
// в русской типографике для разрядов принят более тонкий узкий неразрывный пробел (U+202F).
const REGULAR_NBSP = ' '
const THIN_NBSP = ' '

/**
 * Форматирует сумму в рублях: разделители тысяч (тонкий неразрывный пробел) + «₽».
 *
 * @example
 * formatRubles(150000) // '150 000 ₽'
 * formatRubles(null, { fallback: 'по запросу' }) // 'по запросу'
 * formatRubles(1500, { prefix: 'от ', suffix: ' / занятие' }) // 'от 1 500 ₽ / занятие'
 */
export function formatRubles(rubles: number | null | undefined, options: FormatMoneyOptions = {}): string {
  const { fallback = '', prefix = '', suffix = '' } = options
  if (rubles === null || rubles === undefined) {
    return fallback
  }
  const formatted = rubles.toLocaleString('ru-RU').replaceAll(REGULAR_NBSP, THIN_NBSP)
  return `${prefix}${formatted} ₽${suffix}`
}

/**
 * Форматирует сумму, хранящуюся в копейках, в рубли для отображения.
 *
 * @example
 * formatKopecks(15000000) // '150 000 ₽'
 * formatKopecks(null, { fallback: 'по запросу' }) // 'по запросу'
 */
export function formatKopecks(kopecks: number | null | undefined, options: FormatMoneyOptions = {}): string {
  if (kopecks === null || kopecks === undefined) {
    return options.fallback ?? ''
  }
  return formatRubles(kopecks / 100, options)
}
