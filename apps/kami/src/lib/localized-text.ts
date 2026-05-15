/**
 * Утилита для выбора текста в зависимости от локали
 * Для серверных компонентов
 *
 * Fallback: если EN пусто — возвращает RU
 *
 * @example
 * const title = getLocalizedText(locale, post.title, post.titleEn)
 */
export function getLocalizedText(locale: string, ru: string, en?: string | null): string {
  if (locale === 'ru') {
    return ru
  }
  // Fallback на русский если английский пуст
  return en?.trim() ? en : ru
}

/**
 * Создаёт функцию локализации с предустановленной локалью
 *
 * Fallback: если EN пусто — возвращает RU
 *
 * @example
 * const l = createLocalizer(locale)
 * const title = l(post.title, post.titleEn)
 */
export function createLocalizer(locale: string) {
  return (ru: string, en?: string | null) => getLocalizedText(locale, ru, en)
}
