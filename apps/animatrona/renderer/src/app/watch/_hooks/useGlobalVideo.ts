/**
 * useGlobalVideo — хук для интеграции страницы просмотра с глобальным видео store
 *
 * Управляет:
 * - Инициализацией глобального видео при загрузке эпизода
 * - Сворачиванием в mini-player при уходе со страницы
 * - Синхронизацией состояния воспроизведения
 */

import { useCallback, useEffect, useRef } from 'react'

import { type PlaybackMetadata, useGlobalVideoStore } from '@/components/global-video'
import type { VideoPlayerRef } from '@/components/player'
import { toPlayableUrl } from '@/lib/media-url'

interface UseGlobalVideoOptions {
  /** Ref на VideoPlayer */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** ID эпизода */
  episodeId: string
  /** Данные эпизода */
  episode: {
    id: string
    number: number
    name?: string | null
    animeId: string
    anime: {
      name: string
      poster?: { path?: string | null; cid?: string | null } | null
    }
    season?: { number: number } | null
  } | null
  /** URL источника видео */
  videoSrc: string | null
}

/**
 * Хук для интеграции с глобальным видео
 */
export function useGlobalVideo({ playerRef, episodeId, episode, videoSrc }: UseGlobalVideoOptions) {
  // Store actions и state
  const mode = useGlobalVideoStore((s) => s.mode)
  const storedEpisodeId = useGlobalVideoStore((s) => s.metadata?.episodeId)
  const initVideo = useGlobalVideoStore((s) => s.initVideo)
  const minimize = useGlobalVideoStore((s) => s.minimize)
  const setVideoElement = useGlobalVideoStore((s) => s.setVideoElement)
  const setMode = useGlobalVideoStore((s) => s.setMode)
  const updateTime = useGlobalVideoStore((s) => s.updateTime)
  const updateDuration = useGlobalVideoStore((s) => s.updateDuration)
  const updatePlayingState = useGlobalVideoStore((s) => s.updatePlayingState)

  // Ref для отслеживания инициализации
  const isInitializedRef = useRef(false)

  // Инициализация глобального видео при загрузке эпизода
  useEffect(() => {
    if (!episode || !videoSrc) {
      return
    }

    // Если возвращаемся к тому же эпизоду из mini-player — просто переключаем mode
    if (mode === 'mini' && storedEpisodeId === episodeId) {
      setMode('embedded')
      isInitializedRef.current = true
      return
    }

    // Формируем метаданные
    const metadata: PlaybackMetadata = {
      episodeId: episode.id,
      animeId: episode.animeId,
      animeName: episode.anime.name,
      episodeNumber: episode.number,
      episodeName: episode.name ?? undefined,
      seasonNumber: episode.season?.number,
      posterPath: toPlayableUrl({ cid: episode.anime.poster?.cid }) ?? null,
      returnPath: `/watch/${episode.id}`,
    }

    // Инициализируем
    initVideo(videoSrc, metadata)
    isInitializedRef.current = true
  }, [episode, videoSrc, episodeId, mode, storedEpisodeId, initVideo, setMode])

  // Сохраняем ссылку на video element после инициализации плеера
  useEffect(() => {
    if (!isInitializedRef.current) {
      return
    }

    // Даём время на инициализацию video element
    const timer = setTimeout(() => {
      const videoElement = playerRef.current?.getVideoElement()
      if (videoElement) {
        setVideoElement(videoElement)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [playerRef, setVideoElement, episode])

  // Обработчик обновления времени — синхронизируем с global store
  const handleTimeUpdate = useCallback(
    (time: number, duration: number) => {
      updateTime(time)
      updateDuration(duration)
    },
    [updateTime, updateDuration]
  )

  // Обработчик изменения состояния воспроизведения
  const handlePlayStateChange = useCallback(
    (isPlaying: boolean) => {
      updatePlayingState(isPlaying)
    },
    [updatePlayingState]
  )

  // Сворачивание в mini-player при уходе со страницы
  useEffect(() => {
    return () => {
      // При размонтировании — проверяем, нужно ли сворачивать в mini-player
      if (isInitializedRef.current) {
        // minimize() внутри проверит isPlaying и решит: mini или hidden
        minimize()
      }
    }
  }, [minimize])

  // Текущая позиция из store (для resume из mini-player)
  const currentTime = useGlobalVideoStore((s) => s.currentTime)
  const isResuming = mode === 'mini' && storedEpisodeId === episodeId

  return {
    /** Обработчик обновления времени (передать в VideoPlayer) */
    handleGlobalTimeUpdate: handleTimeUpdate,
    /** Обработчик изменения состояния воспроизведения */
    handleGlobalPlayStateChange: handlePlayStateChange,
    /** Текущий режим */
    mode,
    /** Видео уже инициализировано для этого эпизода */
    isResuming,
    /** Время для возобновления при возврате из mini-player */
    resumeTime: isResuming ? currentTime : null,
  }
}
