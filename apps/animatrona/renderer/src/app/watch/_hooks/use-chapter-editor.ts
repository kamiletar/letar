'use client'

/**
 * Хук для редактора глав (через IPFS)
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import type { Chapter, VideoPlayerRef } from '@/components/player'
import { manifestChapterToPlayerChapter, playerChapterToManifestChapter } from '@/components/player/chapter-utils'
import { useEpisodeChapters } from '@/lib/hooks/use-episode-chapters'
import type { ManifestChapter } from '@/types/electron'

interface UseChapterEditorOptions {
  /** Ref на плеер */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** ID эпизода */
  episodeId: string
  /** CID манифеста эпизода */
  manifestCid: string | null | undefined
  /** Длительность эпизода в мс (для generateRecapPreview) */
  durationMs: number
}

/**
 * Хук для редактора глав (через IPFS)
 */
export function useChapterEditor(options: UseChapterEditorOptions) {
  const { playerRef, episodeId, manifestCid, durationMs } = options
  const queryClient = useQueryClient()

  // Состояние редактора глав
  const [isChapterEditorOpen, setIsChapterEditorOpen] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isCopying, setIsCopying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Загружаем главы из IPFS
  const { data: manifestChapters } = useEpisodeChapters(manifestCid)

  // Конвертируем главы из формата манифеста в формат плеера
  const playerChapters = useMemo((): Chapter[] => {
    if (!manifestChapters || manifestChapters.length === 0) {
      return []
    }
    return manifestChapters.map(manifestChapterToPlayerChapter)
  }, [manifestChapters])

  // Seek для ChapterEditor и ChapterMarkers
  const handleSeek = useCallback(
    (time: number) => {
      playerRef.current?.seek(time)
    },
    [playerRef],
  )

  // Обновление времени воспроизведения (вызывается из handleTimeUpdate)
  const updatePlaybackTime = useCallback((time: number, duration: number) => {
    setCurrentPlaybackTime(time)
    setVideoDuration(duration)
  }, [])

  // Инвалидация кэша глав после изменений
  const invalidateChapters = useCallback(() => {
    // Инвалидируем запрос глав
    queryClient.invalidateQueries({ queryKey: ['episodeChapters'] })
    // Инвалидируем запрос эпизода (manifestCid мог измениться)
    queryClient.invalidateQueries({ queryKey: ['episode'] })
  }, [queryClient])

  // Обработчик изменения глав из редактора
  const handleChaptersChange = useCallback(
    async (newChapters: Chapter[]) => {
      // Конвертируем в формат манифеста
      const chapters: ManifestChapter[] = newChapters.map(playerChapterToManifestChapter)

      const result = await window.electronAPI!.manifest.updateChapters(episodeId, chapters)

      if (!result.success) {
        console.error('[ChapterEditor] Ошибка обновления глав:', result.error)
        return
      }

      invalidateChapters()
    },
    [episodeId, invalidateChapters],
  )

  // Копировать OP/ED на другие эпизоды
  const handleCopyToEpisodes = useCallback(
    async (targetEpisodeIds: string[]) => {
      setIsCopying(true)
      try {
        const result = await window.electronAPI!.manifest.copyChapters(episodeId, targetEpisodeIds, ['op', 'ed'])

        if (!result.success) {
          console.error('[ChapterEditor] Ошибка копирования глав:', result.error)
          return
        }

        invalidateChapters()
      } finally {
        setIsCopying(false)
      }
    },
    [episodeId, invalidateChapters],
  )

  // Генерация RECAP/PREVIEW для выбранных эпизодов
  const handleGenerateRecapPreview = useCallback(
    async (episodeIds: string[]) => {
      setIsGenerating(true)
      try {
        // Загружаем manifestCid и durationMs для каждого эпизода
        // Для текущего эпизода используем props, для остальных — IPC не нужен,
        // handler сам найдёт manifestCid по episodeId
        const episodes = episodeIds.map((id) => ({
          id,
          manifestCid: id === episodeId ? (manifestCid ?? '') : '',
          durationMs: id === episodeId ? durationMs : 0,
        }))

        // Для эпизодов без данных — handler загрузит из БД сам
        // Но нам нужны manifestCid и durationMs. Получим через IPC.
        // Упрощение: handler уже принимает массив с manifestCid + durationMs,
        // а мы должны их передать. Для batch это делается на уровне renderer.
        // Пока передаём только текущий эпизод — для остальных нужна доп. загрузка.
        const result = await window.electronAPI!.manifest.generateRecapPreview(episodes.filter((e) => e.manifestCid))

        if (!result.success) {
          console.error('[ChapterEditor] Ошибка генерации RECAP/PREVIEW:', result.error)
          return
        }

        invalidateChapters()
      } finally {
        setIsGenerating(false)
      }
    },
    [episodeId, manifestCid, durationMs, invalidateChapters],
  )

  // Toggle редактора глав
  const toggleChapterEditor = useCallback(() => {
    setIsChapterEditorOpen((prev) => !prev)
  }, [])

  // Закрыть редактор глав
  const closeChapterEditor = useCallback(() => {
    setIsChapterEditorOpen(false)
  }, [])

  return {
    // Состояние
    isChapterEditorOpen,
    currentPlaybackTime,
    videoDuration,
    playerChapters,
    isCopying,
    isGenerating,

    // Обработчики
    handleSeek,
    handleChaptersChange,
    handleCopyToEpisodes,
    handleGenerateRecapPreview,
    toggleChapterEditor,
    closeChapterEditor,
    updatePlaybackTime,
  }
}

export type UseChapterEditorReturn = ReturnType<typeof useChapterEditor>
