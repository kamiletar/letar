/**
 * Утилиты для работы с URL
 */

/**
 * Нормализовать URL сервера: trim, добавить http://, убрать trailing slash
 */
export function normalizeServerUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`
  }
  return normalized.replace(/\/+$/, '')
}
