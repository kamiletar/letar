'use client'
/* eslint-disable no-console */

/**
 * Хук для управления прогрессом просмотра
 * Сохраняет и восстанавливает позицию воспроизведения
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { updateAnimeWatchStatus } from '@/app/_actions/watch-progress.action'
import type { VideoPlayerRef } from '@/components/player'
import { useFindUniqueWatchProgress, useUpsertWatchProgress } from '@/lib/hooks'

import type { EpisodeWithTracks } from './types'
import { SAVE_INTERVAL } from './types'

interface UseWatchProgressOptions {
  /** Ref на плеер */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** Данные эпизода */
  episode: EpisodeWithTracks | null | undefined
  /** ID эпизода */
  episodeId: string
  /** ID выбранной аудио дорожки */
  selectedAudioTrackId: string | null
  /** ID выбранных субтитров */
  selectedSubtitleTrackId: string | null
  /** Callback при установке выбранной аудио дорожки */
  onSetSelectedAudioTrackId: (id: string | null) => void
  /** Callback при установке выбранных субтитров */
  onSetSelectedSubtitleTrackId: (id: string | null) => void
  /** Callback при готовности данных прогресса (для автовыбора дорожек) */
  onProgressReady?: (
    progress: {
      selectedAudioTrackId: string | null
      selectedSubtitleTrackId: string | null
    } | null
  ) => void
}

/**
 * Хук для управления прогрессом просмотра
 */
