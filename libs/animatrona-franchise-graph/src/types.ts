/**
 * Типы для компонентов графа франшизы
 */

import type { Edge, Node } from '@xyflow/react'

/** Дополнительные данные узла аниме */
export interface AnimeNodeData {
  /** ID на Shikimori */
  shikimoriId: number
  /** Название */
  name: string
  /** URL постера */
  imageUrl: string
  /** Год выхода */
  year: number | null
  /** Тип: tv, movie, ova, etc. */
  kind: string
  /** Текущее аниме (для которого запрошен граф) */
  isCurrent: boolean
  /** Есть в библиотеке */
  isInLibrary: boolean
  /** Slug для навигации (если есть в библиотеке) */
  librarySlug?: string
  /** URL на Shikimori */
  shikimoriUrl?: string
  /** Статус просмотра (опционально) */
  watchStatus?: string
  /** Прогресс просмотра в % (опционально) */
  watchProgress?: number
  /** Порядок в хронологии (опционально) */
  chronologicalOrder?: number
  /** Index signature для совместимости с React Flow */
  [key: string]: unknown
}

/** Дополнительные данные связи */
export interface RelationEdgeData {
  /** Тип связи */
  relation: string
  /** Локализованное название связи */
  relationLabel: string
  /** Index signature для совместимости с React Flow */
  [key: string]: unknown
}

/** Узел аниме для React Flow */
export type AnimeNode = Node<AnimeNodeData, 'anime'>

/** Связь между аниме для React Flow */
export type RelationEdge = Edge<RelationEdgeData>

/** Локализация типов связей */
export const RELATION_LABELS: Record<string, string> = {
  sequel: 'Сиквел',
  prequel: 'Приквел',
  side_story: 'Побочная история',
  parent_story: 'Основная история',
  summary: 'Краткое содержание',
  full_story: 'Полная версия',
  spin_off: 'Спин-офф',
  adaptation: 'Адаптация',
  character: 'Общие персонажи',
  alternative_version: 'Альтернативная версия',
  alternative_setting: 'Альтернативный сеттинг',
  other: 'Другое',
}

/** Локализация типов аниме */
export const KIND_LABELS: Record<string, string> = {
  tv: 'TV Сериал',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спецвыпуск',
  music: 'Клип',
}

/** Цвета для типов аниме */
export const KIND_COLORS: Record<string, string> = {
  tv: 'blue',
  movie: 'purple',
  ova: 'orange',
  ona: 'teal',
  special: 'pink',
  music: 'cyan',
}
