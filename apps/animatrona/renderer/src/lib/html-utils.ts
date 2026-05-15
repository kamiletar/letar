/**
 * Утилиты для работы с HTML текстом
 */

/**
 * Извлекает текст из HTML, убирая теги и декодируя HTML-сущности
 * @param html - HTML строка или null/undefined
 * @returns Очищенный текст или null
 */
export function stripHtmlTags(html: string | null | undefined): string | null {
  if (!html) {
    return null
  }
  // Заменяем <br> на переносы строк, убираем остальные теги
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Декодирует HTML-сущности в строке
 * @param text - Строка с HTML-сущностями
 * @returns Декодированная строка
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}
