/**
 * Хук для папочного режима плеера
 * Сканирует папку с сериалом и управляет навигацией между эпизодами
 */

import { useCallback, useState } from 'react'

import type { FolderPlayerHost } from './host'
import { parseEpisodeInfo } from './parse-filename'
import { getCachedProbe } from './probe-cache'
import type { EmbeddedTracksInfo, ExternalTracksInfo, FolderEpisode, FolderPlayerState } from './types'
import { isBonusVideo } from './types'

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
  chapters: null,
  isScanning: false,
  isLoadingTracks: false,
  error: null,
}

/**
 * Хук для управления папочным режимом плеера
 */
export function useFolderPlayer(host: FolderPlayerHost) {
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
   * Внутренняя функция сканирования дорожек
   *
   * @param allVideos Все видео папки (эпизоды + бонусы), а не только текущий —
   * иначе fuzzy-матчер хоста считает единственный переданный файл фильмом и приписывает ему
   * ВСЕ найденные субтитры/аудио папки, включая чужие серии.
   */
  const scanTracksForEpisodeInternal = useCallback(
    async (folderPath: string, episode: FolderEpisode, allVideos: FolderEpisode[]) => {
      setState((s) => ({ ...s, isLoadingTracks: true, embeddedTracks: null, chapters: null }))

      try {
        // Подготавливаем данные для сканирования — весь список видео папки,
        // чтобы matcher на стороне хоста мог сматчить субтитр к «своему» эпизоду по номеру,
        // а не приписывал их все текущему
        const videoFiles = allVideos.map((v) => ({
          path: v.path,
          episodeNumber: v.episodeNumber ?? 0,
        }))

        // Параллельно сканируем внешние дорожки и пробим медиафайл (с кэшированием)
        const [audioResult, subsResult, probeResult] = await Promise.all([
          host.scanExternalAudio(folderPath, videoFiles),
          host.scanExternalSubtitles(folderPath, videoFiles),
          getCachedProbe(host, episode.path),
        ])

        // Фильтруем внешние дорожки для текущего эпизода
        // Для фильмов (episodeNumber === null) берём все дорожки без фильтрации
        const episodeNum = episode.episodeNumber
        const externalTracks: ExternalTracksInfo = {
          audio: episodeNum !== null
            ? audioResult.audioTracks.filter((t) => t.episodeNumber === episodeNum)
            : audioResult.audioTracks,
          subtitles: episodeNum !== null
            ? subsResult.subtitles.filter((t) => t.episodeNumber === episodeNum)
            : subsResult.subtitles,
          audioScanResult: audioResult,
          subtitleScanResult: subsResult,
        }

        // Парсим встроенные дорожки из пробы
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
          chapters: probeResult.success ? (probeResult.data?.chapters ?? null) : null,
          isLoadingTracks: false,
        }))
      } catch (error) {
        console.error('[useFolderPlayer] Ошибка сканирования дорожек:', error)
        setState((s) => ({
          ...s,
          isLoadingTracks: false,
          embeddedTracks: null,
          chapters: null,
          externalTracks: {
            audio: [],
            subtitles: [],
            audioScanResult: null,
            subtitleScanResult: null,
          },
        }))
      }
    },
    [host],
  )

  /**
   * Внутренняя функция сканирования папки
   */
  const scanFolderInternal = useCallback(
    async (folderPath: string): Promise<boolean> => {
      setState((s) => ({
        ...s,
        isScanning: true,
        error: null,
        folderPath,
        folderName: folderPath.split(/[/\\]/).pop() || 'Папка',
      }))

      try {
        const result = await host.scanFolder(folderPath, true, ['video'])
        const files = result.files ?? []

        if (!result.success || files.length === 0) {
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
    },
    [host, scanTracksForEpisodeInternal],
  )

  /**
   * Сканирование папки и построение списка эпизодов (с диалогом)
   */
  const selectFolder = useCallback(async () => {
    const folderPath = await host.selectFolder()
    if (!folderPath) {
      return
    }

    await scanFolderInternal(folderPath)
  }, [host, scanFolderInternal])

  /**
   * Открыть папку по указанному пути (без диалога)
   */
  const openFolder = useCallback(
    async (folderPath: string): Promise<boolean> => {
      return scanFolderInternal(folderPath)
    },
    [scanFolderInternal],
  )

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
    [state, scanTracksForEpisodeInternal],
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
    [state, scanTracksForEpisodeInternal],
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
