/**
 * usePlayerControls — хук для управления воспроизведением
 *
 * Инкапсулирует базовые функции управления плеером
 */

import { useCallback } from 'react'

import type { MutableRefObject, RefObject } from 'react'

/** Время перемотки по умолчанию (секунды) */
const DEFAULT_SKIP_TIME = 10

export interface UsePlayerControlsOptions {
  /** Ref на video элемент */
  videoRef: MutableRefObject<HTMLVideoElement | null>
  /** Ref на audio элемент */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Ref на контейнер (для fullscreen) */
  containerRef: RefObject<HTMLDivElement | null>
  /** Используются раздельные аудиодорожки */
  usesSeparateAudio: boolean
  /** Ref на usesSeparateAudio */
  usesSeparateAudioRef: MutableRefObject<boolean>
  /** Длительность видео */
  duration: number
  /** Установить состояние mute */
  setIsMuted: (v: boolean) => void
}

export interface UsePlayerControlsReturn {
  /** Переключить play/pause */
  togglePlay: () => void
  /** Перемотка к позиции (0-100%) */
  handleSeek: (value: number[]) => void
  /** Изменить громкость (0-100%) */
  handleVolumeChange: (value: number[]) => void
  /** Переключить mute */
  toggleMute: () => void
  /** Переключить fullscreen */
  toggleFullscreen: () => void
  /** Перемотка на seconds секунд */
  skipTime: (seconds?: number) => void
  /** Play */
  play: () => void
  /** Pause */
  pause: () => void
  /** Установить время */
  seek: (time: number) => void
  /** Установить громкость (0-1) */
  setVolume: (volume: number) => void
  /** Установить скорость воспроизведения */
  setPlaybackRate: (rate: number) => void
}

/**
 * Хук для управления воспроизведением
 */
export function usePlayerControls(options: UsePlayerControlsOptions): UsePlayerControlsReturn {
  const { videoRef, audioRef, containerRef, usesSeparateAudio, usesSeparateAudioRef, duration, setIsMuted } = options

  /**
   * `video.play()` возвращает промис, который отклоняется с `AbortError`, если сразу после
   * него вызвали `pause()` (двойной клик по кадру, быстрое нажатие Space). Это нормальное
   * поведение браузера, а не ошибка приложения — но без `catch` оно всплывает как
   * unhandled rejection в консоли.
   */
  const safePlay = useCallback((video: HTMLVideoElement) => {
    video.play().catch(() => {
      /* прерванный play — не ошибка */
    })
  }, [])

  const play = useCallback(() => {
    const video = videoRef.current
    if (video) {
      safePlay(video)
    }
  }, [videoRef, safePlay])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [videoRef])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (video.paused) {
      safePlay(video)
    } else {
      video.pause()
    }
  }, [videoRef, safePlay])

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video) {
        return
      }

      video.currentTime = Math.max(0, Math.min(time, duration))
    },
    [videoRef, duration]
  )

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!isFinite(duration)) {
        return
      }

      const newTime = (value[0] / 100) * duration
      seek(newTime)
    },
    [duration, seek]
  )

  const setVolume = useCallback(
    (volume: number) => {
      const video = videoRef.current
      const audio = audioRef.current
      const clampedVolume = Math.max(0, Math.min(1, volume))

      if (video) {
        video.volume = clampedVolume
      }

      if (usesSeparateAudioRef.current && audio) {
        audio.volume = clampedVolume
        audio.muted = clampedVolume === 0
        setIsMuted(clampedVolume === 0)
      } else if (video) {
        video.muted = clampedVolume === 0
      }
    },
    [videoRef, audioRef, usesSeparateAudioRef, setIsMuted]
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      setVolume(value[0] / 100)
    },
    [setVolume]
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    const audio = audioRef.current

    if (usesSeparateAudio && audio) {
      audio.muted = !audio.muted
      setIsMuted(audio.muted)
    } else if (video) {
      video.muted = !video.muted
    }
  }, [videoRef, audioRef, usesSeparateAudio, setIsMuted])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [containerRef])

  const skipTime = useCallback(
    (seconds: number = DEFAULT_SKIP_TIME) => {
      const video = videoRef.current
      if (!video) {
        return
      }

      video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration))
    },
    [videoRef, duration]
  )

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current
      const audio = audioRef.current

      if (video) {
        video.playbackRate = rate
      }
      if (usesSeparateAudioRef.current && audio) {
        audio.playbackRate = rate
      }
    },
    [videoRef, audioRef, usesSeparateAudioRef]
  )

  return {
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    skipTime,
    play,
    pause,
    seek,
    setVolume,
    setPlaybackRate,
  }
}
