'use client'

/**
 * Хук-оркестратор для восстановления дорожек
 *
 * Flow: folder → matching → probing → comparison → processing → done
 *
 * Ключевое отличие от add-tracks: этап comparison сравнивает
 * содержимое MKV-доноров с библиотекой и выбирает только недостающее.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { deleteBrokenAudioTracks } from '@/app/_actions/audio-track.action'
import { resolveImportErrorsForAnime } from '@/app/_actions/import-error.action'
import { deleteBrokenSubtitleTracks } from '@/app/_actions/subtitle-track.action'
import type { AudioTrack, SubtitleFont, SubtitleTrack } from '@/generated/prisma'

import type { DonorProbeResult, LibraryEpisode, TrackInfo } from '../add-tracks/types'
import { useAddTracksState } from '../add-tracks/use-add-tracks-state'
import { scanExternalTracks, useTrackAnalysis } from '../add-tracks/use-track-analysis'
import { useTrackSelection } from '../add-tracks/use-track-selection'

import type { MediaChapter } from '../../../../shared/types'
import type {
  RestoreConfig,
  RestoreFontTask,
  RestoreProgress,
  RestoreTask,
  RestoreTaskType,
} from '../../../../shared/types/restore-tracks'

/** Получить временную директорию через Electron API */
async function getTempDir(): Promise<string> {
  try {
    const tempPath = await window.electronAPI?.app.getPath('temp')
    return tempPath || '/tmp'
  } catch {
    return '/tmp'
  }
}

// === Типы ===

/** Стадия восстановления */
export type RestoreStage = 'folder' | 'matching' | 'probing' | 'comparison' | 'processing' | 'done'

/** Субтитры с шрифтами */
export type SubtitleTrackWithFonts = SubtitleTrack & { fonts: SubtitleFont[] }

/** Эпизод с информацией о дорожках */
export interface EpisodeWithTracks {
  id: string
  number: number
  folderPath?: string | null
  transcodedCid?: string | null
  metadataCid?: string | null
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrackWithFonts[]
}

/** @deprecated Используй EpisodeWithTracks */
export type EpisodeWithAudio = EpisodeWithTracks

/** Результат сравнения для одного эпизода */
export interface EpisodeComparison {
  episodeId: string
  episodeNumber: number
  /** Что есть в доноре */
  donor: {
    audio: TrackInfo[]
    subtitles: TrackInfo[]
    externalSubtitles: TrackInfo[]
    externalAudio: TrackInfo[]
    fonts: string[]
    chapters: MediaChapter[]
  }
  /** Что есть в библиотеке */
  library: {
    audioCount: number
    audioLanguages: string[]
    subtitleCount: number
    subtitleLanguages: string[]
    fontCount: number
    hasChapters: boolean
  }
  /** Что отсутствует (для восстановления) */
  missing: {
    audio: TrackInfo[]
    subtitles: TrackInfo[]
    externalSubtitles: TrackInfo[]
    externalAudio: TrackInfo[]
    fonts: string[]
    chapters: MediaChapter[]
  }
}

/** Суммарная статистика сравнения */
export interface ComparisonSummary {
  /** Результаты по эпизодам */
  episodes: EpisodeComparison[]
  /** Общие суммы недостающего */
  totalMissing: {
    audio: number
    subtitles: number
    fonts: number
    chapters: number
    externalAudio: number
    externalSubtitles: number
  }
  /** Всего дорожек для восстановления */
  totalTracksToRestore: number
}

// === Хук ===

interface UseRestoreTracksFlowOptions {
  animeId: string
  animeName: string
  animeFolderPath: string
  allEpisodes: EpisodeWithTracks[]
}

