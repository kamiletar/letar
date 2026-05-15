/**
 * Хелперы для локализации динамического контента из БД.
 * Используются для полей с суффиксом En (nameEn, descriptionEn и т.д.)
 */

/**
 * Возвращает локализованное значение поля.
 * Для EN ищет поле с суффиксом En, для RU — оригинальное.
 *
 * @example
 * const mandala = { name: 'Цветок', nameEn: 'Flower' }
 * getLocalizedField(mandala, 'name', 'en') // 'Flower'
 * getLocalizedField(mandala, 'name', 'ru') // 'Цветок'
 */
export function getLocalizedField<T extends Record<string, unknown>>(item: T, field: keyof T, locale: string): string {
  if (locale === 'en') {
    const enField = `${String(field)}En` as keyof T
    const enValue = item[enField]
    if (enValue && typeof enValue === 'string') {
      return enValue
    }
  }
  const value = item[field]
  return typeof value === 'string' ? value : ''
}

/**
 * Хук для получения локализованных полей.
 * Возвращает функцию, привязанную к текущей локали.
 *
 * @example
 * const getField = useLocalizedField('en')
 * const name = getField(mandala, 'name') // 'Flower'
 */
export function useLocalizedField(locale: string) {
  return <T extends Record<string, unknown>>(item: T, field: keyof T) => getLocalizedField(item, field, locale)
}

/**
 * Возвращает объект с локализованными значениями указанных полей.
 *
 * @example
 * const mandala = { name: 'Цветок', nameEn: 'Flower', description: 'Описание', descriptionEn: 'Description' }
 * getLocalizedFields(mandala, ['name', 'description'], 'en')
 * // { name: 'Flower', description: 'Description' }
 */
export function getLocalizedFields<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  fields: K[],
  locale: string
): Record<K, string> {
  const result = {} as Record<K, string>
  for (const field of fields) {
    result[field] = getLocalizedField(item, field, locale)
  }
  return result
}
