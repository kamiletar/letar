/**
 * Общие константы для экосистемы Animatrona
 */

/** Конфигурация статуса аниме — лейбл и цвет для бейджей */
export interface AnimeStatusInfo {
  label: string
  colorPalette: string
}

/**
 * Маппинг статусов аниме → лейбл + цвет.
 * Ключи в lowercase для единообразия.
 */
export const ANIME_STATUS_CONFIG: Record<string, AnimeStatusInfo> = {
  ongoing: { label: 'Выходит', colorPalette: 'green' },
  completed: { label: 'Завершён', colorPalette: 'blue' },
  released: { label: 'Вышел', colorPalette: 'blue' },
  announced: { label: 'Анонс', colorPalette: 'yellow' },
}

/**
 * Получить конфигурацию статуса с нормализацией (toLowerCase).
 * Для UPPER_CASE ключей (desktop) и lowercase (web/tracker).
 */
export function getAnimeStatusConfig(status: string | undefined | null): AnimeStatusInfo | null {
  if (!status) {
    return null
  }
  return ANIME_STATUS_CONFIG[status.toLowerCase()] ?? null
}

/** Конфигурация статусов публикации на трекере */
export const PUBLISH_STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  PUBLISHED: { label: 'Опубликован', colorPalette: 'green' },
  PENDING: { label: 'На модерации', colorPalette: 'yellow' },
  REJECTED: { label: 'Отклонён', colorPalette: 'red' },
  HIDDEN: { label: 'Скрыт', colorPalette: 'gray' },
}
