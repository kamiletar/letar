/**
 * Утилиты для работы с главами
 * Конвертация между форматами ManifestChapter (мс, lowercase) и плеера (секунды, UPPERCASE)
 */

import type { ManifestChapter, ManifestChapterType } from '../../types/electron'
import type { Chapter, PlayerChapterType } from './ChapterMarkers'

/** Типы глав, которые можно пропустить */
const SKIPPABLE_TYPES: Set<PlayerChapterType> = new Set(['OP', 'ED', 'RECAP', 'PREVIEW'])

/** Маппинг ManifestChapterType (lowercase) → PlayerChapterType (UPPERCASE) */
const MANIFEST_TO_PLAYER_TYPE: Record<ManifestChapterType, PlayerChapterType> = {
  chapter: 'CHAPTER',
  op: 'OP',
  ed: 'ED',
  recap: 'RECAP',
  preview: 'PREVIEW',
}

/** Маппинг PlayerChapterType (UPPERCASE) → ManifestChapterType (lowercase) */
const PLAYER_TO_MANIFEST_TYPE: Record<PlayerChapterType, ManifestChapterType> = {
  CHAPTER: 'chapter',
  OP: 'op',
  ED: 'ed',
  RECAP: 'recap',
  PREVIEW: 'preview',
}

/**
 * Конвертирует главу из формата манифеста (IPFS) в формат плеера
 * Манифест хранит время в мс и lowercase типы, плеер — в секундах и UPPERCASE
 */
export function manifestChapterToPlayerChapter(chapter: ManifestChapter, index: number): Chapter {
  const type = MANIFEST_TO_PLAYER_TYPE[chapter.type] ?? 'CHAPTER'
  return {
    id: `ch-${index}`,
    title: chapter.title || type,
    startTime: chapter.startMs / 1000,
    endTime: chapter.endMs / 1000,
    type,
  }
}

/**
 * Конвертирует главу из формата плеера в формат манифеста (IPFS)
 */
export function playerChapterToManifestChapter(chapter: Chapter): ManifestChapter {
  const type: ManifestChapterType = chapter.type ? (PLAYER_TO_MANIFEST_TYPE[chapter.type] ?? 'chapter') : 'chapter'
  return {
    startMs: Math.round(chapter.startTime * 1000),
    endMs: Math.round(chapter.endTime * 1000),
    title: chapter.title,
    type,
    skippable: chapter.type ? SKIPPABLE_TYPES.has(chapter.type) : false,
  }
}

/**
 * Определяет, можно ли пропустить главу
 */
export function isSkippableChapter(type: PlayerChapterType | undefined): boolean {
  return type !== undefined && SKIPPABLE_TYPES.has(type)
}
