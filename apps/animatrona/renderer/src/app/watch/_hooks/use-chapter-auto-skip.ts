'use client'

/**
 * Хук для автопропуска глав (OP/ED/recap/preview)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Chapter, VideoPlayerRef } from '@/components/player'
import { useFindUniqueSettings } from '@/lib/hooks'

interface UseChapterAutoSkipOptions {
  /** Ref на плеер */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** Главы эпизода в формате плеера */
  chapters: Chapter[]
  /** Текущее время воспроизведения */
  currentPlaybackTime: number
  /** ID текущего эпизода (для сброса при смене) */
  episodeId: string
}

/**
 * Хук для автопропуска глав (OP/ED/recap/preview)
 */
export function useChapterAutoSkip(options: UseChapterAutoSkipOptions) {
  const { playerRef, chapters, currentPlaybackTime, episodeId } = options

  // Состояние override кнопки автопропуска
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(false)

  // Ref для предотвращения повторного пропуска одной главы
  const lastSkippedChapterRef = useRef<string | null>(null)

  // Загружаем настройки автопропуска
  const { data: settings } = useFindUniqueSettings({
    where: { id: 'default' },
  })

  // Определить нужно ли пропускать главу на основе Settings и кнопки override
  const shouldSkipChapter = useCallback(
    (type?: string): boolean => {
      if (!type || type === 'CHAPTER') {
        return false
      }

      // Override: кнопка включена — пропускать всё
      if (autoSkipEnabled) {
        return true
      }

      // Иначе — по настройкам из Settings
      if (type === 'OP') {
        return settings?.skipOpening ?? false
      }
      if (type === 'ED') {
        return settings?.skipEnding ?? false
      }

      // RECAP и PREVIEW пропускаются только при override
      return false
    },
    [autoSkipEnabled, settings?.skipOpening, settings?.skipEnding]
  )

  // Автопропуск skippable глав (OP/ED/recap/preview)
  useEffect(() => {
    if (chapters.length === 0) {
      return
    }

    // Найти текущую skippable главу
    const currentSkippableChapter = chapters.find(
      (chapter) =>
        shouldSkipChapter(chapter.type) &&
        currentPlaybackTime >= chapter.startTime &&
        currentPlaybackTime < chapter.endTime - 1 // -1 сек чтобы не пропустить в последнюю секунду
    )

    if (currentSkippableChapter && lastSkippedChapterRef.current !== currentSkippableChapter.id) {
      // Автоматически пропустить главу
      lastSkippedChapterRef.current = currentSkippableChapter.id
      playerRef.current?.seek(currentSkippableChapter.endTime)
    }
  }, [shouldSkipChapter, chapters, currentPlaybackTime, playerRef])

  // Сбросить lastSkippedChapter при изменении эпизода
  useEffect(() => {
    lastSkippedChapterRef.current = null
  }, [episodeId])

  // Toggle автопропуска
  const toggleAutoSkip = useCallback(() => {
    setAutoSkipEnabled((prev) => !prev)
  }, [])

  return {
    // Состояние
    autoSkipEnabled,
    settings,

    // Обработчики
    toggleAutoSkip,
    setAutoSkipEnabled,
  }
}

export type UseChapterAutoSkipReturn = ReturnType<typeof useChapterAutoSkip>
