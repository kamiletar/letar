/**
 * useSubtitles — хук для управления субтитрами
 *
 * Поддерживает загрузку SRT/VTT субтитров
 */

import { srtToVtt } from '@letar/video-player-core'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { MutableRefObject } from 'react'

/**
 * Загрузка субтитров как VTT
 */
async function loadSubtitleAsVtt(url: string): Promise<string> {
  const response = await fetch(url)
  const text = await response.text()

  // Определяем формат по содержимому
  const isVtt = text.trimStart().startsWith('WEBVTT')
  const content = isVtt ? text : srtToVtt(text)

  // Создаём Blob URL
  const blob = new Blob([content], { type: 'text/vtt' })
  return URL.createObjectURL(blob)
}

export interface UseSubtitlesOptions {
  /** Ref на video элемент */
  videoRef: MutableRefObject<HTMLVideoElement | null>
  /** Видео загружено и готово */
  isVideoReady: boolean
  /** Callback для cue change */
  onCueChange?: (cues: VTTCue[]) => void
}

export interface UseSubtitlesReturn {
  /** Загрузить нативные субтитры (SRT/VTT) */
  loadNative: (url: string) => Promise<string | null>
  /** Показать субтитры */
  show: () => void
  /** Скрыть субтитры */
  hide: () => void
  /** URL активной дорожки */
  activeTrackUrl: string | null
  /** Идёт загрузка */
  isLoading: boolean
}

/**
 * Хук для управления субтитрами
 */
export function useSubtitles(options: UseSubtitlesOptions): UseSubtitlesReturn {
  const { videoRef, isVideoReady, onCueChange } = options

  const trackRef = useRef<HTMLTrackElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [activeTrackUrl, setActiveTrackUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  // Подписка на cuechange
  useEffect(() => {
    if (!isVideoReady || !onCueChange) {
      return
    }

    const video = videoRef.current
    const track = trackRef.current?.track
    if (!video || !track) {
      return
    }

    const handleCueChange = () => {
      const activeCues = track.activeCues
      if (!activeCues) {
        return
      }

      const cues: VTTCue[] = []
      for (let i = 0; i < activeCues.length; i++) {
        const cue = activeCues[i]
        if (cue instanceof VTTCue) {
          cues.push(cue)
        }
      }
      onCueChange(cues)
    }

    track.addEventListener('cuechange', handleCueChange)
    return () => {
      track.removeEventListener('cuechange', handleCueChange)
    }
  }, [videoRef, isVideoReady, onCueChange])

  const loadNative = useCallback(
    async (url: string): Promise<string | null> => {
      const video = videoRef.current
      if (!video) {
        return null
      }

      setIsLoading(true)

      try {
        // Очищаем предыдущий blob
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
        }

        // Удаляем старый track
        if (trackRef.current) {
          video.removeChild(trackRef.current)
          trackRef.current = null
        }

        // Загружаем и конвертируем в VTT
        const vttUrl = await loadSubtitleAsVtt(url)
        blobUrlRef.current = vttUrl

        // Создаём track элемент
        const track = document.createElement('track')
        track.kind = 'subtitles'
        track.src = vttUrl
        track.default = true

        video.appendChild(track)
        trackRef.current = track

        // Активируем track
        if (video.textTracks.length > 0) {
          video.textTracks[0].mode = 'showing'
        }

        setActiveTrackUrl(url)
        return vttUrl
      } catch (error) {
        console.error('[useSubtitles] Load error:', error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [videoRef],
  )

  const show = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'showing'
    }
  }, [videoRef])

  const hide = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'hidden'
    }
    setActiveTrackUrl(null)
  }, [videoRef])

  return {
    loadNative,
    show,
    hide,
    activeTrackUrl,
    isLoading,
  }
}
