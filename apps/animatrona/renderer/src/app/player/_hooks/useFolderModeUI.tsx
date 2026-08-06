/**
 * useFolderModeUI — хук для UI логики папочного режима
 *
 * Содержит:
 * - Выбор аудио/субтитр дорожек (embedded + external)
 * - Синхронизацию внешнего аудио с видео
 * - TrackSelector элемент для плеера
 * - Обработчики навигации между эпизодами
 */

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type TrackInfo, TrackSelector, type VideoPlayerRef } from '@/components/player'
import { toMediaUrl } from '@/lib/media-url'

import { useExternalAudio } from './useExternalAudio'
import type { useFolderPlayer } from './useFolderPlayer'
import type { useWatchProgress } from './useWatchProgress'

interface UseFolderModeUIOptions {
  /** Данные из useFolderPlayer */
  folderPlayer: ReturnType<typeof useFolderPlayer>
  /** Данные из useWatchProgress */
  watchProgress: ReturnType<typeof useWatchProgress>
  /** Ref на плеер */
  playerRef: RefObject<VideoPlayerRef | null>
  /** Текущий путь к видео */
  currentVideoPath: string | null
}

interface UseFolderModeUIReturn {
  // Список дорожек
  allAudioTracks: TrackInfo[]
  allSubtitleTracks: TrackInfo[]

  // Выбранные дорожки
  selectedAudioId: string | null
  setSelectedAudioId: (id: string | null) => void
  selectedSubtitleIndex: number | null
  setSelectedSubtitleIndex: (index: number | null) => void

  // Субтитры для плеера
  currentSubtitlePath: string | undefined
  currentSubtitleFonts: string[] | undefined

  // Флаг использования внешнего аудио (для VideoPlayer.externalAudioManaged)
  usesExternalAudio: boolean

  // TrackSelector элемент
  trackSelectorElement: React.ReactNode

  // Обработчики навигации
  handleSelectEpisode: (index: number) => void
  handleSelectBonus: (index: number) => void
  handlePrevEpisode: () => void
  handleNextEpisode: () => void

  // Ref на video элемент (для useExternalAudio)
  videoElementRef: RefObject<HTMLVideoElement | null>
}

/**
 * Хук для UI логики папочного режима плеера
 */
