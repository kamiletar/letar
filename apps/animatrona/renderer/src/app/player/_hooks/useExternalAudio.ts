/**
 * Хук для синхронизации внешнего аудиофайла с видео
 * Создаёт отдельный <audio> элемент и синхронизирует его с video
 */

import { type RefObject, useEffect, useRef } from 'react'

/** Порог рассинхронизации в секундах */
const SYNC_THRESHOLD = 0.15

interface UseExternalAudioOptions {
  /** Ref к video элементу */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Путь к внешнему аудиофайлу (null = использовать звук из видео) */
  audioPath: string | null
}

/**
 * Хук для воспроизведения внешнего аудио синхронно с видео
 *
 * При указании audioPath:
 * - Создаёт скрытый <audio> элемент
 * - Mute'ит оригинальное аудио в видео
 * - Синхронизирует play/pause/seek/rate/volume
 */
export function useExternalAudio({ videoRef, audioPath }: UseExternalAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isActiveRef = useRef(false)
  // Ref для хранения предыдущего пути — для немедленной остановки при смене
  const prevAudioPathRef = useRef<string | null>(null)

  // === НЕМЕДЛЕННАЯ остановка при смене audioPath (ДО useEffect cleanup) ===
  // Это предотвращает воспроизведение двух дорожек одновременно
  if (prevAudioPathRef.current !== audioPath) {
    // Немедленно останавливаем предыдущий audio (синхронно, до любых асинхронных операций)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    prevAudioPathRef.current = audioPath
  }

  useEffect(() => {
    // Без внешнего аудио — просто убедимся что видео не заглушено
    if (!audioPath) {
      // Очистка предыдущего аудио если было (уже остановлено выше, но очищаем ref)
      if (audioRef.current) {
        audioRef.current = null
      }
      // Восстановить звук видео
      const video = videoRef.current
      if (video && isActiveRef.current) {
        video.muted = false
        isActiveRef.current = false
      }
      return
    }

    // === Настройка синхронизации ===
    let audio: HTMLAudioElement | null = null
    let video: HTMLVideoElement | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const setupSync = () => {
      video = videoRef.current
      if (!video) {
        return false
      }

      // Создать audio элемент
      const normalizedPath = audioPath.replace(/\\/g, '/')
      audio = new Audio(`media://${normalizedPath}`)
      audioRef.current = audio

      // Mute видео
      video.muted = true
      isActiveRef.current = true

      // === Обработчики событий ===

      const handlePlay = () => {
        audio?.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('[useExternalAudio] play error:', err)
          }
        })
      }

      const handlePause = () => {
        audio?.pause()
      }

      const handleSeeked = () => {
        if (audio && video) {
          audio.currentTime = video.currentTime
        }
      }

      const handleRateChange = () => {
        if (audio && video) {
          audio.playbackRate = video.playbackRate
        }
      }

      const handleVolumeChange = () => {
        if (audio && video) {
          audio.volume = video.volume
        }
      }

      // Периодическая коррекция рассинхронизации (вместо timeupdate)
      const syncInterval = setInterval(() => {
        if (!audio || !video || audio.readyState < 2) {
          return
        }
        const diff = audio.currentTime - video.currentTime
        if (Math.abs(diff) > SYNC_THRESHOLD) {
          audio.currentTime = video.currentTime
        }
      }, 500)

      // Подписка на события видео
      video.addEventListener('play', handlePlay)
      video.addEventListener('pause', handlePause)
      video.addEventListener('seeked', handleSeeked)
      video.addEventListener('ratechange', handleRateChange)
      video.addEventListener('volumechange', handleVolumeChange)

      // Начальная синхронизация
      audio.currentTime = video.currentTime
      audio.volume = video.volume
      audio.playbackRate = video.playbackRate

      // Если видео уже играет — запустить аудио
      if (!video.paused) {
        audio.play().catch(console.warn)
      }

      // Сохраняем cleanup функцию
      const cleanup = () => {
        clearInterval(syncInterval)

        if (video) {
          video.removeEventListener('play', handlePlay)
          video.removeEventListener('pause', handlePause)
          video.removeEventListener('seeked', handleSeeked)
          video.removeEventListener('ratechange', handleRateChange)
          video.removeEventListener('volumechange', handleVolumeChange)
          video.muted = false
        }

        if (audio) {
          audio.pause()
          audio.src = ''
        }

        isActiveRef.current = false
      }

      // Возвращаем cleanup через замыкание
      return cleanup
    }

    // Пытаемся настроить сразу
    let cleanupFn = setupSync()

    if (!cleanupFn) {
      // Video ещё не готов — polling каждые 100мс (максимум 50 попыток = 5 сек)
      let attempts = 0
      const maxAttempts = 50
      pollInterval = setInterval(() => {
        attempts++
        cleanupFn = setupSync()
        if (cleanupFn && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        } else if (attempts >= maxAttempts && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }, 100)
    }

    // Cleanup при размонтировании или смене audioPath
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      if (cleanupFn && typeof cleanupFn === 'function') {
        cleanupFn()
      }
    }
  }, [audioPath, videoRef])

  return audioRef
}
