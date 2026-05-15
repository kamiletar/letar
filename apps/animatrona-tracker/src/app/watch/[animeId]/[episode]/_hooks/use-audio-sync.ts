/**
 * Хук синхронизации внешних аудиодорожек
 *
 * Управляет: синхронизация отдельного audio элемента с video,
 * корректная обработка play/pause/seek/rate/volume,
 * определение autoplay block для аудио.
 */

import { type RefObject, useEffect, useRef, useState } from 'react'

interface UseAudioSyncOptions {
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** URL аудио (null если не нужен) */
  audioUrl: string | null
  /** Используется ли раздельная аудиодорожка */
  usesSeparateAudio: boolean
  /** Видео готово к воспроизведению */
  isVideoReady: boolean
  /** Индекс аудиодорожки (для пересоздания при смене) */
  audioTrackIndex: number
}

interface UseAudioSyncReturn {
  /** Ref на audio элемент */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Ref для проверки usesSeparateAudio в callbacks */
  usesSeparateAudioRef: RefObject<boolean>
  /** Заблокирован ли autoplay для аудио */
  isAudioBlocked: boolean
  /** Установить isAudioBlocked */
  setIsAudioBlocked: (v: boolean) => void
}

export function useAudioSync({
  videoRef,
  audioUrl,
  usesSeparateAudio,
  isVideoReady,
  audioTrackIndex,
}: UseAudioSyncOptions): UseAudioSyncReturn {
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(false)
  const [isAudioBlocked, setIsAudioBlocked] = useState(false)

  // Обновляем ref для использования в callbacks
  usesSeparateAudioRef.current = usesSeparateAudio

  // Синхронизация аудио с видео
  useEffect(() => {
    if (!isVideoReady) {
      return
    }
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !audio || !usesSeparateAudio) {
      return
    }
    video.muted = true
    let isMounted = true

    const tryAudioPlay = (context: string) => {
      audio
        .play()
        .then(() => setIsAudioBlocked(false))
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            setIsAudioBlocked(true)
          }
          console.warn(`[Player] audio ${context}:`, err.message)
        })
    }

    const syncAudio = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.1) {
        audio.currentTime = video.currentTime
      }
    }

    const handlePlay = () => tryAudioPlay('play')
    const handlePause = () => audio.pause()
    const handleSeeked = () => {
      audio.currentTime = video.currentTime
    }
    const handleRateChange = () => {
      audio.playbackRate = video.playbackRate
    }
    const handleVolumeChange = () => {
      audio.volume = video.volume
    }
    const handleCanPlayThrough = () => {
      if (!video.paused && audio.paused) {
        tryAudioPlay('retry canplaythrough')
      }
    }

    const startAudioSync = () => {
      if (!isMounted) {
        return
      }
      audio.volume = video.volume
      audio.muted = false
      audio.playbackRate = video.playbackRate
      audio.currentTime = video.currentTime
      if (!video.paused) {
        tryAudioPlay('начальный play')
      }

      video.addEventListener('timeupdate', syncAudio)
      video.addEventListener('play', handlePlay)
      video.addEventListener('pause', handlePause)
      video.addEventListener('seeked', handleSeeked)
      video.addEventListener('ratechange', handleRateChange)
      video.addEventListener('volumechange', handleVolumeChange)
      audio.addEventListener('canplaythrough', handleCanPlayThrough)
    }

    // Ждём первый РЕАЛЬНЫЙ кадр видео
    const videoEl = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
    if (videoEl.requestVideoFrameCallback) {
      videoEl.requestVideoFrameCallback(() => {
        if (isMounted) {
          startAudioSync()
        }
      })
    } else {
      const onTimeUpdate = () => {
        if (video.currentTime > 0) {
          video.removeEventListener('timeupdate', onTimeUpdate)
          if (isMounted) {
            startAudioSync()
          }
        }
      }
      video.addEventListener('timeupdate', onTimeUpdate)
    }

    return () => {
      isMounted = false
      video.removeEventListener('timeupdate', syncAudio)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('volumechange', handleVolumeChange)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
  }, [isVideoReady, usesSeparateAudio, audioTrackIndex])

  // Unmute видео если не раздельные дорожки
  useEffect(() => {
    const video = videoRef.current
    if (video && !usesSeparateAudio) {
      video.muted = false
    }
  }, [usesSeparateAudio])

  return {
    audioRef,
    usesSeparateAudioRef,
    isAudioBlocked,
    setIsAudioBlocked,
  }
}
