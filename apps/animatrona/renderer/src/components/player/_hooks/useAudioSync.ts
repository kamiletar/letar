/**
 * useAudioSync — хук для синхронизации video + audio
 *
 * Используется в режиме раздельных аудиодорожек:
 * - Синхронизирует время воспроизведения
 * - Синхронизирует play/pause
 * - Синхронизирует громкость и скорость
 *
 * ВАЖНО: isVideoReady — обязательный параметр!
 * Поскольку video element создаётся программно в useShakaPlayer,
 * videoRef.current будет null при первом рендере.
 * isVideoReady сигнализирует когда video готов.
 */

import { useEffect } from 'react'

import type { MutableRefObject, RefObject } from 'react'

import { AUDIO_SYNC_THRESHOLD } from '../constants'
import type { AudioTrackInfo } from '../types'

export interface UseAudioSyncOptions {
  /** Ref на video элемент */
  videoRef: MutableRefObject<HTMLVideoElement | null>
  /** Ref на audio элемент */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Используются раздельные аудиодорожки */
  usesSeparateAudio: boolean
  /** Текущая аудиодорожка */
  currentAudioTrack: AudioTrackInfo | null
  /** Видео загружено и готово — КРИТИЧНО для перезапуска хука */
  isVideoReady: boolean
}

/**
 * Хук для синхронизации video + audio в режиме раздельных дорожек
 */
export function useAudioSync(options: UseAudioSyncOptions): void {
  const { videoRef, audioRef, usesSeparateAudio, currentAudioTrack, isVideoReady } = options

  // Mute видео в режиме раздельных дорожек
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = usesSeparateAudio
    }
  }, [videoRef, usesSeparateAudio, isVideoReady]) // isVideoReady в deps!

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

    /**
     * Корректируем рассинхронизацию — если расхождение > threshold, синхронизируем
     */
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
      // НЕ синхронизируем muted — видео заглушено специально,
      // а аудио должно играть (isMuted контролируется отдельно)
    }

    // Начальная синхронизация
    audio.volume = video.volume
    // audio.muted контролируется через isMuted state, не через video.muted
    audio.muted = false
    audio.playbackRate = video.playbackRate
    audio.currentTime = video.currentTime

    // Если видео уже играет — запустить аудио сразу
    if (!video.paused) {
      audio.play().catch((err) => {
        console.warn('[useAudioSync] Initial audio play failed:', err)
      })
    }

    video.addEventListener('timeupdate', syncAudio)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('ratechange', handleRateChange)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', syncAudio)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [videoRef, audioRef, usesSeparateAudio, currentAudioTrack, isVideoReady]) // isVideoReady в deps!
}
