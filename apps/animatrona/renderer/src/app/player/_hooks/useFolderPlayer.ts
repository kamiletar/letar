/**
 * Хук для папочного режима плеера
 * Сканирует папку с сериалом и управляет навигацией между эпизодами
 */

import { useCallback, useState } from 'react'

import { getCachedProbe } from '@/lib/cache'
import { parseEpisodeInfo } from '@/lib/parse-filename'
import type { ExternalAudioScanResult, ExternalSubtitleScanResult } from '@/types/electron'

import type { EmbeddedTracksInfo, ExternalTracksInfo, FolderEpisode, FolderPlayerState } from '../types'
import { isBonusVideo } from '../types'

/** Начальное состояние */
const initialState: FolderPlayerState = {
  mode: 'idle',
  folderPath: null,
  folderName: null,
  episodes: [],
  bonusVideos: [],
  currentIndex: -1,
  isCurrentBonus: false,
  currentBonusIndex: -1,
  externalTracks: {
    audio: [],
    subtitles: [],
    subtitleScanResult: null,
    audioScanResult: null,
  },
  embeddedTracks: null,
  isScanning: false,
  isLoadingTracks: false,
  error: null,
}

/**
 * Хук для управления папочным режимом плеера
 */
export function useFolderPlayer() {
  const [state, setState] = useState<FolderPlayerState>(initialState)

  /**
   * Сброс состояния
   */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  /**
   * Открыть файл напрямую (single mode)
   */
  const openSingleFile = useCallback((filePath: string) => {
    const fileName = filePath.split(/[/\\]/).pop() || 'Видео'
    setState({
      ...initialState,
      mode: 'single',
      folderPath: filePath,
      folderName: fileName,
      currentIndex: 0,
    })
  }, [])

  /**
   * Внутренняя функция сканирования папки
   */
  const scanFolderInternal = useCallback(async (folderPath: string): Promise<boolean> => {
    if (!window.electronAPI) {
      console.error('[useFolderPlayer] electronAPI недоступен')
      return false
    }

    setState((s) => ({
      ...s,
      isScanning: true,
      error: null,
      folderPath,
      folderName: folderPath.split(/[/\\]/).pop() || 'Папка',
    }))

    try {
      // Сканируем видеофайлы
      // createHandler оборачивает в { success, data: { files } }
      const result = await window.electronAPI.fs.scanFolder(folderPath, true, ['video'])
      // Результат: { success: boolean, data?: { files: [...] } } или { success: false, error: string }
      const rawResult = result as {
        success: boolean
        data?: { files: Array<{ path: string; name: string; size: number; extension: string }> }
        files?: Array<{ path: string; name: string; size: number; extension: string }>
      }
      // Поддерживаем оба формата: data.files (новый) и files (старый)
      const files = rawResult.data?.files || rawResult.files || []

      if (!rawResult.success || files.length === 0) {
        setState((s) => ({
          ...s,
          isScanning: false,
          error: 'Видеофайлы не найдены в папке',
        }))
        return false
      }

      // Парсим и разделяем на эпизоды и бонусы
      const episodes: FolderEpisode[] = []
      const bonusVideos: FolderEpisode[] = []

      for (const file of files) {
        const episodeInfo = parseEpisodeInfo(file.name)
        const isBonus = isBonusVideo(file.path)

        const episode: FolderEpisode = {
          ...file,
          episodeNumber: episodeInfo?.number ?? null,
          episodeType: episodeInfo?.type ?? 'regular',
          isBonus,
        }

        if (isBonus) {
          bonusVideos.push(episode)
        } else {
          episodes.push(episode)
        }
      }

      // Сортируем эпизоды по номеру (null в конец)
      episodes.sort((a, b) => {
        if (a.episodeNumber === null && b.episodeNumber === null) {
          return 0
        }
        if (a.episodeNumber === null) {
          return 1
        }
        if (b.episodeNumber === null) {
          return -1
        }
        return a.episodeNumber - b.episodeNumber
      })

      // Сортируем бонусы по имени
      bonusVideos.sort((a, b) => a.name.localeCompare(b.name))

      setState((s) => ({
        ...s,
        mode: 'folder',
        episodes,
        bonusVideos,
        currentIndex: episodes.length > 0 ? 0 : -1,
        isCurrentBonus: false,
        currentBonusIndex: -1,
        isScanning: false,
        error: null,
      }))

      // Сканируем дорожки для первого эпизода
      if (episodes.length > 0) {
        await scanTracksForEpisodeInternal(folderPath, episodes[0], [...episodes, ...bonusVideos])
      }

      return true
    } catch (error) {
      console.error('[useFolderPlayer] Ошибка сканирования:', error)
      setState((s) => ({
        ...s,
        isScanning: false,
        error: error instanceof Error ? error.message : 'Ошибка сканирования',
      }))
      return false
    }
  }, [])

  /**
   * Сканирование папки и построение списка эпизодов (с диалогом)
   */
  const selectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('[useFolderPlayer] electronAPI недоступен')
      return
    }

    // Preload уже разворачивает { success, data } и возвращает string | null
    const folderPath = await window.electronAPI.dialog.selectFolder()
    if (!folderPath) {
      return
    }

    await scanFolderInternal(folderPath)
  }, [scanFolderInternal])

  /**
   * Открыть папку по указанному пути (без диалога)
   */
  const openFolder = useCallback(
    async (folderPath: string): Promise<boolean> => {
      return scanFolderInternal(folderPath)
    },
    [scanFolderInternal]
  )

  /**
   * Внутренняя функция сканирования дорожек
   *
   * @param allVideos Все видео папки (эпизоды + бонусы), а не только текущий —
   * иначе fuzzyMatchToVideo в main-процессе считает единственный переданный файл
   * фильмом и приписывает ему ВСЕ найденные субтитры/аудио папки, включая чужие серии.
   */
  const scanTracksForEpisodeInternal = async (
    folderPath: string,
    episode: FolderEpisode,
    allVideos: FolderEpisode[]
  ) => {
    if (!window.electronAPI) {
      return
    }

    setState((s) => ({ ...s, isLoadingTracks: true, embeddedTracks: null }))

    try {
      // Подготавливаем данные для сканирования — весь список видео папки,
      // чтобы matcher на стороне main мог сматчить субтитр к «своему» эпизоду по номеру,
      // а не приписывал их все текущему (см. videoFiles.length === 1 branch в fuzzyMatchToVideo)
      const videoFiles = allVideos.map((v) => ({
        path: v.path,
        episodeNumber: v.episodeNumber ?? 0,
      }))

      // Параллельно сканируем внешние дорожки и пробим MKV (с кэшированием)
      // createHandler возвращает { success, data: ExternalAudioScanResult | ExternalSubtitleScanResult }
      const [audioResultRaw, subsResultRaw, probeResult] = await Promise.all([
        window.electronAPI.fs.scanExternalAudio(folderPath, videoFiles) as unknown as {
          success: boolean
          data?: ExternalAudioScanResult
        },
        window.electronAPI.fs.scanExternalSubtitles(folderPath, videoFiles) as unknown as {
          success: boolean
          data?: ExternalSubtitleScanResult
        },
        getCachedProbe(episode.path),
      ])

      // Извлекаем данные из обёртки createHandler
      const audioResult: ExternalAudioScanResult = audioResultRaw.data || {
        audioTracks: [],
        audioDirs: [],
        unmatchedFiles: [],
      }
      const subsResult: ExternalSubtitleScanResult = subsResultRaw.data || {
        subtitles: [],
        subsDirs: [],
        fontsDirs: [],
        unmatchedFiles: [],
      }

      // Фильтруем внешние дорожки для текущего эпизода
      // Для фильмов (episodeNumber === null) берём все дорожки без фильтрации
      const episodeNum = episode.episodeNumber
      const externalTracks: ExternalTracksInfo = {
        audio:
          episodeNum !== null
            ? audioResult.audioTracks.filter((t) => t.episodeNumber === episodeNum)
            : audioResult.audioTracks,
        subtitles:
          episodeNum !== null
            ? subsResult.subtitles.filter((t) => t.episodeNumber === episodeNum)
            : subsResult.subtitles,
        audioScanResult: audioResult,
        subtitleScanResult: subsResult,
      }

      // Парсим встроенные дорожки из FFprobe
      let embeddedTracks: EmbeddedTracksInfo | null = null
      if (probeResult.success && probeResult.data) {
        const mediaInfo = probeResult.data
        embeddedTracks = {
          audio: (mediaInfo.audioTracks ?? []).map((t) => ({
            index: t.index,
            language: t.language || 'und',
            title: t.title || '',
            codec: t.codec || 'unknown',
            channels: t.channels || 2,
            bitrate: t.bitrate,
            isDefault: t.isDefault,
            isForced: t.isForced,
          })),
          subtitles: (mediaInfo.subtitleTracks ?? []).map((t) => ({
            index: t.index,
            language: t.language || 'und',
            title: t.title || '',
            codec: t.codec || 'unknown',
            isDefault: t.isDefault,
            isForced: t.isForced,
            subtitleType: t.subtitleType,
          })),
        }
      }

      setState((s) => ({
        ...s,
        externalTracks,
        embeddedTracks,
        isLoadingTracks: false,
      }))
    } catch (error) {
      console.error('[useFolderPlayer] Ошибка сканирования дорожек:', error)
      setState((s) => ({
        ...s,
        isLoadingTracks: false,
        embeddedTracks: null,
        externalTracks: {
          audio: [],
          subtitles: [],
          audioScanResult: null,
          subtitleScanResult: null,
        },
      }))
    }
  }

  /**
   * Перейти к эпизоду по индексу
   */
  const goToEpisode = useCallback(
    async (index: number) => {
      const { episodes, bonusVideos, folderPath } = state
      if (index < 0 || index >= episodes.length || !folderPath) {
        return
      }

      setState((s) => ({
        ...s,
        currentIndex: index,
        isCurrentBonus: false,
        currentBonusIndex: -1,
      }))

      await scanTracksForEpisodeInternal(folderPath, episodes[index], [...episodes, ...bonusVideos])
    },
    [state]
  )

  /**
   * Перейти к бонусному видео по индексу
   */
  const goToBonus = useCallback(
    async (index: number) => {
      const { episodes, bonusVideos, folderPath } = state
      if (index < 0 || index >= bonusVideos.length || !folderPath) {
        return
      }

      setState((s) => ({
        ...s,
        currentIndex: -1,
        isCurrentBonus: true,
        currentBonusIndex: index,
      }))

      await scanTracksForEpisodeInternal(folderPath, bonusVideos[index], [...episodes, ...bonusVideos])
    },
    [state]
  )

  /**
   * Следующий эпизод
   */
  const goNext = useCallback(async () => {
    const { currentIndex, isCurrentBonus, currentBonusIndex, episodes, bonusVideos } = state

    if (isCurrentBonus) {
      // В режиме бонуса — следующий бонус или ничего
      if (currentBonusIndex < bonusVideos.length - 1) {
        await goToBonus(currentBonusIndex + 1)
      }
    } else {
      // В режиме эпизодов — следующий эпизод
      if (currentIndex < episodes.length - 1) {
        await goToEpisode(currentIndex + 1)
      }
    }
  }, [state, goToEpisode, goToBonus])

  /**
   * Предыдущий эпизод
   */
  const goPrev = useCallback(async () => {
    const { currentIndex, isCurrentBonus, currentBonusIndex } = state

    if (isCurrentBonus) {
      // В режиме бонуса — предыдущий бонус или ничего
      if (currentBonusIndex > 0) {
        await goToBonus(currentBonusIndex - 1)
      }
    } else {
      // В режиме эпизодов — предыдущий эпизод
      if (currentIndex > 0) {
        await goToEpisode(currentIndex - 1)
      }
    }
  }, [state, goToEpisode, goToBonus])

  // === Computed values ===

  const { episodes, bonusVideos, currentIndex, isCurrentBonus, currentBonusIndex, mode } = state

  /** Текущий эпизод (или бонус) */
  const currentEpisode: FolderEpisode | null = isCurrentBonus
    ? (bonusVideos[currentBonusIndex] ?? null)
    : (episodes[currentIndex] ?? null)

  /** Есть предыдущий эпизод */
  const hasPrev = isCurrentBonus ? currentBonusIndex > 0 : currentIndex > 0

  /** Есть следующий эпизод */
  const hasNext = isCurrentBonus ? currentBonusIndex < bonusVideos.length - 1 : currentIndex < episodes.length - 1

  /** Предыдущий эпизод (для tooltip) */
  const prevEpisode: FolderEpisode | null = isCurrentBonus
    ? (bonusVideos[currentBonusIndex - 1] ?? null)
    : (episodes[currentIndex - 1] ?? null)

  /** Следующий эпизод (для tooltip) */
  const nextEpisode: FolderEpisode | null = isCurrentBonus
    ? (bonusVideos[currentBonusIndex + 1] ?? null)
    : (episodes[currentIndex + 1] ?? null)

  /** Путь к текущему видео */
  const currentVideoPath: string | null = currentEpisode?.path ?? null

  /** Общее количество эпизодов */
  const totalEpisodes = episodes.length

  /** Общее количество бонусов */
  const totalBonuses = bonusVideos.length

  /** Текущий номер (1-based для отображения) */
  const currentNumber = isCurrentBonus ? currentBonusIndex + 1 : currentIndex + 1

  /** Общее количество в текущей категории */
  const totalInCategory = isCurrentBonus ? totalBonuses : totalEpisodes

  return {
    // State
    ...state,

    // Computed
    currentEpisode,
    currentVideoPath,
    hasPrev,
    hasNext,
    prevEpisode,
    nextEpisode,
    totalEpisodes,
    totalBonuses,
    currentNumber,
    totalInCategory,

    // Проверка режима
    isFolderMode: mode === 'folder',
    isSingleMode: mode === 'single',
    isIdle: mode === 'idle',

    // Actions
    selectFolder,
    openFolder,
    openSingleFile,
    goToEpisode,
    goToBonus,
    goNext,
    goPrev,
    reset,
  }
}

/** Тип возвращаемого значения хука */
export type UseFolderPlayerReturn = ReturnType<typeof useFolderPlayer>
