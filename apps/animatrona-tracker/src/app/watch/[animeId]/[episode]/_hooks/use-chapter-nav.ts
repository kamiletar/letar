/**
 * Хук навигации по главам
 *
 * Управляет: конвертация ManifestChapter → Chapter,
 * автопропуск OP/ED/RECAP/PREVIEW, seek по главам.
 */

import type { ManifestChapter } from '@letar/animatrona-types'
import { type Chapter, type ChapterInfo } from '@letar/video-player-react'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Ключ localStorage для автопропуска */
const AUTOSKIP_KEY = 'animatrona-autoskip-chapters'

/** Конвертация ManifestChapter → Chapter для плеера */
function manifestChaptersToChapters(chapters: ManifestChapter[]): Chapter[] {
  const TYPE_MAP: Record<string, Chapter['type']> = {
    op: 'OP',
    ed: 'ED',
    recap: 'RECAP',
    preview: 'PREVIEW',
    chapter: 'CHAPTER',
  }
  return chapters.map((ch, i) => ({
    id: `chapter-${i}`,
    title: ch.title || `Глава ${i + 1}`,
    startTime: ch.startMs / 1000,
    endTime: ch.endMs / 1000,
    type: TYPE_MAP[ch.type] || 'CHAPTER',
  }))
}

function chaptersToChapterInfos(chapters: Chapter[]): ChapterInfo[] {
  return chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    startTime: ch.startTime,
  }))
}

interface UseChapterNavOptions {
  /** Главы из манифеста */
  manifestChapters: ManifestChapter[]
  /** Текущее время видео */
  currentTime: number
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
}

interface UseChapterNavReturn {
  /** Главы в формате плеера */
  chapters: Chapter[]
  /** Инфо для контролов */
  chapterInfos: ChapterInfo[]
  /** Автопропуск включён */
  autoSkipEnabled: boolean
  /** Переключить автопропуск */
  toggleAutoSkip: () => void
  /** Seek к главе */
  handleChapterSeek: (time: number) => void
  /** Показать/скрыть панель глав */
  showChapterList: boolean
  /** Переключить панель глав */
  toggleChapterList: () => void
  /** Закрыть панель глав */
  closeChapterList: () => void
}

export function useChapterNav({ manifestChapters, currentTime, videoRef }: UseChapterNavOptions): UseChapterNavReturn {
  const chapters = useMemo<Chapter[]>(() => manifestChaptersToChapters(manifestChapters), [manifestChapters])
  const chapterInfos = useMemo<ChapterInfo[]>(() => chaptersToChapterInfos(chapters), [chapters])

  const [autoSkipEnabled, setAutoSkipEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem(AUTOSKIP_KEY) === 'true'
  })

  const [showChapterList, setShowChapterList] = useState(false)

  const handleChapterSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
    }
  }, [])

  const toggleAutoSkip = useCallback(() => {
    setAutoSkipEnabled((prev: boolean) => {
      const next = !prev
      localStorage.setItem(AUTOSKIP_KEY, String(next))
      return next
    })
  }, [])

  const toggleChapterList = useCallback(() => {
    setShowChapterList((prev) => !prev)
  }, [])

  const closeChapterList = useCallback(() => {
    setShowChapterList(false)
  }, [])

  // Автопропуск OP/ED/RECAP/PREVIEW
  const lastAutoSkippedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoSkipEnabled || chapters.length === 0) {
      return
    }
    const SKIPPABLE = new Set(['OP', 'ED', 'RECAP', 'PREVIEW'])
    const current = chapters.find(
      (ch) => ch.type && SKIPPABLE.has(ch.type) && currentTime >= ch.startTime && currentTime < ch.endTime - 1,
    )
    if (current && lastAutoSkippedRef.current !== current.id) {
      lastAutoSkippedRef.current = current.id
      const video = videoRef.current
      if (video) {
        video.currentTime = current.endTime
      }
    }
    if (!current) {
      lastAutoSkippedRef.current = null
    }
  }, [autoSkipEnabled, chapters, currentTime])

  return {
    chapters,
    chapterInfos,
    autoSkipEnabled,
    toggleAutoSkip,
    handleChapterSeek,
    showChapterList,
    toggleChapterList,
    closeChapterList,
  }
}
