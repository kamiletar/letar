/**
 * useAudioSync — хук для синхронизации video + audio
 *
 * Использует AudioSyncManager из @letar/video-player-core
 */

import { useEffect, useRef } from 'react'

import type { MutableRefObject, RefObject } from 'react'

/** Порог синхронизации audio (секунды) */
const AUDIO_SYNC_THRESHOLD = 0.1

export interface UseAudioSyncOptions {
  /** Ref на video элемент */
  videoRef: MutableRefObject<HTMLVideoElement | null>
  /** Ref на audio элемент */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Используются раздельные аудиодорожки */
  usesSeparateAudio: boolean
  /** Видео загружено и готово — КРИТИЧНО для перезапуска хука */
  isVideoReady: boolean
  /** ID текущей аудиодорожки (для перезапуска при смене) */
  currentAudioTrackId?: string | null
}

/**
 * Хук для синхронизации video + audio в режиме раздельных дорожек
 */
export function useAudioSync(options: UseAudioSyncOptions): void {
  const { videoRef, audioRef, usesSeparateAudio, isVideoReady, currentAudioTrackId } = options

  const cleanupRef = useRef<(() => void) | null>(null)

  // Mute видео в режиме раздельных дорожек
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = usesSeparateAudio
    }
  }, [videoRef, usesSeparateAudio, isVideoReady])

  // Синхронизация video + audio
  useEffect(() => {
    // Ждём пока video будет готов
    if (!isVideoReady) {
      return
    }

    const video = videoRef.current
    const audio = audioRef.current

    if (!video || !audio || !usesSeparateAudio) {
      return
    }

    // Синхронизация времени
    const syncAudio = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > AUDIO_SYNC_THRESHOLD) {
        audio.currentTime = video.currentTime
      }
    }

    const handlePlay = () => {
      audio.play().catch((err) => {
        console.warn('[useAudioSync] Audio play failed:', err)
      })
    }

    const handlePause = () => {
      audio.pause()
    }

    const handleSeeked = () => {
      audio.currentTime = video.currentTime
    }

    const handleRateChange = () => {
      audio.playbackRate = video.playbackRate
    }

    const handleVolumeChange = () => {
      audio.volume = video.volume
    }

    // Начальная синхронизация
    audio.volume = video.volume
    audio.muted = false
    audio.playbackRate = video.playbackRate
    audio.currentTime = video.currentTime

    // Если видео уже играет — запустить аудио
    if (!video.paused) {
      audio.play().catch((err) => {
        console.warn('[useAudioSync] Initial audio play failed:', err)
      })
    }

    // Подключаем события
    video.addEventListener('timeupdate', syncAudio)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('ratechange', handleRateChange)
    video.addEventListener('volumechange', handleVolumeChange)

    const cleanup = () => {
      video.removeEventListener('timeupdate', syncAudio)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('volumechange', handleVolumeChange)
    }

    cleanupRef.current = cleanup

    return cleanup
  }, [videoRef, audioRef, usesSeparateAudio, currentAudioTrackId, isVideoReady])
}
