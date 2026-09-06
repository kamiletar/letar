/**
 * Классификация глав (OP/ED/recap/preview) по заголовку из контейнера
 *
 * Чистые функции без зависимостей — используются и в main (импорт в библиотеку,
 * IPFS-манифест), и в renderer (папочный режим плеера, без импорта в БД).
 */

/**
 * Определяет тип главы по её заголовку
 */
export function detectChapterType(title: string | null): 'op' | 'ed' | 'recap' | 'preview' | 'chapter' {
  if (!title) {
    return 'chapter'
  }
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('open') || lowerTitle.includes('op')) {
    return 'op'
  }
  if (lowerTitle.includes('end') || lowerTitle.includes('ed')) {
    return 'ed'
  }
  if (lowerTitle.includes('recap') || lowerTitle.includes('previous')) {
    return 'recap'
  }
  if (lowerTitle.includes('preview') || lowerTitle.includes('next')) {
    return 'preview'
  }

  return 'chapter'
}

/**
 * Определяет, можно ли пропустить главу
 */
export function isChapterSkippable(title: string | null): boolean {
  const type = detectChapterType(title)
  return type === 'op' || type === 'ed' || type === 'recap' || type === 'preview'
}
