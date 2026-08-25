/**
 * Русский стеммер на основе Snowball
 *
 * Используется для морфологического поиска:
 * - "головоломка" → "головоломк"
 * - "головоломки" → "головоломк"
 * - "головоломками" → "головоломк"
 *
 * Английские и другие слова остаются без изменений.
 */

import { newStemmer } from 'snowball-stemmers'

// Инициализируем русский стеммер
const russianStemmer = newStemmer('russian')

// Регулярка для определения кириллических символов
const CYRILLIC_CHAR_REGEX = /[а-яёА-ЯЁ]/

/**
 * Стеммирует одно русское слово
 *
 * @param word - Слово для стемминга
 * @returns Стеммированное слово
 */
export function stemWord(word: string): string {
  if (!word || word.length < 2) {
    return word.toLowerCase()
  }

  // Стеммируем только кириллические слова
  if (CYRILLIC_CHAR_REGEX.test(word)) {
    return russianStemmer.stem(word.toLowerCase())
  }

  // Для латиницы — просто lowercase
  return word.toLowerCase()
}

/**
 * Стеммирует текст (все слова)
 *
 * @param text - Текст для стемминга
 * @returns Строка со стеммированными словами, разделёнными пробелами
 *
 * @example
 * stemText('Головоломки для мозгов')
 * // → 'головоломк для мозг'
 */
export function stemText(text: string): string {
  if (!text) {
    return ''
  }

  // Разбиваем на слова (кириллица + латиница + цифры)
  const words = text.toLowerCase().split(/[\s\-_.,;:!?()[\]{}'"«»]+/)

  return words
    .filter((w) => w.length > 0)
    .map((word) => {
      // Стеммируем кириллические слова
      if (CYRILLIC_CHAR_REGEX.test(word)) {
        return russianStemmer.stem(word)
      }
      return word
    })
    .join(' ')
}

/**
 * Стеммирует поисковый запрос с prefix matching
 *
 * @deprecated Не используется после миграции на Fuse.js (v0.28.9)
 * @param query - Поисковый запрос пользователя
 * @returns Стеммированный запрос с wildcard
 *
 * @example
 * stemSearchQuery('головоломки')
 * // → 'головоломк*'
 */
export function stemSearchQuery(query: string): string {
  if (!query) {
    return ''
  }

  const stemmed = stemText(query.trim())
  if (!stemmed) {
    return ''
  }

  // Добавляем * для prefix matching
  return stemmed
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => `${w}*`)
    .join(' ')
}

/**
 * Проверяет, содержит ли текст кириллические символы
 */
export function hasCyrillic(text: string): boolean {
  return CYRILLIC_CHAR_REGEX.test(text)
}