export function useFolderModeUI(options: UseFolderModeUIOptions): UseFolderModeUIReturn {
  const { folderPlayer, watchProgress, playerRef, currentVideoPath } = options

  // === State ===
  // Формат ID: 'embedded:{index}' или 'external:{index}'
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(0)

  // === Refs ===
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  // === Вычисляемые списки дорожек ===

  /** Объединённый список аудиодорожек (встроенные + внешние) */
  const allAudioTracks: TrackInfo[] = useMemo(() => {
    if (!folderPlayer.isFolderMode) {
      return []
    }
    const tracks: TrackInfo[] = []

    // Встроенные аудиодорожки из MKV (prefix: 'embedded:')
    folderPlayer.embeddedTracks?.audio.forEach((t, i) => {
      tracks.push({
        id: `embedded:${t.index}`,
        label: t.title || `Audio ${i + 1}`,
        language: t.language,
        codec: t.codec,
        isDefault: t.isDefault,
        isForced: t.isForced,
        // 'local' помечает дорожку как доступную для воспроизведения (без IPFS)
        transcodedCid: 'local',
      })
    })

    // Внешние аудиодорожки (prefix: 'external:')
    folderPlayer.externalTracks.audio.forEach((t, i) => {
      tracks.push({
        id: `external:${i}`,
        label: t.title || t.filePath.split(/[/\\]/).pop() || 'Аудио',
        language: t.language,
        dubGroup: t.groupName,
        transcodedCid: 'local',
      })
    })

    return tracks
  }, [folderPlayer.isFolderMode, folderPlayer.embeddedTracks?.audio, folderPlayer.externalTracks.audio])

  /** Объединённый список субтитров (встроенные + внешние) */
  const allSubtitleTracks: TrackInfo[] = useMemo(() => {
    if (!folderPlayer.isFolderMode) {
      return []
    }
    const tracks: TrackInfo[] = []

    // Встроенные субтитры из MKV (prefix: 'embedded:')
    // Пропускаем PGS субтитры — они bitmap и не поддерживаются
    folderPlayer.embeddedTracks?.subtitles
      .filter((t) => t.codec !== 'hdmv_pgs_subtitle')
      .forEach((t, i) => {
        tracks.push({
          id: `embedded:${t.index}`,
          label: t.title || `Subtitle ${i + 1}`,
          language: t.language,
          codec: t.codec,
          isDefault: t.isDefault,
          isForced: t.isForced,
          subtitleType: t.subtitleType,
          transcodedCid: 'local',
        })
      })

    // Внешние субтитры (prefix: 'external:')
    folderPlayer.externalTracks.subtitles.forEach((t, i) => {
      tracks.push({
        id: `external:${i}`,
        label: t.title || t.filePath.split(/[/\\]/).pop() || 'Субтитры',
        language: t.language,
        // Тип определён тем же классификатором, что и для встроенных дорожек
        subtitleType: t.subtitleType,
        transcodedCid: 'local',
      })
    })

    return tracks
  }, [folderPlayer.isFolderMode, folderPlayer.embeddedTracks?.subtitles, folderPlayer.externalTracks.subtitles])

  // === Синхронизация внешнего аудио ===

  /** Определение пути к внешнему аудио для синхронизации */
  const externalAudioPath = useMemo(() => {
    if (!selectedAudioId?.startsWith('external:')) {
      return null
    }
    const index = parseInt(selectedAudioId.split(':')[1], 10)
    return folderPlayer.externalTracks.audio[index]?.filePath ?? null
  }, [selectedAudioId, folderPlayer.externalTracks.audio])

  /**
   * Обновление ref на video элемент когда плеер готов
   * useExternalAudio использует polling для ожидания video элемента
   */
  useEffect(() => {
    const updateRef = () => {
      const videoEl = playerRef.current?.getVideoElement?.() ?? null
      if (videoEl !== videoElementRef.current) {
        videoElementRef.current = videoEl
      }
    }

    // Обновляем сразу, через 200мс и через 500мс (для dynamic import)
    updateRef()
    const timer1 = setTimeout(updateRef, 200)
    const timer2 = setTimeout(updateRef, 500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [playerRef, currentVideoPath])

  // Синхронизация внешнего аудио с видео
  useExternalAudio({
    videoRef: videoElementRef,
    audioPath: externalAudioPath,
  })

  // === Текущий субтитр ===

  /** Текущий выбранный субтитр (только внешние пока поддерживаются) */
  const currentSubtitleTrack = selectedSubtitleIndex !== null
    ? folderPlayer.externalTracks.subtitles[selectedSubtitleIndex]
    : null

  // Конвертируем пути в media:// URL (file:// заблокирован Electron)
  const currentSubtitlePath = currentSubtitleTrack?.filePath
    ? (toMediaUrl(currentSubtitleTrack.filePath) ?? undefined)
    : undefined
  const currentSubtitleFonts = currentSubtitleTrack?.matchedFonts.map((f) => toMediaUrl(f.path) ?? f.path)

  // === TrackSelector элемент ===

  /** TrackSelector для headerRight плеера */
  const trackSelectorElement = useMemo(() => {
    // Показываем если есть хотя бы одна дорожка
    if (!folderPlayer.isFolderMode || (allAudioTracks.length === 0 && allSubtitleTracks.length === 0)) {
      return undefined
    }

    // Формируем полный ID субтитра для TrackSelector (он сравнивает с track.id)
    const selectedSubtitleId = selectedSubtitleIndex !== null ? `external:${selectedSubtitleIndex}` : null

    return (
      <TrackSelector
        audioTracks={allAudioTracks}
        subtitleTracks={allSubtitleTracks}
        selectedAudioTrack={selectedAudioId ?? undefined}
        selectedSubtitleTrack={selectedSubtitleId}
        onAudioTrackChange={(trackId) => {
          setSelectedAudioId(trackId === null ? null : String(trackId))
        }}
        onSubtitleTrackChange={(trackId) => {
          // Пока поддерживаем только внешние субтитры
          // TODO: Добавить поддержку встроенных через извлечение
          if (trackId === null) {
            setSelectedSubtitleIndex(null)
          } else {
            const id = String(trackId)
            if (id.startsWith('external:')) {
              const index = parseInt(id.split(':')[1], 10)
              setSelectedSubtitleIndex(index)
            } else {
              // Встроенные субтитры пока не поддерживаются
              console.warn('[useFolderModeUI] Встроенные субтитры пока не поддерживаются')
            }
          }
        }}
      />
    )
  }, [folderPlayer.isFolderMode, allAudioTracks, allSubtitleTracks, selectedAudioId, selectedSubtitleIndex])

  // === Обработчики навигации ===

  /** Сохранить прогресс перед переключением */
  const saveProgressBeforeSwitch = useCallback(() => {
    if (currentVideoPath) {
      const video = playerRef.current
      if (video) {
        // @ts-expect-error — VideoPlayerRef не экспортирует currentTime/duration напрямую
        watchProgress.saveProgressNow(currentVideoPath, video.currentTime ?? 0, video.duration ?? 0)
      }
    }
  }, [currentVideoPath, playerRef, watchProgress])

  /** Сбросить выбор дорожек */
  const resetTrackSelection = useCallback(() => {
    setSelectedAudioId(null)
    setSelectedSubtitleIndex(0)
  }, [])

  /** Переход к эпизоду */
  const handleSelectEpisode = useCallback(
    (index: number) => {
      saveProgressBeforeSwitch()
      resetTrackSelection()
      folderPlayer.goToEpisode(index)
    },
    [folderPlayer, saveProgressBeforeSwitch, resetTrackSelection],
  )

  /** Переход к бонусу */
  const handleSelectBonus = useCallback(
    (index: number) => {
      saveProgressBeforeSwitch()
      resetTrackSelection()
      folderPlayer.goToBonus(index)
    },
    [folderPlayer, saveProgressBeforeSwitch, resetTrackSelection],
  )

  /** Предыдущий эпизод */
  const handlePrevEpisode = useCallback(() => {
    saveProgressBeforeSwitch()
    folderPlayer.goPrev()
  }, [folderPlayer, saveProgressBeforeSwitch])

  /** Следующий эпизод */
  const handleNextEpisode = useCallback(() => {
    saveProgressBeforeSwitch()
    folderPlayer.goNext()
  }, [folderPlayer, saveProgressBeforeSwitch])

  return {
    // Списки дорожек
    allAudioTracks,
    allSubtitleTracks,

    // Выбранные дорожки
    selectedAudioId,
    setSelectedAudioId,
    selectedSubtitleIndex,
    setSelectedSubtitleIndex,

    // Субтитры для плеера
    currentSubtitlePath,
    currentSubtitleFonts,

    // Флаг внешнего аудио (для VideoPlayer.externalAudioManaged)
    usesExternalAudio: !!externalAudioPath,

    // TrackSelector элемент
    trackSelectorElement,

    // Обработчики навигации
    handleSelectEpisode,
    handleSelectBonus,
    handlePrevEpisode,
    handleNextEpisode,

    // Ref на video элемент
    videoElementRef,
  }
}
