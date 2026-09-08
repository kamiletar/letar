'use client'

/**
 * Классификация глав файла (OP/ED) для кнопки «Пропустить опенинг» и маркеров на прогресс-баре —
 * тонкая обёртка с мемоизацией над чистой логикой `@shared/chapter-mapping` (PLAN.md §7).
 */

import type { MediaChapter } from '@letar/folder-scan'
import { useMemo } from 'react'

import { type ClassifiedChapters, classifyMediaChapters } from '@shared/chapter-mapping'

export type UseChapterSkipResult = ClassifiedChapters

export function useChapterSkip(mediaChapters: MediaChapter[] | undefined, duration: number): UseChapterSkipResult {
  return useMemo(() => classifyMediaChapters(mediaChapters, duration), [mediaChapters, duration])
}
