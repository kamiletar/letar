/**
 * Клиентские функции для работы с изображениями
 *
 * ⚠️ ВАЖНО: Для серверных функций (с sharp) используй create-image.server.ts
 */

/**
 * Формирует URL для доступа к файлу по пути.
 */
export function getFileUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Формирует URL для доступа к файлу по ID.
 */
export function getFileUrlById(id: string): string {
  return `/api/files/id/${id}`
}

// ============================================================================
// RE-EXPORT СЕРВЕРНЫХ ТИПОВ (только типы, без реализации)
// ============================================================================

// Экспортируем только типы для использования в клиентском коде
export type { CreateFileParams, FileRecord } from './create-image.server'
