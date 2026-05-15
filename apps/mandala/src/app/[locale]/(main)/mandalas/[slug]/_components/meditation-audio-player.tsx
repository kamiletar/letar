'use client'

import { useCallback, useEffect, useRef } from 'react'
import { MEDITATION_TRACKS } from '../_schemas/viewer-settings.schema'

/**
 * Длительность crossfade в мс
 */
const CROSSFADE_DURATION = 300

interface MeditationAudioPlayerProps {
  /** Включено ли воспроизведение */
  enabled: boolean
  /** ID текущего встроенного трека */
  trackId: string
  /** Blob URL кастомного трека пользователя (из OPFS) */
  customTrackBlobUrl?: string | null
  /** Громкость (0-100) */
  volume: number
  /** Callback для получения ref на audio элемент (для Web Audio API анализа) */
  onAudioRef?: (audio: HTMLAudioElement | null) => void
}

/**
 * Плавное уменьшение громкости (fade out)
 */
async function fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
  const startVolume = audio.volume
  const steps = 20
  const stepDuration = duration / steps
  const volumeStep = startVolume / steps

  for (let i = 0; i < steps; i++) {
    audio.volume = Math.max(0, startVolume - volumeStep * (i + 1))
    await new Promise((resolve) => setTimeout(resolve, stepDuration))
  }
  audio.volume = 0
}

/**
 * Плавное увеличение громкости (fade in)
 */
async function fadeIn(audio: HTMLAudioElement, targetVolume: number, duration: number): Promise<void> {
  const steps = 20
  const stepDuration = duration / steps
  const volumeStep = targetVolume / steps

  audio.volume = 0
  for (let i = 0; i < steps; i++) {
    audio.volume = Math.min(targetVolume, volumeStep * (i + 1))
    await new Promise((resolve) => setTimeout(resolve, stepDuration))
  }
  audio.volume = targetVolume
}

/**
 * Невидимый аудио-плеер для фоновой музыки медитации.
 * Управляется через props, автоматически зацикливает воспроизведение.
 */
export function MeditationAudioPlayer({
  enabled,
  trackId,
  customTrackBlobUrl,
  volume,
  onAudioRef,
}: MeditationAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Приоритет: кастомный трек > встроенный трек
  const builtinTrack = MEDITATION_TRACKS.find((t) => t.id === trackId)
  const trackUrl = customTrackBlobUrl ?? builtinTrack?.url ?? ''

  // Callback ref для передачи audio элемента родителю
  const setAudioRef = useCallback(
    (element: HTMLAudioElement | null) => {
      audioRef.current = element
      onAudioRef?.(element)
    },
    [onAudioRef]
  )

  // Обновление громкости
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Ref для отмены текущего crossfade при новом переключении
  const crossfadeAbortRef = useRef<AbortController | null>(null)
  // Ref для хранения предыдущего URL трека
  const prevTrackUrlRef = useRef<string>('')
  // Ref для целевой громкости (чтобы fadeIn знал к чему стремиться)
  const targetVolumeRef = useRef(volume / 100)

  useEffect(() => {
    targetVolumeRef.current = volume / 100
  }, [volume])

  // Управление воспроизведением с crossfade
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    // Отменяем предыдущий crossfade если есть
    crossfadeAbortRef.current?.abort()
    const abortController = new AbortController()
    crossfadeAbortRef.current = abortController

    const switchTrack = async () => {
      if (!enabled || !trackUrl) {
        // Останавливаем воспроизведение с fade out
        if (!audio.paused) {
          await fadeOut(audio, CROSSFADE_DURATION)
          audio.pause()
        }
        return
      }

      // Если URL изменился — делаем crossfade
      const urlChanged = prevTrackUrlRef.current && prevTrackUrlRef.current !== trackUrl

      if (urlChanged && !audio.paused) {
        // Fade out текущего трека
        await fadeOut(audio, CROSSFADE_DURATION)
        if (abortController.signal.aborted) {
          return
        }
      }

      // Если URL изменился — обновляем источник
      if (audio.src !== trackUrl) {
        audio.src = trackUrl
        audio.load()
        prevTrackUrlRef.current = trackUrl
      }

      // Запускаем воспроизведение
      try {
        audio.volume = urlChanged ? 0 : targetVolumeRef.current
        await audio.play()
        if (abortController.signal.aborted) {
          return
        }

        // Fade in если был crossfade
        if (urlChanged) {
          await fadeIn(audio, targetVolumeRef.current, CROSSFADE_DURATION)
        }
      } catch (err) {
        // Браузер может заблокировать автовоспроизведение
        console.warn('Не удалось запустить аудио:', err)
      }
    }

    switchTrack()

    return () => {
      abortController.abort()
    }
  }, [enabled, trackUrl])

  // Обработка завершения трека — зацикливание
  const handleEnded = useCallback(() => {
    if (audioRef.current && enabled) {
      audioRef.current.currentTime = 0
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- Ошибки воспроизведения игнорируем (браузер блокирует автозапуск)
      audioRef.current.play().catch(() => {})
    }
  }, [enabled])

  // Если трек не выбран — не рендерим ничего
  // (ни кастомного, ни встроенного кроме 'none')
  if (!trackUrl || (!customTrackBlobUrl && trackId === 'none')) {
    // Сбрасываем ref при размонтировании
    if (audioRef.current) {
      onAudioRef?.(null)
      audioRef.current = null
    }
    return null
  }

  return (
    <audio
      ref={setAudioRef}
      preload="auto"
      loop
      crossOrigin="anonymous"
      onEnded={handleEnded}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  )
}
