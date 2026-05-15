/**
 * Типы глав видео
 *
 * Используются для маркеров на прогресс-баре и кнопки пропуска
 */

/** Тип главы для плеера (UPPERCASE) */
export type PlayerChapterType = 'OP' | 'ED' | 'RECAP' | 'PREVIEW' | 'CHAPTER'

/** Информация о главе для UI плеера */
export interface Chapter {
  /** Уникальный идентификатор */
  id: string
  /** Название главы */
  title: string
  /** Время начала в секундах */
  startTime: number
  /** Время окончания в секундах */
  endTime: number
  /** Тип главы */
  type?: PlayerChapterType
}

/** Информация о главе для маркеров на прогресс-баре (без endTime) */
export interface ChapterInfo {
  id: string
  title: string
  startTime: number
}
