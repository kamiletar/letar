/**
 * Утилиты для форматирования денежных сумм (ru-RU, ₽)
 */

export interface FormatMoneyOptions {
  /** Язык записи: `ru` — «4 900 ₽» (по умолчанию), `en` — «RUB 4,900». Валюта всегда рубль. */
  locale?: 'ru' | 'en'
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
 * Принимает `number` и `bigint` (деньги в моделях ZenStack — BigInt). Копейки показываются
 * двумя знаками, только если они ненулевые: `999,50 ₽`, но `4 900 ₽`.
 *
 * @example
 * formatKopecks(15000000) // '150 000 ₽'
 * formatKopecks(99950n) // '999,50 ₽'
 * formatKopecks(390000, { locale: 'en' }) // 'RUB 3,900'
 * formatKopecks(null, { fallback: 'по запросу' }) // 'по запросу'
 */
export function formatKopecks(
  kopecks: number | bigint | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  const { fallback = '', prefix = '', suffix = '', locale = 'ru' } = options
  if (kopecks === null || kopecks === undefined) {
    return fallback
  }
  const value = typeof kopecks === 'bigint' ? kopecks : BigInt(Math.round(kopecks))
  const fractionDigits = value % 100n !== 0n ? 2 : 0
  const formatOptions = { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }

  if (locale === 'en') {
    const formatted = new Intl.NumberFormat('en-US', {
      ...formatOptions,
      style: 'currency',
      currency: 'RUB',
      currencyDisplay: 'code',
    })
      .format(Number(value) / 100)
    return `${prefix}${formatted}${suffix}`
  }
  const formatted = (Number(value) / 100).toLocaleString('ru-RU', formatOptions).replaceAll(REGULAR_NBSP, THIN_NBSP)
  return `${prefix}${formatted} ₽${suffix}`
}

/**
 * Конвертирует сумму в рублях (как её вводит пользователь в форме) в копейки для хранения в БД.
 *
 * @example
 * toKopecks(1500) // 150000
 * toKopecks(19.99) // 1999
 */
export function toKopecks(rubles: number): number {
  return Math.round(rubles * 100)
}
