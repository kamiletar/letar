import { toWords } from 'to-words'

import { customCardinal } from './custom/index'
import { CUSTOM_LOCALES, LOCALE_MAP, NO_SPACE_LOCALES } from './types'

/**
 * Преобразует число в кардинальное числительное (слова).
 * Возвращает строку в нижнем регистре.
 *
 * @example
 * numberToWords(493, 'ru') // "четыреста девяносто три"
 * numberToWords(493, 'de') // "vier hundert dreiundneunzig"
 * numberToWords(493, 'ja') // "四百九十三"
 */
export function numberToWords(n: number, locale: string): string {
  // Кастомные реализации для языков без поддержки в to-words
  if (CUSTOM_LOCALES.has(locale)) {
    return customCardinal(n, locale)
  }

  const localeCode = LOCALE_MAP[locale]
  if (!localeCode) {
    throw new Error(`Неподдерживаемая локаль: ${locale}`)
  }

  let result = toWords(n, { localeCode })

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

  // Приводим к нижнему регистру (to-words выводит Title Case)
  // Для иероглифических языков toLowerCase не меняет ничего
  result = result.toLowerCase()

  return result
}
