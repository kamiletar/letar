/**
 * Утилиты для работы с языками (ISO 639-1/639-2)
 */

/**
 * Маппинг кодов языков на русские названия
 * Поддерживает ISO 639-1 (2 буквы) и ISO 639-2 (3 буквы)
 */
const languageNames: Record<string, string | undefined> = {
  // Русский
  rus: 'Русский',
  ru: 'Русский',

  // Английский
  eng: 'Английский',
  en: 'Английский',

  // Японский
  jpn: 'Японский',
  ja: 'Японский',

  // Немецкий
  ger: 'Немецкий',
  deu: 'Немецкий',
  de: 'Немецкий',

  // Французский
  fre: 'Французский',
  fra: 'Французский',
  fr: 'Французский',

  // Испанский
  spa: 'Испанский',
  es: 'Испанский',

  // Итальянский
  ita: 'Итальянский',
  it: 'Итальянский',

  // Китайский
  chi: 'Китайский',
  zho: 'Китайский',
  zh: 'Китайский',

  // Корейский
  kor: 'Корейский',
  ko: 'Корейский',

  // Португальский
  por: 'Португальский',
  pt: 'Португальский',

  // Польский
  pol: 'Польский',
  pl: 'Польский',

  // Украинский
  ukr: 'Украинский',
  uk: 'Украинский',

  // Неопределённый — не используем
  und: undefined,
}

/**
 * Получить название языка из ISO 639-1/639-2 кода
 *
 * @example getLanguageName('rus') → 'Русский'
 * @example getLanguageName('en') → 'Английский'
 * @example getLanguageName('und') → undefined
 *
 * @param langCode - Код языка (rus, ru, eng, en, jpn, etc.)
 * @returns Название языка на русском или undefined
 */
export function getLanguageName(langCode?: string): string | undefined {
  if (!langCode) {
    return undefined
  }

  return languageNames[langCode.toLowerCase()]
}

/**
 * Проверить, является ли код языка валидным
 *
 * @param langCode - Код языка
 * @returns true если код поддерживается
 */
export function isValidLanguageCode(langCode?: string): boolean {
  if (!langCode) {
    return false
  }

  const code = langCode.toLowerCase()
  return code in languageNames && languageNames[code] !== undefined
}

/**
 * Получить fallback название для неизвестного языка
 *
 * @param langCode - Код языка
 * @param fallback - Fallback значение (по умолчанию код в верхнем регистре)
 * @returns Название языка или fallback
 */
export function getLanguageNameOrFallback(langCode?: string, fallback?: string): string {
  const name = getLanguageName(langCode)
  if (name) {
    return name
  }

  if (fallback) {
    return fallback
  }

  // Возвращаем код в верхнем регистре как fallback
  return langCode?.toUpperCase() || 'Unknown'
}
