'use client'

/**
 * Хук для управления дорожками плеера (аудио и субтитры)
 */

import { useCallback, useMemo, useState } from 'react'

import type { AudioTrackInfo, VideoPlayerRef } from '@/components/player'
import type { TrackInfo } from '@/components/player/TrackSelector'
import type { TrackPreference } from '@/generated/prisma'
import {
  useDeleteAudioTrack,
  useDeleteSubtitleTrack,
  useUpdateAnime,
  useUpdateAudioTrack,
  useUpdateSubtitleTrack,
  useUpsertWatchProgress,
} from '@/lib/hooks'
import { getFontUrl } from '@/lib/media-url'
import { checkIsRussianAudio, selectAudioTrack, selectSubtitleTrack } from '@/lib/track-auto-select'

import type { EpisodeWithTracks, SubtitleTrackWithFonts } from './types'

interface UsePlayerTracksOptions {
  /** Ref на плеер */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** Данные эпизода */
  episode: EpisodeWithTracks | null | undefined
  /** Предпочтение выбора дорожек из настроек */
  trackPreference?: TrackPreference | null
}

/** Состояние редактирования дорожки */
interface EditingTrack {
  type: 'audio' | 'subtitle'
  id: string
  title?: string
  language?: string
}

/**
 * Хук для управления дорожками плеера
 */
