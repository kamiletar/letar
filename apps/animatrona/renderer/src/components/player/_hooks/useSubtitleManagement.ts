/**
 * useSubtitleManagement — хук для управления субтитрами
 *
 * Инкапсулирует:
 * - Загрузку SRT и конвертацию в VTT
 * - Управление TextTrack (hidden mode для cuechange)
 * - Очистку blob URL при размонтировании
 */

import { useEffect, useState } from 'react'

import type { RefObject } from 'react'

import { loadSubtitleAsVtt } from '../srt-to-vtt'
import type { SubtitleFormat } from '../types'

export interface UseSubtitleManagementOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  subtitlePath: string | null | undefined
  subtitleFormat: SubtitleFormat
}

export interface UseSubtitleManagementReturn {
  /** VTT URL для нативных субтитров (blob URL) */
  vttUrl: string | null
}

/**
 * Хук для управления субтитрами
 */
export function useSubtitleManagement(options: UseSubtitleManagementOptions): UseSubtitleManagementReturn {
  const { videoRef, subtitlePath, subtitleFormat } = options

  const [vttUrl, setVttUrl] = useState<string | null>(null)

  // Загрузка субтитров (конвертация SRT → VTT)
  useEffect(() => {
    let currentVttUrl: string | null = null

    // Загружаем только если это native формат (SRT/VTT)
    if (subtitlePath && subtitleFormat === 'native') {
      loadSubtitleAsVtt(subtitlePath)
        .then((url) => {
          if (url) {
            currentVttUrl = url
            setVttUrl(url)
            console.warn('[useSubtitleManagement] Subtitles loaded:', url)

            // Скрываем нативный track (будет работать в hidden режиме для cuechange)
            const video = videoRef.current
            if (video && video.textTracks.length > 0) {
              video.textTracks[0].mode = 'hidden'
            }
          }
        })
        .catch((err) => {
          console.error('[useSubtitleManagement] Failed to load subtitles:', err)
        })
    } else {
      setVttUrl(null)
    }

    return () => {
      if (currentVttUrl) {
        URL.revokeObjectURL(currentVttUrl)
      }
    }
  }, [videoRef, subtitlePath, subtitleFormat])

  // Скрываем нативный track (используем кастомный оверлей)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !vttUrl || video.textTracks.length === 0) {
      return
    }

    // Ждём немного пока track загрузится
    const timer = setTimeout(() => {
      if (video.textTracks.length > 0) {
        // hidden — track работает, но не отображается (нужен для cuechange событий)
        video.textTracks[0].mode = 'hidden'
        console.warn('[useSubtitleManagement] Track loaded (hidden mode for custom overlay)')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [videoRef, vttUrl])

  return {
    vttUrl,
  }
}