export function useWatchProgress(options: UseWatchProgressOptions) {
  const {
    playerRef,
    episode,
    episodeId,
    selectedAudioTrackId,
    selectedSubtitleTrackId,
    onSetSelectedAudioTrackId,
    onSetSelectedSubtitleTrackId,
    onProgressReady,
  } = options

  // Состояние прогресса
  const [initialTime, setInitialTime] = useState<number>(0)
  const [progressLoaded, setProgressLoaded] = useState(false)

  // Overlay для выбора "Продолжить" или "Сначала"
  const [showResumeOverlay, setShowResumeOverlay] = useState(false)
  const [savedResumeTime, setSavedResumeTime] = useState<number>(0)

  // Ref для отслеживания последнего сохранённого времени воспроизведения
  const lastSavedTimeRef = useRef<number>(0)
  // Ref для отслеживания времени последнего сохранения (throttle)
  const lastSaveTimestampRef = useRef<number>(0)
  // Ref для предотвращения повторной отметки completed при авто-детекте конца
  const completedMarkedRef = useRef(false)

  // Загружаем сохранённый прогресс
  const { data: watchProgressData, isLoading: progressQueryLoading } = useFindUniqueWatchProgress(
    {
      where: {
        animeId_episodeId: {
          animeId: episode?.animeId || '',
          episodeId: episodeId,
        },
      },
    },
    { enabled: !!episode?.animeId }
  )

  // Мутация для сохранения прогресса
  const { mutate: upsertProgress } = useUpsertWatchProgress()

  // Применяем сохранённый прогресс при загрузке
  useEffect(() => {
    // Ждём пока загрузятся и episode, и watchProgressData
    // progressQueryLoading предотвращает race condition когда episode загружается раньше
    if (!episode || progressLoaded || progressQueryLoading) {
      return
    }

    // Показываем overlay если есть прогресс > 10 секунд и не досмотрено
    if (watchProgressData && !watchProgressData.completed && watchProgressData.currentTime > 10) {
      setSavedResumeTime(watchProgressData.currentTime)
      setShowResumeOverlay(true)
      // НЕ устанавливаем initialTime здесь — ждём выбора пользователя
    }

    // Приоритет выбора дорожек:
    // 1. Сохранённые в WatchProgress для этого эпизода (по ID)
    // 2. Последние выбранные для всего аниме (по dubGroup)
    // 3. Fallback по языку (если dubGroup не найден в эпизоде)
    // 4. Автовыбор по trackPreference из настроек
    // 5. Первая готовая дорожка

    let audioTrackSelected = false
    let subtitleTrackSelected = false

    // Аудио
    if (watchProgressData?.selectedAudioTrackId) {
      // Проверяем что дорожка существует в текущем эпизоде
      const trackExists = episode.audioTracks.some((t) => t.id === watchProgressData.selectedAudioTrackId)
      if (trackExists) {
        onSetSelectedAudioTrackId(watchProgressData.selectedAudioTrackId)
        audioTrackSelected = true
      }
    }

    if (!audioTrackSelected && episode.anime.lastSelectedAudioDubGroup) {
      // Ищем дорожку с таким же dubGroup в текущем эпизоде
      const trackByDubGroup = episode.audioTracks.find((t) => t.dubGroup === episode.anime.lastSelectedAudioDubGroup)
      if (trackByDubGroup) {
        onSetSelectedAudioTrackId(trackByDubGroup.id)
        audioTrackSelected = true
      }
    }

    // Fallback по языку если dubGroup не найден
    if (!audioTrackSelected && episode.anime.lastSelectedAudioLanguage) {
      const trackByLanguage = episode.audioTracks.find((t) => t.language === episode.anime.lastSelectedAudioLanguage)
      if (trackByLanguage) {
        onSetSelectedAudioTrackId(trackByLanguage.id)
        audioTrackSelected = true
      }
    }

    // Субтитры
    if (watchProgressData?.selectedSubtitleTrackId) {
      const trackExists = episode.subtitleTracks.some((t) => t.id === watchProgressData.selectedSubtitleTrackId)
      if (trackExists) {
        onSetSelectedSubtitleTrackId(watchProgressData.selectedSubtitleTrackId)
        subtitleTrackSelected = true
      }
    }

    if (!subtitleTrackSelected && episode.anime.lastSelectedSubtitleDubGroup) {
      const trackByDubGroup = episode.subtitleTracks.find(
        (t) => t.dubGroup === episode.anime.lastSelectedSubtitleDubGroup
      )
      if (trackByDubGroup) {
        onSetSelectedSubtitleTrackId(trackByDubGroup.id)
        subtitleTrackSelected = true
      }
    }

    // Fallback по языку если dubGroup не найден
    if (!subtitleTrackSelected && episode.anime.lastSelectedSubtitleLanguage) {
      const trackByLanguage = episode.subtitleTracks.find(
        (t) => t.language === episode.anime.lastSelectedSubtitleLanguage
      )
      if (trackByLanguage) {
        onSetSelectedSubtitleTrackId(trackByLanguage.id)
        subtitleTrackSelected = true
      }
    }

    // Оповещаем о готовности прогресса
    onProgressReady?.(
      watchProgressData
        ? {
            selectedAudioTrackId: audioTrackSelected ? watchProgressData.selectedAudioTrackId : null,
            selectedSubtitleTrackId: subtitleTrackSelected ? watchProgressData.selectedSubtitleTrackId : null,
          }
        : null
    )

    setProgressLoaded(true)
  }, [
    episode,
    watchProgressData,
    progressLoaded,
    progressQueryLoading,
    onSetSelectedAudioTrackId,
    onSetSelectedSubtitleTrackId,
    onProgressReady,
  ])

  // Автоустановка статуса WATCHING при начале просмотра
  useEffect(() => {
    if (!episode || !progressLoaded) {
      return
    }

    // Если это первый просмотр эпизода этого аниме — устанавливаем статус WATCHING
    // Проверяем: нет сохранённого прогресса или прогресс < 30 сек
    const isFirstWatch = !watchProgressData || watchProgressData.currentTime < 30

    if (isFirstWatch) {
      updateAnimeWatchStatus(episode.animeId, 'WATCHING').catch((err) =>
        console.error('[WatchPage] Ошибка установки статуса WATCHING:', err)
      )
    }
  }, [episode?.animeId, progressLoaded, watchProgressData])

  // Сброс флага автоотметки при смене эпизода
  useEffect(() => {
    completedMarkedRef.current = false
  }, [episodeId])

  // Обработчик "Продолжить" из ResumeOverlay
  const handleResumeFromSaved = useCallback(() => {
    setInitialTime(savedResumeTime)
    setShowResumeOverlay(false)
    // Seek к сохранённой позиции если видео уже загружено
    setTimeout(() => {
      playerRef.current?.seek(savedResumeTime)
    }, 100)
  }, [savedResumeTime, playerRef])

  // Обработчик "Сначала" из ResumeOverlay
  const handleStartFromBeginning = useCallback(() => {
    setInitialTime(0)
    setShowResumeOverlay(false)
    // Seek к началу если видео уже загружено
    setTimeout(() => {
      playerRef.current?.seek(0)
    }, 100)
  }, [playerRef])

  // Функция сохранения прогресса
  const saveProgress = useCallback(
    (currentTime: number, completed = false) => {
      if (!episode) {
        console.warn('[saveProgress] No episode, skipping')
        return
      }

      // Защита от Infinity/NaN — Prisma не принимает нефинитные числа
      if (!Number.isFinite(currentTime)) {
        return
      }

      // Не сохраняем если время не изменилось существенно (> 1 сек)
      if (Math.abs(currentTime - lastSavedTimeRef.current) < 1 && !completed) {
        return
      }

      console.log('[saveProgress] Saving progress:', {
        episodeId: episode.id,
        currentTime,
        completed,
        selectedAudioTrackId,
        selectedSubtitleTrackId,
      })

      lastSavedTimeRef.current = currentTime

      // Сохраняем в БД
      upsertProgress({
        where: {
          animeId_episodeId: {
            animeId: episode.animeId,
            episodeId: episode.id,
          },
        },
        create: {
          animeId: episode.animeId,
          episodeId: episode.id,
          currentTime,
          completed,
          selectedAudioTrackId,
          selectedSubtitleTrackId,
          lastWatchedAt: new Date(),
        },
        update: {
          currentTime,
          completed,
          selectedAudioTrackId,
          selectedSubtitleTrackId,
          lastWatchedAt: new Date(),
        },
      })

      // Параллельно отправляем прогресс на трекер (fire-and-forget).
      // Main process сам резолвит trackerAnimeId из Anime.trackerAnimeId — если
      // аниме не опубликовано на трекер, push пропускается silently.
      const duration = playerRef.current?.getDuration?.() ?? 0
      if (duration > 0 && Number.isFinite(duration)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tracker preload API
        const tracker = (window.electronAPI as any)?.tracker
        if (tracker?.pushWatchProgress) {
          tracker
            .pushWatchProgress({
              animeId: episode.animeId,
              episodeNumber: episode.number,
              currentTime,
              duration,
              completed,
            })
            .catch(() => {
              // Ошибки push не критичны — sync service обработает через offline queue
            })
        }
      }
    },
    [episode, selectedAudioTrackId, selectedSubtitleTrackId, upsertProgress, playerRef]
  )

  // Обработчик обновления времени видео (throttle вместо debounce!)
  const handleTimeUpdate = useCallback(
    (time: number, duration: number) => {
      const now = Date.now()

      // Автоотметка: если до конца ≤ 120 сек — помечаем серию просмотренной
      if (duration > 0 && duration - time <= 120 && !completedMarkedRef.current) {
        completedMarkedRef.current = true
        saveProgress(time, true)
        return
      }

      // Throttle: сохраняем не чаще чем раз в SAVE_INTERVAL
      if (now - lastSaveTimestampRef.current >= SAVE_INTERVAL) {
        lastSaveTimestampRef.current = now
        saveProgress(time)
      }
    },
    [saveProgress]
  )

  // Сохранение при размонтировании (переход на другую страницу/эпизод)
  useEffect(() => {
    return () => {
      // Сохраняем текущую позицию при уходе со страницы
      if (playerRef.current && episode) {
        const currentTime = playerRef.current.getCurrentTime()
        if (currentTime > 0) {
          saveProgress(currentTime)
        }
      }
    }
  }, [episode, saveProgress, playerRef])

  return {
    // Состояние
    initialTime,
    progressLoaded,
    showResumeOverlay,
    savedResumeTime,
    watchProgressData,

    // Обработчики
    handleResumeFromSaved,
    handleStartFromBeginning,
    handleTimeUpdate,
    saveProgress,
  }
}

export type UseWatchProgressReturn = ReturnType<typeof useWatchProgress>
