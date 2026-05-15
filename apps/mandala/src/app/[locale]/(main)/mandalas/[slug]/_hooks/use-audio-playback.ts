'use client'

/**
 * Хук для управления воспроизведением аудио.
 * Поддерживает плейлист, shuffle, режимы повтора и seek.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MEDITATION_TRACKS, type RepeatMode } from '../_constants/viewer-constants'
import type { CustomAudioTrack } from '../_schemas/viewer-settings.schema'
import { useEventListeners } from './use-event-listener'

/** Элемент плейлиста */
export interface PlaylistItem {
  type: 'builtin' | 'custom'
  id: string
  name: string
}

interface UseAudioPlaybackOptions {
  /** Ref на аудио элемент */
  audioElement: HTMLAudioElement | null
  /** ID текущего встроенного трека */
  audioTrack: string
  /** ID кастомного трека */
  customAudioTrackId: string | null
  /** Список кастомных треков */
  customTracks: CustomAudioTrack[]
  /** Режим повтора */
  repeatMode: RepeatMode
  /** Включён ли shuffle */
  isShuffled: boolean
  /** Callback изменения настроек */
  onSettingsChange: (settings: {
    audioTrack?: string
    customAudioTrackId?: string | null
    repeatMode?: RepeatMode
    isShuffled?: boolean
  }) => void
}

interface UseAudioPlaybackResult {
  /** Воспроизводится ли аудио */
  isPlaying: boolean
  /** Прогресс воспроизведения (0-1) */
  audioProgress: number
  /** Текущее время в секундах */
  currentTime: number
  /** Общая длительность в секундах */
  duration: number
  /** Название текущего трека */
  currentTrackName: string
  /** Текущий индекс в плейлисте */
  currentPlaylistIndex: number
  /** Общее количество треков */
  playlistLength: number
  /** Весь плейлист */
  playlist: PlaylistItem[]
  /** Play/pause переключение */
  handlePlayPause: () => void
  /** Следующий трек */
  handleNextTrack: () => void
  /** Предыдущий трек */
  handlePrevTrack: () => void
  /** Перемотка к позиции (0-1) */
  handleSeek: (progress: number) => void
  /** Переключение на трек по индексу */
  switchToTrack: (index: number) => void
  /** Переключение режима повтора */
  toggleRepeatMode: () => void
  /** Переключение shuffle */
  toggleShuffle: () => void
  /** Изменение порядка треков */
  handleReorder: (newPlaylist: PlaylistItem[]) => void
}

/**
 * Генерирует случайный порядок индексов (Fisher-Yates shuffle)
 */
function generateShuffledOrder(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)

  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  // Убедимся, что текущий трек первый в shuffled порядке
  const currentInShuffled = indices.indexOf(currentIndex)
  if (currentInShuffled !== 0) {
    ;[indices[0], indices[currentInShuffled]] = [indices[currentInShuffled], indices[0]]
  }

  return indices
}

/**
 * Управляет воспроизведением аудио, навигацией по трекам.
 */
