/**
 * Утилиты для работы с изображениями
 */

/** Конвертирует путь к файлу в URL API */
export function getPhotoUrl(path: string): string {
  return `/api/files/${path}`
}