export function useRestoreTracksFlow(options: UseRestoreTracksFlowOptions) {
  const { animeId, animeFolderPath, allEpisodes } = options
  const queryClient = useQueryClient()

  const [restoreStage, setRestoreStage] = useState<RestoreStage>('folder')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [comparison, setComparison] = useState<ComparisonSummary | null>(null)
  /** Прогресс из main process */
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null)

  // LibraryEpisode для add-tracks подсистемы (все эпизоды, не только нуждающиеся)
  const libraryEpisodes: LibraryEpisode[] = allEpisodes.map((ep) => ({
    id: ep.id,
    number: ep.number,
    folderPath: ep.folderPath,
    transcodedCid: ep.transcodedCid,
  }))

  // Управление состоянием add-tracks (для folder/matching/probing шагов)
  // Деструктурируем для стабильных ссылок в useCallback зависимостях —
  // целый stateManager объект нестабилен (новая ссылка каждый рендер),
  // а отдельные функции стабильны (useCallback)
  const stateManager = useAddTracksState()
  const {
    reset: stateManagerReset,
    setStage: stateManagerSetStage,
    setError: stateManagerSetError,
    setState: stateManagerSetState,
    setConcurrency: stateManagerSetConcurrency,
  } = stateManager

  const { scanDonorFolder, proceedToCalibration } = useTrackAnalysis({
    episodes: libraryEpisodes,
    stateManager,
  })

  const { updateMatchManually } = useTrackSelection({
    episodes: libraryEpisodes,
    animeFolderPath,
    stateManager,
  })

  // === Обёртка scanDonorFolder → matching ===

  const handleScanFolder = useCallback(
    async (folderPath: string) => {
      await scanDonorFolder(folderPath)
      setRestoreStage('matching')
    },
    [scanDonorFolder]
  )

  // === Probe + сравнение ===

  const probeAndCompare = useCallback(async () => {
    proceedToCalibration() // проверяет матчи

    const api = window.electronAPI
    if (!api) {
      return
    }

    const matchedFiles = stateManager.state.matches.filter((m) => m.targetEpisode !== null)
    if (matchedFiles.length === 0) {
      return
    }

    stateManagerSetStage('probing')
    setRestoreStage('probing')

    try {
      const probeResults = new Map<string, DonorProbeResult>()
      // Храним дополнительные данные probe (главы, шрифты)
      const extraData = new Map<string, { chapters: MediaChapter[]; attachmentFonts: string[] }>()

      // === ФАЗА 1: Probe каждого MKV ===
      for (const match of matchedFiles) {
        const filePath = match.donorFile.path
        const probeResult = await api.ffmpeg.probe(filePath)

        if (!probeResult.success || !probeResult.data) {
          continue
        }

        const mediaInfo = probeResult.data

        const audioTracks: TrackInfo[] = (mediaInfo.audioTracks || []).map((audio, i) => ({
          id: `${filePath}:audio:${i}`,
          streamIndex: i,
          language: audio.language || 'und',
          title: audio.title || `Аудио ${i + 1}`,
          codec: audio.codec || 'unknown',
          channels: audio.channels,
          bitrate: audio.bitrate,
          isExternal: false,
        }))

        const subtitleTracks: TrackInfo[] = (mediaInfo.subtitleTracks || []).map((sub, i) => ({
          id: `${filePath}:sub:${i}`,
          streamIndex: i,
          language: sub.language || 'und',
          title: sub.title || `Субтитры ${i + 1}`,
          codec: sub.codec || 'ass',
          format: sub.codec || 'ass',
          isExternal: false,
        }))

        probeResults.set(filePath, {
          path: filePath,
          audioTracks,
          subtitleTracks,
          externalSubtitles: [],
          externalAudioByGroup: new Map(),
        })

        extraData.set(filePath, {
          chapters: mediaInfo.chapters || [],
          attachmentFonts: mediaInfo.attachmentFonts || [],
        })
      }

      // === ФАЗА 2: Сканирование внешних файлов ===
      if (stateManager.state.donorPath) {
        await scanExternalTracks(api, stateManager.state.donorPath, matchedFiles, probeResults)
      }

      // === ФАЗА 3: Сравнение донор vs библиотека ===
      const episodes: EpisodeComparison[] = []

      for (const match of matchedFiles) {
        if (!match.targetEpisode) {
          continue
        }
        const probe = probeResults.get(match.donorFile.path)
        const extra = extraData.get(match.donorFile.path)
        if (!probe) {
          continue
        }

        const libraryEp = allEpisodes.find((ep) => ep.id === match.targetEpisode?.id)
        if (!libraryEp) {
          continue
        }

        // Собираем внешние аудио в плоский массив
        const allExternalAudio: TrackInfo[] = []
        for (const [, tracks] of probe.externalAudioByGroup) {
          allExternalAudio.push(...tracks)
        }

        // Только дорожки с transcodedCid/fileCid считаются "рабочими" в библиотеке
        // External дорожки без transcodedCid — не транскодированы, плеер их не воспроизведёт
        const readyAudioTracks = libraryEp.audioTracks.filter((t) => t.transcodedCid)
        const readySubTracks = libraryEp.subtitleTracks.filter((t) => t.fileCid)

        // Сравнение аудио: по языку (нестрогое, т.к. streamIndex может отличаться)
        const libraryAudioLangs = new Set(readyAudioTracks.map((t) => t.language))
        const missingAudio = probe.audioTracks.filter((d) => !libraryAudioLangs.has(d.language))

        // Сравнение субтитров: по языку + формату
        const librarySubKeys = new Set(readySubTracks.map((t) => `${t.language}:${t.format}`))
        const missingSubtitles = probe.subtitleTracks.filter(
          (d) => !librarySubKeys.has(`${d.language}:${d.format || d.codec}`)
        )

        // Внешние субтитры — добавляем все (у них нет аналогов в библиотеке по streamIndex)
        const missingExtSubs = probe.externalSubtitles.filter(
          (d) => !librarySubKeys.has(`${d.language}:${d.format || d.codec}`)
        )

        // Внешние аудио — по dubGroup (нормализация: убираем [] для совместимости)
        const normDubGroup = (g: string) => g.replace(/^\[(.+)\]$/, '$1').toLowerCase()
        const libraryDubGroups = new Set(
          readyAudioTracks
            .map((t) => t.dubGroup)
            .filter((g): g is string => !!g)
            .map(normDubGroup)
        )
        const missingExtAudio = allExternalAudio.filter(
          (d) => !d.dubGroup || !libraryDubGroups.has(normDubGroup(d.dubGroup))
        )

        // Шрифты: из MKV attachments vs SubtitleFont в БД
        // Нормализуем обе стороны — удаляем расширение и приводим к lowercase
        const normalizeFontName = (name: string) => name.toLowerCase().replace(/\.(ttf|otf|ttc|woff2?)$/i, '')
        const libraryFontNames = new Set(
          libraryEp.subtitleTracks.flatMap((t) => t.fonts.map((f) => normalizeFontName(f.fontName)))
        )
        const donorFonts = extra?.attachmentFonts || []
        const missingFonts = donorFonts.filter((f) => !libraryFontNames.has(normalizeFontName(f)))

        // Главы: показываем наличие в доноре (восстановление через манифест)
        const donorChapters = extra?.chapters || []
        // Невозможно проверить наличие в библиотеке без загрузки IPFS манифеста
        const missingChapters: MediaChapter[] = []

        episodes.push({
          episodeId: libraryEp.id,
          episodeNumber: libraryEp.number,
          donor: {
            audio: probe.audioTracks,
            subtitles: probe.subtitleTracks,
            externalSubtitles: probe.externalSubtitles,
            externalAudio: allExternalAudio,
            fonts: donorFonts,
            chapters: donorChapters,
          },
          library: {
            audioCount: readyAudioTracks.length,
            audioLanguages: [...new Set(readyAudioTracks.map((t) => t.language))],
            subtitleCount: readySubTracks.length,
            subtitleLanguages: [...new Set(readySubTracks.map((t) => t.language))],
            fontCount: readySubTracks.reduce((sum, t) => sum + t.fonts.length, 0),
            hasChapters: false, // Главы хранятся в IPFS манифесте, не в БД
          },
          missing: {
            audio: missingAudio,
            subtitles: missingSubtitles,
            externalSubtitles: missingExtSubs,
            externalAudio: missingExtAudio,
            fonts: missingFonts,
            chapters: missingChapters,
          },
        })
      }

      // Суммарная статистика
      const totalMissing = {
        audio: episodes.reduce((s, e) => s + e.missing.audio.length, 0),
        subtitles: episodes.reduce((s, e) => s + e.missing.subtitles.length, 0),
        fonts: episodes.reduce((s, e) => s + e.missing.fonts.length, 0),
        chapters: episodes.reduce((s, e) => s + (e.missing.chapters.length > 0 ? 1 : 0), 0),
        externalAudio: episodes.reduce((s, e) => s + e.missing.externalAudio.length, 0),
        externalSubtitles: episodes.reduce((s, e) => s + e.missing.externalSubtitles.length, 0),
      }

      const totalTracksToRestore =
        totalMissing.audio +
        totalMissing.subtitles +
        totalMissing.externalAudio +
        totalMissing.externalSubtitles +
        totalMissing.fonts

      setComparison({ episodes, totalMissing, totalTracksToRestore })

      // Сохраняем probeResults для processing
      stateManagerSetState((s) => ({ ...s, probeResults }))
      setRestoreStage('comparison')
    } catch (error) {
      stateManagerSetError(`Ошибка анализа: ${error}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateManager.state читается как snapshot при вызове
  }, [stateManagerSetState, stateManagerSetError, stateManagerSetStage, proceedToCalibration, allEpisodes])

  // === Подтверждение → формирование задач → отправка в main process ===

  const confirmAndProcess = useCallback(async () => {
    if (!comparison) {
      return
    }

    const api = window.electronAPI
    if (!api?.restoreTracks) {
      return
    }

    const tempBaseDir = animeFolderPath || (await getTempDir())
    const restoreTasks: RestoreTask[] = []
    const fontTasksList: RestoreFontTask[] = []

    for (const ep of comparison.episodes) {
      const libraryEp = allEpisodes.find((e) => e.id === ep.episodeId)
      const episodeDir = libraryEp?.folderPath || tempBaseDir
      const matchedFile = stateManager.state.matches.find((m) => m.targetEpisode?.id === ep.episodeId)
      if (!matchedFile) {
        continue
      }

      // Определяем тип задачи
      const makeTask = (track: TrackInfo, trackType: 'audio' | 'subtitle', type: RestoreTaskType): RestoreTask => ({
        id: track.id,
        type,
        trackType,
        episodeId: ep.episodeId,
        donorPath: matchedFile.donorFile.path,
        streamIndex: track.streamIndex,
        trackInfo: {
          language: track.language,
          title: track.title,
          codec: track.codec,
          format: track.format,
          channels: track.channels,
          bitrate: track.bitrate,
          dubGroup: track.dubGroup,
          isExternal: track.isExternal,
          filePath: track.filePath,
          matchedFonts: track.matchedFonts,
        },
        episodeDir,
        status: 'queued',
        progress: 0,
        phase: 'waiting',
        lastProgressUpdate: Date.now(),
        retryCount: 0,
      })

      // Встроенные аудио
      for (const track of ep.missing.audio) {
        restoreTasks.push(makeTask(track, 'audio', 'audio-transcode'))
      }
      // Встроенные субтитры
      for (const track of ep.missing.subtitles) {
        restoreTasks.push(makeTask(track, 'subtitle', 'subtitle-extract'))
      }
      // Внешние субтитры
      for (const track of ep.missing.externalSubtitles) {
        restoreTasks.push(makeTask(track, 'subtitle', 'subtitle-copy'))
      }
      // Внешние аудио
      for (const track of ep.missing.externalAudio) {
        restoreTasks.push(makeTask(track, 'audio', track.isExternal ? 'audio-copy' : 'audio-transcode'))
      }

      // Шрифты
      if (ep.missing.fonts.length > 0) {
        const assTrackIds = (libraryEp?.subtitleTracks ?? [])
          .filter((t) => t.format === 'ass' || t.format === 'ssa')
          .map((t) => t.id)
        if (assTrackIds.length > 0) {
          fontTasksList.push({
            id: `fonts-${ep.episodeId}`,
            donorPath: matchedFile.donorFile.path,
            episodeId: ep.episodeId,
            missingFonts: ep.missing.fonts,
            subtitleTrackIds: assTrackIds,
            status: 'queued',
            restoredCount: 0,
          })
        }
      }
    }

    if (restoreTasks.length === 0 && fontTasksList.length === 0) {
      setRestoreStage('done')
      return
    }

    const config: RestoreConfig = {
      concurrency: stateManager.state.concurrency,
      audioBitrate: 192, // TODO: читать из Settings
      syncOffset: stateManager.state.syncOffset,
    }

    // Отправляем задачи в main process — он управляет очередью
    await api.restoreTracks.start(restoreTasks, fontTasksList, config)
    setRestoreStage('processing')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateManager.state читается как snapshot, не нужен в deps
  }, [comparison, allEpisodes, animeFolderPath])

  // === Очистка битых записей (вызывается из ComparisonStep) ===

  const cleanBrokenRecords = useCallback(async () => {
    const audioResult = await deleteBrokenAudioTracks(animeId)
    const subtitleResult = await deleteBrokenSubtitleTracks(animeId)
    await resolveImportErrorsForAnime(animeId)

    if (audioResult.count > 0 || subtitleResult.count > 0) {
      console.warn(`[RestoreTracks] Очищено: ${audioResult.count} аудио, ${subtitleResult.count} субтитров`)
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
    }
  }, [animeId, queryClient])

  // === Регенерация манифестов ===

  const regenerateManifests = useCallback(async () => {
    if (!window.electronAPI?.animeManifest) {
      return
    }
    setIsRegenerating(true)
    try {
      await window.electronAPI.animeManifest.update(animeId)
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
      setRestoreStage('done')
    } catch (error) {
      console.error('[RestoreTracks] Ошибка регенерации:', error)
    } finally {
      setIsRegenerating(false)
    }
  }, [animeId, queryClient])

  // === Cancel через IPC (main process) ===

  const cancel = useCallback(async () => {
    const api = window.electronAPI
    if (api?.restoreTracks) {
      await api.restoreTracks.cancel()
    }
  }, [])

  // === setConcurrency через IPC (main process) ===

  const setConcurrency = useCallback(
    async (value: number) => {
      stateManagerSetConcurrency(value) // Обновляем UI state
      const api = window.electronAPI
      if (api?.restoreTracks) {
        await api.restoreTracks.setConcurrency(value)
      }
    },
    [stateManagerSetConcurrency]
  )

  // === Сброс ===

  const reset = useCallback(() => {
    setRestoreStage('folder')
    setComparison(null)
    setRestoreProgress(null)
    setIsRegenerating(false)
    stateManagerReset()
  }, [stateManagerReset])

  return {
    restoreStage,
    addTracksState: stateManager.state,
    comparison,
    isRegenerating,
    libraryEpisodes,
    /** Прогресс из main process */
    restoreProgress,
    setRestoreProgress,
    setRestoreStage,

    handleScanFolder,
    updateMatchManually,
    probeAndCompare,
    confirmAndProcess,
    cleanBrokenRecords,
    cancel,
    regenerateManifests,
    reset,
    setConcurrency,
  }
}