export function useAudioPlayback({
  audioElement,
  audioTrack,
  customAudioTrackId,
  customTracks,
  repeatMode,
  isShuffled,
  onSettingsChange,
}: UseAudioPlaybackOptions): UseAudioPlaybackResult {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // Кастомный порядок треков (null = порядок по умолчанию)
  const [customPlaylistOrder, setCustomPlaylistOrder] = useState<PlaylistItem[] | null>(null)

  // Порядок воспроизведения при shuffle (сохраняем между ререндерами)
  const shuffledOrderRef = useRef<number[]>([])

  // Базовый плейлист: встроенные + кастомные треки
  const basePlaylist = useMemo(() => {
    const builtinItems: PlaylistItem[] = MEDITATION_TRACKS.filter((t) => t.id !== 'none').map((t) => ({
      type: 'builtin' as const,
      id: t.id,
      name: t.name,
    }))
    const customItems: PlaylistItem[] = customTracks.map((t) => ({
      type: 'custom' as const,
      id: t.id,
      name: t.name,
    }))
    return [...builtinItems, ...customItems]
  }, [customTracks])

  // Финальный плейлист с учётом кастомного порядка
  const playlist = useMemo(() => {
    if (customPlaylistOrder) {
      // Фильтруем только те треки, которые всё ещё существуют в basePlaylist
      return customPlaylistOrder.filter((item) =>
        basePlaylist.some((base) => base.type === item.type && base.id === item.id)
      )
    }
    return basePlaylist
  }, [basePlaylist, customPlaylistOrder])

  // Текущий индекс в плейлисте
  const currentPlaylistIndex = useMemo(() => {
    if (customAudioTrackId) {
      return playlist.findIndex((t) => t.type === 'custom' && t.id === customAudioTrackId)
    }
    return playlist.findIndex((t) => t.type === 'builtin' && t.id === audioTrack)
  }, [playlist, audioTrack, customAudioTrackId])

  // Название текущего трека для mini-player
  const currentTrackName = useMemo(() => {
    if (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length) {
      return playlist[currentPlaylistIndex].name
    }
    return 'Без музыки'
  }, [playlist, currentPlaylistIndex])

  // Генерируем shuffled order при включении shuffle или смене плейлиста
  useEffect(() => {
    if (isShuffled && playlist.length > 0) {
      shuffledOrderRef.current = generateShuffledOrder(playlist.length, Math.max(0, currentPlaylistIndex))
    } else {
      shuffledOrderRef.current = playlist.map((_, i) => i)
    }
  }, [isShuffled, playlist, currentPlaylistIndex])

  // Переключение на трек по индексу
  const switchToTrack = useCallback(
    (index: number) => {
      const track = playlist[index]
      if (!track) {
        return
      }
      if (track.type === 'custom') {
        onSettingsChange({ audioTrack: 'none', customAudioTrackId: track.id })
      } else {
        onSettingsChange({ audioTrack: track.id, customAudioTrackId: null })
      }
    },
    [playlist, onSettingsChange]
  )

  // Получить следующий индекс с учётом shuffle
  const getNextIndex = useCallback(() => {
    if (playlist.length === 0) {
      return -1
    }

    const order = shuffledOrderRef.current
    const currentInOrder = order.indexOf(currentPlaylistIndex)

    if (currentInOrder === -1) {
      return order[0]
    }

    const nextInOrder = currentInOrder + 1
    if (nextInOrder >= order.length) {
      return repeatMode === 'all' ? order[0] : -1
    }
    return order[nextInOrder]
  }, [playlist.length, currentPlaylistIndex, repeatMode])

  // Получить предыдущий индекс с учётом shuffle
  const getPrevIndex = useCallback(() => {
    if (playlist.length === 0) {
      return -1
    }

    const order = shuffledOrderRef.current
    const currentInOrder = order.indexOf(currentPlaylistIndex)

    if (currentInOrder === -1) {
      return order[order.length - 1]
    }

    const prevInOrder = currentInOrder - 1
    if (prevInOrder < 0) {
      return repeatMode === 'all' ? order[order.length - 1] : -1
    }
    return order[prevInOrder]
  }, [playlist.length, currentPlaylistIndex, repeatMode])

  // Обработчик окончания трека
  const handleEnded = useCallback(() => {
    if (!audioElement) {
      return
    }

    // Repeat one — перематываем текущий трек
    if (repeatMode === 'one') {
      audioElement.currentTime = 0
      audioElement.play()
      return
    }

    // Получаем следующий индекс
    const nextIdx = getNextIndex()

    if (nextIdx === -1) {
      // Repeat off и достигли конца — останавливаемся
      setIsPlaying(false)
    } else {
      switchToTrack(nextIdx)
    }
  }, [audioElement, repeatMode, getNextIndex, switchToTrack])

  // Отслеживание состояния воспроизведения с useEventListeners
  useEventListeners(audioElement, {
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    timeupdate: () => {
      if (audioElement && audioElement.duration > 0) {
        setAudioProgress(audioElement.currentTime / audioElement.duration)
        setCurrentTime(audioElement.currentTime)
      }
    },
    durationchange: () => setDuration(audioElement?.duration || 0),
    ended: handleEnded,
  })

  // Инициализируем duration при монтировании
  useEffect(() => {
    if (audioElement?.duration) {
      setDuration(audioElement.duration)
    }
  }, [audioElement])

  // Play/pause переключение
  const handlePlayPause = useCallback(() => {
    if (!audioElement) {
      return
    }
    if (audioElement.paused) {
      audioElement.play()
    } else {
      audioElement.pause()
    }
  }, [audioElement])

  // Следующий трек
  const handleNextTrack = useCallback(() => {
    const nextIdx = getNextIndex()
    if (nextIdx !== -1) {
      switchToTrack(nextIdx)
    }
  }, [getNextIndex, switchToTrack])

  // Предыдущий трек
  const handlePrevTrack = useCallback(() => {
    // Если воспроизведение > 3 сек — перемотать в начало текущего трека
    if (audioElement && audioElement.currentTime > 3) {
      audioElement.currentTime = 0
      return
    }

    const prevIdx = getPrevIndex()
    if (prevIdx !== -1) {
      switchToTrack(prevIdx)
    }
  }, [audioElement, getPrevIndex, switchToTrack])

  // Перемотка к позиции (0-1)
  const handleSeek = useCallback(
    (progress: number) => {
      if (!audioElement || !duration) {
        return
      }
      const clampedProgress = Math.max(0, Math.min(1, progress))
      audioElement.currentTime = clampedProgress * duration
    },
    [audioElement, duration]
  )

  // Переключение режима повтора (off -> one -> all -> off)
  const toggleRepeatMode = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'one', 'all']
    const currentIdx = modes.indexOf(repeatMode)
    const nextIdx = (currentIdx + 1) % modes.length
    onSettingsChange({ repeatMode: modes[nextIdx] })
  }, [repeatMode, onSettingsChange])

  // Переключение shuffle
  const toggleShuffle = useCallback(() => {
    onSettingsChange({ isShuffled: !isShuffled })
  }, [isShuffled, onSettingsChange])

  // Изменение порядка треков (drag-and-drop)
  const handleReorder = useCallback((newPlaylist: PlaylistItem[]) => {
    setCustomPlaylistOrder(newPlaylist)
  }, [])

  return {
    isPlaying,
    audioProgress,
    currentTime,
    duration,
    currentTrackName,
    currentPlaylistIndex,
    playlistLength: playlist.length,
    playlist,
    handlePlayPause,
    handleNextTrack,
    handlePrevTrack,
    handleSeek,
    switchToTrack,
    toggleRepeatMode,
    toggleShuffle,
    handleReorder,
  }
}
