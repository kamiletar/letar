/**
 * usePlayerState — хук для управления состоянием плеера
 *
 * Инкапсулирует:
 * - Основное состояние (isPlaying, currentTime, duration, volume, isMuted, isFullscreen, isLoading)
 * - Вычисляемые значения (usesSeparateAudio, currentAudioTrack, subtitleFormat)
 */

import { useMemo, useRef, useState } from 'react'

import type { AudioTrackInfo, PlaybackSpeed, PlayerState, SubtitleFormat } from '../types'

export interface UsePlayerStateOptions {
  audioTracks?: AudioTrackInfo[]
  currentAudioTrackId?: string
  subtitlePath?: string | null
  /** Формат субтитров (ass, srt, vtt) — если не указан, определяется по расширению URL */
  subtitleFormatOverride?: 'ass' | 'ssa' | 'srt' | 'vtt' | null
}

export interface UsePlayerStateReturn {
  /** Основное состояние плеера */
  state: PlayerState
  /** Сеттеры состояния */
  setIsPlaying: (v: boolean) => void
  setCurrentTime: (v: number) => void
  setDuration: (v: number) => void
  setVolume: (v: number) => void
  setIsMuted: (v: boolean) => void
  setIsFullscreen: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setShowControlsOverlay: (v: boolean) => void
  /** Скорость воспроизведения */
  playbackSpeed: PlaybackSpeed
  /** Изменить скорость воспроизведения */
  setPlaybackSpeed: (v: PlaybackSpeed) => void
  /** Формат субтитров (ass, native, null) */
  subtitleFormat: SubtitleFormat
  /** Используется ли режим раздельных аудиодорожек */
  usesSeparateAudio: boolean
  /** Ref для usesSeparateAudio (для event handlers) */
  usesSeparateAudioRef: React.MutableRefObject<boolean>
  /** Текущая аудиодорожка */
  currentAudioTrack: AudioTrackInfo | null
}

/**
 * Хук для управления состоянием плеера
 */
export function usePlayerState(options: UsePlayerStateOptions): UsePlayerStateReturn {
  const { audioTracks, currentAudioTrackId, subtitlePath, subtitleFormatOverride } = options

  // Основное состояние
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showControlsOverlay, setShowControlsOverlay] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)

  // Ref для использования в event handlers
  const usesSeparateAudioRef = useRef(false)

  // Определяем формат субтитров для выбора метода отображения
  // Приоритет: явно переданный формат > определение по расширению URL
  const subtitleFormat = useMemo<SubtitleFormat>(() => {
    if (!subtitlePath) {
      return null
    }

    // Если формат явно указан — используем его
    if (subtitleFormatOverride) {
      if (subtitleFormatOverride === 'ass' || subtitleFormatOverride === 'ssa') {
        return 'ass'
      }
      if (subtitleFormatOverride === 'srt' || subtitleFormatOverride === 'vtt') {
        return 'native'
      }
    }

    // Fallback: определение по расширению URL (для локальных файлов)
    const ext = subtitlePath.split('.').pop()?.toLowerCase()
    if (ext === 'ass' || ext === 'ssa') {
      return 'ass'
    }
    if (ext === 'srt' || ext === 'vtt') {
      return 'native'
    }
    return null
  }, [subtitlePath, subtitleFormatOverride])

  // Режим раздельных дорожек — когда есть готовые к воспроизведению дорожки в IPFS
  // Для библиотеки (/watch) проверяем только transcodedCid — IPFS-only подход
  const usesSeparateAudio = useMemo(() => {
    if (!audioTracks || audioTracks.length === 0) {
      return false
    }
    return audioTracks.some((t) => t.transcodedCid)
  }, [audioTracks])

  // Храним в ref для использования в event handlers
  usesSeparateAudioRef.current = usesSeparateAudio

  // Текущая аудиодорожка — для библиотеки проверяем только IPFS CID
  const currentAudioTrack = useMemo(() => {
    if (!audioTracks || audioTracks.length === 0) {
      return null
    }

    // Ищем по ID если указан и есть CID
    if (currentAudioTrackId) {
      const found = audioTracks.find((t) => t.id === currentAudioTrackId)
      if (found?.transcodedCid) {
        return found
      }
    }

    // Иначе — первая доступная (готовая к воспроизведению в IPFS)
    return audioTracks.find((t) => t.transcodedCid) ?? null
  }, [audioTracks, currentAudioTrackId])

  // Собираем state объект
  const state: PlayerState = {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    isLoading,
    showControlsOverlay,
  }

  return {
    state,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    setIsLoading,
    setShowControlsOverlay,
    playbackSpeed,
    setPlaybackSpeed,
    subtitleFormat,
    usesSeparateAudio,
    usesSeparateAudioRef,
    currentAudioTrack,
  }
}
