'use client'

/**
 * Хук для анализа файлов (сканирование папки, ffprobe)
 */

import { useCallback } from 'react'

import {
  createDonorFile,
  detectContentType,
  type DonorFile,
  type EpisodeMatch,
  extractEpisodeNumber,
  matchDonorFilesToEpisodes,
} from './episode-matcher'
import type { DonorProbeResult, LibraryEpisode, TrackInfo } from './types'
import type { UseAddTracksStateReturn } from './use-add-tracks-state'

interface UseTrackAnalysisOptions {
  /** Эпизоды из библиотеки */
  episodes: LibraryEpisode[]
  /** Фильтр по типу контента */
  contentTypeFilter?: 'series' | 'special'
  /** Управление состоянием */
  stateManager: UseAddTracksStateReturn
}

/**
 * Хук для анализа файлов донора
 */
export function useTrackAnalysis(options: UseTrackAnalysisOptions) {
  const { episodes, contentTypeFilter, stateManager } = options
  const { state, setState, isCancelledRef, setStage, setError } = stateManager

  /**
   * Шаг 1: Выбрать папку-донор и просканировать её
   */
  const scanDonorFolder = useCallback(
    async (folderPath: string) => {
      const api = window.electronAPI
      if (!api) {
        setError('Electron API недоступен')
        return
      }

      setState((s) => ({
        ...s,
        stage: 'scanning',
        donorPath: folderPath,
        error: null,
      }))

      try {
        // Сканируем папку на видеофайлы
        // createHandler возвращает { success, data: { files } }
        const scanResult = (await api.fs.scanFolder(folderPath, true)) as unknown as {
          success: boolean
          data?: { files: Array<{ path: string; name: string; size: number; extension: string }> }
        }
        const files = scanResult.data?.files || []

        if (!scanResult.success || files.length === 0) {
          setError('Видеофайлы не найдены в выбранной папке')
          return
        }

        // Создаём DonorFile для каждого видеофайла
        const donorFiles: DonorFile[] = []
        for (const file of files) {
          const donorFile = createDonorFile(file.path)
          if (donorFile && donorFile.type === 'video') {
            // Фильтруем по типу контента если задан фильтр
            if (contentTypeFilter) {
              if (contentTypeFilter === 'series' && donorFile.contentType === 'special') {
                continue // Пропускаем спешлы при импорте в серии
              }
              if (contentTypeFilter === 'special' && donorFile.contentType === 'series') {
                continue // Пропускаем серии при импорте в спешлы
              }
            }
            donorFiles.push(donorFile)
          }
        }

        if (donorFiles.length === 0) {
          setError('Видеофайлы не найдены в выбранной папке')
          return
        }

        // Сопоставляем с эпизодами библиотеки
        const libraryEpisodes = episodes.map((ep) => ({ id: ep.id, number: ep.number }))
        const matches = matchDonorFilesToEpisodes(donorFiles, libraryEpisodes)

        setState((s) => ({
          ...s,
          stage: 'matching',
          donorFiles,
          matches,
        }))
      } catch (error) {
        setError(`Ошибка сканирования: ${error}`)
      }
    },
    [episodes, contentTypeFilter, setState, setError]
  )

  /**
   * Перейти к шагу калибровки синхронизации
   */
  const proceedToCalibration = useCallback(() => {
    // Проверяем, есть ли сопоставленные файлы
    const matchedFiles = state.matches.filter((m) => m.targetEpisode !== null)

    if (matchedFiles.length === 0) {
      setError('Нет сопоставленных файлов')
      return
    }

    setStage('calibration')
  }, [state.matches, setStage, setError])

  /**
   * Перейти к шагу выбора дорожек (проанализировать файлы)
   */
  const proceedToSelection = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      setError('Electron API недоступен')
      return
    }

    // Фильтруем только сопоставленные файлы
    const matchedFiles = state.matches.filter((m) => m.targetEpisode !== null)

    if (matchedFiles.length === 0) {
      setError('Нет сопоставленных файлов')
      return
    }

    setStage('probing')

    try {
      const probeResults = new Map<string, DonorProbeResult>()

      // Анализируем каждый файл
      for (const match of matchedFiles) {
        if (isCancelledRef.current) {
          throw new Error('Отменено')
        }

        const filePath = match.donorFile.path

        // Probe файла
        const probeResult = await api.ffmpeg.probe(filePath)

        if (!probeResult.success || !probeResult.data) {
          console.warn(`[AddTracks] Failed to probe ${filePath}`)
          continue
        }

        const mediaInfo = probeResult.data
        const audioTracks: TrackInfo[] = []
        const subtitleTracks: TrackInfo[] = []

        // Аудиодорожки
        // ВАЖНО: streamIndex должен быть ОТНОСИТЕЛЬНЫМ индексом аудио (0, 1, 2...),
        // а не абсолютным stream index из ffprobe, т.к. demux возвращает относительные индексы
        if (mediaInfo.audioTracks) {
          for (let i = 0; i < mediaInfo.audioTracks.length; i++) {
            const audio = mediaInfo.audioTracks[i]
            audioTracks.push({
              id: `${filePath}:audio:${i}`,
              streamIndex: i, // Относительный индекс аудио для совместимости с demux
              language: audio.language || 'und',
              title: audio.title || `Аудио ${i + 1}`,
              codec: audio.codec || 'unknown',
              channels: audio.channels,
              bitrate: audio.bitrate,
              isExternal: false,
            })
          }
        }

        // Субтитры (встроенные в MKV)
        // ВАЖНО: streamIndex должен быть ОТНОСИТЕЛЬНЫМ индексом субтитров (0, 1, 2...),
        // а не абсолютным stream index из ffprobe, т.к. demux возвращает относительные индексы
        if (mediaInfo.subtitleTracks) {
          for (let i = 0; i < mediaInfo.subtitleTracks.length; i++) {
            const sub = mediaInfo.subtitleTracks[i]
            // Определяем формат по кодеку (ass, subrip -> srt, и т.д.)
            const codec = sub.codec?.toLowerCase() || 'unknown'
            // Графические субтитры (PGS, DVD) — не поддерживаются libass-плеером
            const IMAGE_BASED_CODECS = new Set([
              'hdmv_pgs_subtitle',
              'pgssub',
              'dvd_subtitle',
              'dvdsub',
              'dvb_subtitle',
            ])
            const format =
              codec === 'subrip' ? 'srt' : codec === 'ssa' ? 'ass' : IMAGE_BASED_CODECS.has(codec) ? 'pgs' : codec
            subtitleTracks.push({
              id: `${filePath}:subtitle:${i}`,
              streamIndex: i, // Относительный индекс субтитров для совместимости с demux
              language: sub.language || 'und',
              title: sub.title || `Субтитры ${i + 1}`,
              codec: format,
              format,
              isExternal: false,
            })
          }
        }

        probeResults.set(filePath, {
          path: filePath,
          audioTracks,
          subtitleTracks,
          externalSubtitles: [],
          externalAudioByGroup: new Map(),
        })
      }

      // Сканируем внешние субтитры и аудио
      if (state.donorPath) {
        await scanExternalTracks(api, state.donorPath, matchedFiles, probeResults, contentTypeFilter)
      }

      setState((s) => ({
        ...s,
        stage: 'selection',
        probeResults,
      }))
    } catch (error) {
      if (isCancelledRef.current) {
        setStage('cancelled')
      } else {
        setError(`Ошибка анализа файлов: ${error}`)
      }
    }
  }, [state.matches, state.donorPath, isCancelledRef, contentTypeFilter, setState, setStage, setError])

  return {
    scanDonorFolder,
    proceedToCalibration,
    proceedToSelection,
  }
}

