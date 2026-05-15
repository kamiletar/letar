/**
 * Утилиты для определения сетевых ошибок.
 *
 * Используется в mobile и web для различения
 * сетевых ошибок (нет соединения) от HTTP-ошибок (400/500).
 */

/**
 * Проверить, является ли ошибка сетевой (а не HTTP).
 *
 * Покрывает паттерны ошибок из fetch API и React Native:
 * - "Network request failed" (React Native)
 * - "Failed to fetch" (Web fetch API)
 * - "timeout" / "AbortError" (таймауты)
 * - "Нет соединения с сервером" (наш кастомный текст)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('network request failed') ||
      msg.includes('нет соединения с сервером') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout') ||
      error.name === 'AbortError'
    )
  }
  return false
}
