/**
 * Типы для компонентов графа франшизы
 */

import type { Edge, Node } from '@xyflow/react'

import type { ShikimoriFranchiseGraph, ShikimoriRelationKind } from '@/types/electron.d'

/** Дополнительные данные узла аниме */
export interface AnimeNodeData {
  /** ID аниме в БД (если есть) */
  animeDbId?: string
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
  /** Есть в библиотеке пользователя */
  isInLibrary: boolean
  /** Статус просмотра */
  watchStatus?: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'planned'
  /** Прогресс просмотра (0-100) */
  watchProgress?: number
  /** Порядковый номер в хронологии */
  chronologicalOrder?: number
  /** Index signature для совместимости с React Flow */
  [key: string]: unknown
}

/** Дополнительные данные связи */
export interface RelationEdgeData {
  /** Тип связи */
  relation: ShikimoriRelationKind
  /** Локализованное название связи */
  relationLabel: string
  /** Index signature для совместимости с React Flow */
  [key: string]: unknown
}

/** Узел аниме для React Flow */
export type AnimeNode = Node<AnimeNodeData, 'anime'>

/** Связь между аниме для React Flow */
export type RelationEdge = Edge<RelationEdgeData>

/** Режим отображения */
export type ViewMode = 'graph' | 'list' | 'timeline'

/** Пропсы главного компонента */
export interface FranchiseGraphProps {
  /** Граф из API/БД */
  graph: ShikimoriFranchiseGraph
  /** ID текущего аниме */
  currentAnimeId: number
  /** ID аниме которые есть в библиотеке */
  libraryAnimeIds?: Set<number>
  /** Статусы просмотра по shikimoriId */
  watchStatuses?: Map<number, { status: string; progress: number }>
  /** Колбэк при клике на узел */
  onNodeClick?: (shikimoriId: number) => void
  /** Начальный режим отображения */
  initialViewMode?: ViewMode
  /** Высота контейнера */
  height?: string | number
}

/** Локализация типов связей */
export const RELATION_LABELS: Record<ShikimoriRelationKind, string> = {
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
