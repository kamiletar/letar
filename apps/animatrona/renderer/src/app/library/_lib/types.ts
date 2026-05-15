/**
 * Типы для страницы библиотеки
 */

import type { WatchStatus } from '@/generated/prisma'

/** Тип режима отображения */
export type ViewMode = 'individual' | 'franchise'

/** Ключ localStorage для сохранения режима */
export const VIEW_MODE_STORAGE_KEY = 'animatrona:library:viewMode'

/** Связь с другим аниме (загруженным или нет) */
export interface AnimeRelationInfo {
  id: string
  targetShikimoriId: number
  /** ID аниме в БД (null = не загружено в библиотеку) */
  targetAnimeId: string | null
  relationKind: string
}

/** Тип аниме с данными франшизы */
export interface AnimeWithFranchise {
  id: string
  name: string
  originalName?: string | null
  year?: number | null
  status: 'ONGOING' | 'COMPLETED' | 'ANNOUNCED'
  episodeCount: number
  rating?: number | null
  poster?: { path?: string | null; cid?: string | null } | null
  genres?: { genre: { name: string } }[]
  franchise?: { id: string; name: string } | null
  /** Статус просмотра */
  watchStatus?: WatchStatus
  /** Контент закреплён локально (false = только на удалённых пирах, Cloud Library) */
  pinnedLocally?: boolean
  /** CID манифеста в IPFS */
  manifestCid?: string | null
  /** CID корневой IPFS-директории аниме */
  directoryCid?: string | null
  /** Дата публикации на трекер */
  trackerPublishedAt?: Date | string | null
  /** directoryCid на момент последней публикации */
  trackerPublishedCid?: string | null
  /** Связи с другими аниме (все направления, для графа группировки) */
  sourceRelations?: AnimeRelationInfo[]
  /** Путь к папке аниме в библиотеке */
  folderPath?: string | null
  /** Shikimori ID для сверки с незагруженными */
  shikimoriId?: number | null
  /** Суммарный размер IPFS контента (байты) */
  totalIpfsSize?: number
  /** Размер по категориям (байты) */
  ipfsSizeBreakdown?: { video: number; audio: number; subtitles: number; fonts: number }
}

/** Группа аниме по франшизе */
export interface FranchiseGroup {
  franchise: { id: string; name: string }
  animes: AnimeWithFranchise[]
  /** Незагруженные аниме франшизы (только для отображения) */
  missingAnimes: AnimeRelationInfo[]
}
