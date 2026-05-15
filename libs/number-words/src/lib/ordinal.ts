import { toOrdinal } from 'to-words'

import { customOrdinal } from './custom/index'
import { CUSTOM_LOCALES, LOCALE_MAP, NO_SPACE_LOCALES } from './types'

/**
 * Преобразует число в порядковое числительное (слова).
 * Возвращает строку в нижнем регистре.
 *
 * @example
 * numberToOrdinal(493, 'ru') // "четыреста девяносто третий"
 * numberToOrdinal(493, 'en') // "four hundred ninety third"
 * numberToOrdinal(493, 'ja') // "四百九十三番目"
 */
export function numberToOrdinal(n: number, locale: string): string {
  // Кастомные реализации
  if (CUSTOM_LOCALES.has(locale)) {
    return customOrdinal(n, locale)
  }

  const localeCode = LOCALE_MAP[locale]
  if (!localeCode) {
    throw new Error(`Неподдерживаемая локаль: ${locale}`)
  }

  let result = toOrdinal(n, { localeCode })

  // Постобработка
  result = postProcess(result, locale)

  return result
}

/** Постобработка вывода to-words */
function postProcess(text: string, locale: string): string {
  let result = text

  // Убираем пробелы для иероглифических/слоговых языков
  if (NO_SPACE_LOCALES.has(locale)) {
    result = result.replace(/\s+/g, '')
  }

  // Приводим к нижнему регистру
  result = result.toLowerCase()

  return result
}