/**
 * Сканирование внешних субтитров и аудиодорожек
 */
export async function scanExternalTracks(
  api: NonNullable<typeof window.electronAPI>,
  donorPath: string,
  matchedFiles: EpisodeMatch[],
  probeResults: Map<string, DonorProbeResult>,
  contentTypeFilter?: 'series' | 'special'
): Promise<void> {
  // Сканируем внешние субтитры
  try {
    const videoFilesForScan = matchedFiles.map((m) => ({
      path: m.donorFile.path,
      episodeNumber: m.donorFile.episodeNumber || 0,
    }))

    // createHandler возвращает { success, data: { subtitles, ... } }
    const externalSubsResult = (await api.fs.scanExternalSubtitles(donorPath, videoFilesForScan)) as unknown as {
      success: boolean
      data?: {
        subtitles: Array<{
          episodeNumber: number | null
          filePath: string
          language: string
          title: string
          format: string
          matchedFonts: Array<{ name: string; path: string }>
        }>
        unmatchedFiles: string[]
      }
    }
    const externalSubs = externalSubsResult.data || { subtitles: [], unmatchedFiles: [] }

    if (externalSubs.subtitles.length > 0) {
      console.warn(`[AddTracks] Found ${externalSubs.subtitles.length} external subtitles`)

      // Добавляем внешние субтитры к соответствующим файлам
      for (const extSub of externalSubs.subtitles) {
        // Находим файл донора с таким же номером эпизода
        // Используем ?? 0 т.к. videoFilesForScan конвертирует null → 0
        const match = matchedFiles.find((m) => (m.donorFile.episodeNumber ?? 0) === extSub.episodeNumber)
        if (match) {
          const probeResult = probeResults.get(match.donorFile.path)
          if (probeResult) {
            probeResult.externalSubtitles.push({
              id: `external:${extSub.filePath}`,
              streamIndex: -1,
              language: extSub.language,
              title: extSub.title,
              codec: extSub.format,
              format: extSub.format,
              filePath: extSub.filePath,
              isExternal: true,
              matchedFonts: extSub.matchedFonts,
            })
          }
        }
      }
    }
  } catch (scanError) {
    console.warn('[AddTracks] Failed to scan external subtitles:', scanError)
  }

  // Сканируем внешние аудиодорожки по папкам (группам озвучки)
  try {
    // Сканируем папку на аудиофайлы (используем mediaTypes: ['audio'])
    // createHandler возвращает { success, data: { files } }
    const recursiveScanResult = (await api.fs.scanFolder(donorPath, true, ['audio'])) as unknown as {
      success: boolean
      data?: { files: Array<{ path: string; name: string; size: number; extension: string }> }
    }
    const recursiveScanFiles = recursiveScanResult.data?.files || []

    if (recursiveScanResult.success && recursiveScanFiles.length > 0) {
      // Фильтруем только аудиофайлы из подпапок (не из корня папки-донора)
      const donorFolderName = donorPath.split(/[/\\]/).pop()
      const audioFiles = recursiveScanFiles.filter((f) => {
        // Извлекаем имя родительской папки
        const pathParts = f.path.split(/[/\\]/)
        const parentFolder = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : ''
        // Пропускаем файлы в корне папки-донора
        return parentFolder !== donorFolderName
      })

      // Группируем по родительской папке
      const audioByGroup = new Map<string, typeof audioFiles>()
      for (const file of audioFiles) {
        // Извлекаем имя родительской папки
        const pathParts = file.path.split(/[/\\]/)
        const parentIndex = pathParts.length - 2
        const parentFolder = parentIndex >= 0 ? pathParts[parentIndex] : '(root)'

        // Пропускаем если родительская папка — это корневая папка донора
        const rootFolderName = donorPath.split(/[/\\]/).pop()
        if (parentFolder === rootFolderName) {
          continue
        }

        // Нормализация: убираем [] из имени папки (например [Carrier88] → Carrier88)
        const normalizedFolder = parentFolder.replace(/^\[(.+)\]$/, '$1')
        const group = audioByGroup.get(normalizedFolder) || []
        group.push(file)
        audioByGroup.set(normalizedFolder, group)
      }

      console.warn(`[AddTracks] Found ${audioByGroup.size} dub groups with external audio`)

      // Добавляем в probeResults
      for (const [groupName, files] of audioByGroup) {
        for (const audioFile of files) {
          // Извлекаем имя файла и номер эпизода
          const audioFileName = audioFile.path.split(/[/\\]/).pop() || ''
          const episodeNumber = extractEpisodeNumber(audioFileName)

          // Фильтруем по типу контента (серии vs спешлы)
          if (contentTypeFilter) {
            const audioContentType = detectContentType(audioFileName)
            if (contentTypeFilter === 'series' && audioContentType === 'special') {
              continue // Пропускаем спешлы при импорте в серии
            }
            if (contentTypeFilter === 'special' && audioContentType === 'series') {
              continue // Пропускаем серии при импорте в спешлы
            }
          }

          // Находим файл донора с таким же номером эпизода
          let match = matchedFiles.find((m) => m.donorFile.episodeNumber === episodeNumber)
          // Fallback: если нет совпадения по episodeNumber донора — ищем по целевому эпизоду
          if (!match && episodeNumber !== null) {
            match = matchedFiles.find((m) => m.targetEpisode?.number === episodeNumber)
          }
          if (match) {
            const probeResult = probeResults.get(match.donorFile.path)
            if (probeResult) {
              // Добавляем аудио в группу
              const groupTracks = probeResult.externalAudioByGroup.get(groupName) || []
              groupTracks.push({
                id: `external:audio:${audioFile.path}`,
                streamIndex: -1,
                language: 'rus', // Внешние озвучки обычно русские
                title: groupName,
                codec: audioFile.path.substring(audioFile.path.lastIndexOf('.') + 1),
                filePath: audioFile.path,
                isExternal: true,
                dubGroup: groupName,
              })
              probeResult.externalAudioByGroup.set(groupName, groupTracks)
            }
          }
        }
      }
    }
  } catch (audioScanError) {
    console.warn('[AddTracks] Failed to scan external audio:', audioScanError)
  }
}

export type UseTrackAnalysisReturn = ReturnType<typeof useTrackAnalysis>