export function usePlayerTracks(options: UsePlayerTracksOptions) {
  const { playerRef, episode, trackPreference = 'AUTO' } = options

  // Состояние выбранных дорожек
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null)
  const [selectedSubtitleTrackId, setSelectedSubtitleTrackId] = useState<string | null>(null)

  // Состояние диалога редактирования дорожки
  const [editingTrack, setEditingTrack] = useState<EditingTrack | null>(null)

  // Мутации для дорожек
  const { mutate: updateAudioTrack } = useUpdateAudioTrack()
  const { mutate: deleteAudioTrack } = useDeleteAudioTrack()
  const { mutate: updateSubtitleTrack } = useUpdateSubtitleTrack()
  const { mutate: deleteSubtitleTrack } = useDeleteSubtitleTrack()

  // Мутация для сохранения выбранных дорожек в Anime (между эпизодами)
  const { mutate: updateAnime } = useUpdateAnime()

  // Мутация для сохранения прогресса
  const { mutate: upsertProgress } = useUpsertWatchProgress()

  // Преобразуем аудиодорожки для VideoPlayer
  // Для библиотеки передаём только transcodedCid (IPFS-only подход)
  // Локальная переменная через optional chaining — способ выровнять фактически читаемый путь
  // с зависимостью useMemo (react/preserve-manual-memoization: иначе React Compiler не может
  // сопоставить ручную мемоизацию с выводимой и пропускает оптимизацию компонента)
  const audioTracksForPlayer = useMemo((): AudioTrackInfo[] => {
    const audioTracks = episode?.audioTracks
    if (!audioTracks) {
      return []
    }

    return audioTracks.map((track) => ({
      id: track.id,
      language: track.language,
      title: track.title || undefined,
      codec: track.codec,
      channels: track.channels,
      isDefault: track.isDefault,
      transcodedCid: track.transcodedCid || undefined,
    }))
  }, [episode?.audioTracks])

  // Преобразуем дорожки для TrackSelector
  const audioTracksForSelector = useMemo((): TrackInfo[] => {
    const audioTracks = episode?.audioTracks
    if (!audioTracks) {
      return []
    }

    return audioTracks.map((track) => ({
      id: track.id,
      // Не используем сырой код языка как fallback — пусть TrackSelector использует getLanguageName()
      label: track.title || undefined,
      language: track.language,
      codec: track.codec,
      isDefault: track.isDefault,
      dubGroup: track.dubGroup || undefined,
      transcodedCid: track.transcodedCid || undefined,
    }))
  }, [episode?.audioTracks])

  const subtitleTracksForSelector = useMemo((): TrackInfo[] => {
    const subtitleTracks = episode?.subtitleTracks
    if (!subtitleTracks) {
      return []
    }

    return subtitleTracks.map((track) => ({
      id: track.id,
      // Не используем сырой код языка как fallback — пусть TrackSelector использует getLanguageName()
      label: track.title || undefined,
      language: track.language,
      codec: track.format,
      isDefault: track.isDefault,
      dubGroup: track.dubGroup || undefined,
    }))
  }, [episode?.subtitleTracks])

  // Текущий выбранный ID аудио — для библиотеки проверяем только IPFS CID
  // Зависимость — весь `episode`, а не `episode?.audioTracks`: React Compiler инферит
  // зависимость на этом уровне (react/preserve-manual-memoization), более широкая
  // зависимость безопасна — лишний пересчёт при смене эпизода, не потеря обновлений
  const currentAudioId = useMemo(() => {
    if (selectedAudioTrackId) {
      return selectedAudioTrackId
    }
    // Автовыбор по trackPreference из настроек
    if (episode?.audioTracks && trackPreference) {
      const autoSelected = selectAudioTrack(episode.audioTracks, trackPreference)
      if (autoSelected) {
        return autoSelected.id
      }
    }
    // Fallback — первая готовая дорожка (мигрированная в IPFS)
    const readyTrack = episode?.audioTracks?.find((t) => t.transcodedCid)
    return readyTrack?.id || episode?.audioTracks?.[0]?.id || null
  }, [selectedAudioTrackId, episode, trackPreference])

  // Текущая выбранная дорожка субтитров
  // Локальные переменные через optional chaining — выравнивают фактически читаемые пути
  // с зависимостями useMemo (react/preserve-manual-memoization)
  const currentSubtitleTrack = useMemo((): SubtitleTrackWithFonts | null => {
    const subtitleTracks = episode?.subtitleTracks
    const audioTracks = episode?.audioTracks
    if (!subtitleTracks || !audioTracks) {
      return null
    }

    // Если есть явно выбранный ID — используем его
    if (selectedSubtitleTrackId) {
      return subtitleTracks.find((t) => t.id === selectedSubtitleTrackId) ?? null
    }

    // Автовыбор по trackPreference из настроек
    if (!trackPreference) {
      return subtitleTracks[0] ?? null
    }

    // Проверяем является ли текущая аудио дорожка русской
    const currentAudioTrack = audioTracks.find((t) => t.id === currentAudioId)
    const isRussianAudio = checkIsRussianAudio(currentAudioTrack)

    // Находим автовыбор и приводим к нужному типу
    const autoSelected = selectSubtitleTrack(subtitleTracks, trackPreference, isRussianAudio)
    if (!autoSelected) {
      return null
    }

    // Ищем дорожку с fonts
    return subtitleTracks.find((t) => t.id === autoSelected.id) ?? null
  }, [episode?.subtitleTracks, episode?.audioTracks, selectedSubtitleTrackId, trackPreference, currentAudioId])

  // URL'ы к шрифтам для текущих субтитров (для ASS)
  // Приоритет: IPFS CID > локальный путь
  // Зависимость — весь `currentSubtitleTrack` (см. комментарий у currentAudioId выше)
  const currentSubtitleFonts = useMemo(() => {
    if (!currentSubtitleTrack?.fonts) {
      return []
    }
    return currentSubtitleTrack.fonts.map((f) => getFontUrl(f)).filter((url): url is string => url !== null)
  }, [currentSubtitleTrack])

  // Обработчик изменения аудио дорожки
  const handleAudioTrackChange = useCallback(
    (trackId: string | number) => {
      const newTrackId = String(trackId)
      setSelectedAudioTrackId(newTrackId)

      if (!episode) {
        return
      }

      // Находим выбранную дорожку для получения dubGroup
      const selectedTrack = episode.audioTracks.find((t) => t.id === newTrackId)

      // Сохраняем выбор дорожки в WatchProgress (для этого эпизода)
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime()
        upsertProgress({
          where: {
            animeId_episodeId: {
              animeId: episode.animeId,
              episodeId: episode.id,
            },
          },
          create: {
            animeId: episode.animeId,
            episodeId: episode.id,
            currentTime,
            selectedAudioTrackId: newTrackId,
            selectedSubtitleTrackId,
            lastWatchedAt: new Date(),
          },
          update: {
            selectedAudioTrackId: newTrackId,
            lastWatchedAt: new Date(),
          },
        })
      }

      // Сохраняем dubGroup и язык в Anime (для всех эпизодов)
      // Язык используется как fallback если dubGroup не найден в другом эпизоде
      updateAnime({
        where: { id: episode.animeId },
        data: {
          lastSelectedAudioDubGroup: selectedTrack?.dubGroup || null,
          lastSelectedAudioLanguage: selectedTrack?.language || null,
        },
      })
    },
    [episode, selectedSubtitleTrackId, upsertProgress, updateAnime, playerRef],
  )

  // Обработчик изменения дорожки субтитров
  const handleSubtitleTrackChange = useCallback(
    (trackId: string | number | null) => {
      const newTrackId = trackId ? String(trackId) : null
      setSelectedSubtitleTrackId(newTrackId)

      if (!episode) {
        return
      }

      // Находим выбранную дорожку для получения dubGroup
      const selectedTrack = newTrackId ? episode.subtitleTracks.find((t) => t.id === newTrackId) : null

      // Сохраняем выбор субтитров в WatchProgress (для этого эпизода)
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime()
        upsertProgress({
          where: {
            animeId_episodeId: {
              animeId: episode.animeId,
              episodeId: episode.id,
            },
          },
          create: {
            animeId: episode.animeId,
            episodeId: episode.id,
            currentTime,
            selectedAudioTrackId,
            selectedSubtitleTrackId: newTrackId,
            lastWatchedAt: new Date(),
          },
          update: {
            selectedSubtitleTrackId: newTrackId,
            lastWatchedAt: new Date(),
          },
        })
      }

      // Сохраняем dubGroup и язык в Anime (для всех эпизодов)
      // Язык используется как fallback если dubGroup не найден в другом эпизоде
      // Если выбрано "Выключено", сбрасываем dubGroup и язык
      updateAnime({
        where: { id: episode.animeId },
        data: {
          lastSelectedSubtitleDubGroup: selectedTrack?.dubGroup || null,
          lastSelectedSubtitleLanguage: selectedTrack?.language || null,
        },
      })
    },
    [episode, selectedAudioTrackId, upsertProgress, updateAnime, playerRef],
  )

  // Открыть редактор аудио дорожки
  const handleEditAudioTrack = useCallback(
    (trackId: string | number) => {
      const track = episode?.audioTracks?.find((t) => t.id === String(trackId))
      if (track) {
        setEditingTrack({
          type: 'audio',
          id: track.id,
          title: track.title || undefined,
          language: track.language,
        })
      }
    },
    [episode?.audioTracks],
  )

  // Открыть редактор дорожки субтитров
  const handleEditSubtitleTrack = useCallback(
    (trackId: string | number) => {
      const track = episode?.subtitleTracks?.find((t) => t.id === String(trackId))
      if (track) {
        setEditingTrack({
          type: 'subtitle',
          id: track.id,
          title: track.title || undefined,
          language: track.language,
        })
      }
    },
    [episode?.subtitleTracks],
  )

  // Сохранить изменения дорожки
  const handleSaveTrack = useCallback(
    (trackId: string | number, newTitle: string) => {
      if (editingTrack?.type === 'audio') {
        updateAudioTrack({
          where: { id: String(trackId) },
          data: { title: newTitle || null },
        })
      } else if (editingTrack?.type === 'subtitle') {
        updateSubtitleTrack({
          where: { id: String(trackId) },
          data: { title: newTitle || null },
        })
      }
    },
    [editingTrack?.type, updateAudioTrack, updateSubtitleTrack],
  )

  // Удалить дорожку
  const handleDeleteTrack = useCallback(
    (trackId: string | number) => {
      const id = String(trackId)

      if (editingTrack?.type === 'audio') {
        if (selectedAudioTrackId === id) {
          setSelectedAudioTrackId(null)
        }
        deleteAudioTrack({ where: { id } })
      } else if (editingTrack?.type === 'subtitle') {
        if (selectedSubtitleTrackId === id) {
          setSelectedSubtitleTrackId(null)
        }
        deleteSubtitleTrack({ where: { id } })
      }
    },
    [editingTrack?.type, selectedAudioTrackId, selectedSubtitleTrackId, deleteAudioTrack, deleteSubtitleTrack],
  )

  // Закрыть редактор дорожки
  const closeTrackEditor = useCallback(() => {
    setEditingTrack(null)
  }, [])

  return {
    // Состояние
    selectedAudioTrackId,
    selectedSubtitleTrackId,
    editingTrack,

    // Сеттеры для внешнего управления
    setSelectedAudioTrackId,
    setSelectedSubtitleTrackId,

    // Данные для плеера
    audioTracksForPlayer,
    audioTracksForSelector,
    subtitleTracksForSelector,
    currentAudioId,
    currentSubtitleTrack,
    currentSubtitleFonts,

    // Обработчики
    handleAudioTrackChange,
    handleSubtitleTrackChange,
    handleEditAudioTrack,
    handleEditSubtitleTrack,
    handleSaveTrack,
    handleDeleteTrack,
    closeTrackEditor,
  }
}

export type UsePlayerTracksReturn = ReturnType<typeof usePlayerTracks>
