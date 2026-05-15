/**
 * Таблица транслитерации кириллицы в латиницу (ГОСТ 7.79-2000)
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/**
 * Транслитерация кириллицы в латиницу
 */
function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
}

/**
 * Генерация slug из текста
 *
 * - Транслитерация кириллицы (ГОСТ 7.79-2000)
 * - Приведение к нижнему регистру
 * - Замена пробелов и спецсимволов на дефисы
 * - Удаление множественных дефисов
 *
 * @example
 * slugify('Мандала любви') // 'mandala-lyubvi'
 * slugify('Hello World!') // 'hello-world'
 */
export function slugify(text: string): string {
  return (
    transliterate(text)
      // Заменяем не-буквы и не-цифры на дефисы
      .replace(/[^a-z0-9]+/g, '-')
      // Убираем дефисы в начале и конце
      .replace(/^-+|-+$/g, '')
  )
}
