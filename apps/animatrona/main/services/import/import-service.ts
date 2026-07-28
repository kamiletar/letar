/**
 * ImportService — оркестратор импорта аниме в main process
 *
 * Портирован из renderer/src/lib/import/import-processor.ts
 * Все React-зависимости заменены:
 * - TanStack Query mutations → import-db.ts (прямые Prisma вызовы)
 * - React dispatch → ImportQueueController IPC events
 * - React refs → свойства класса
 * - window.electronAPI → прямые вызовы сервисов main process
 * - uploadToIpfs (IPC bridge) → import-ipfs.ts (прямой UnixFS)
 */

import fs from 'fs'

import type { ImportQueueEntry } from '../../../shared/types/import-queue'
import type { BatchImportItem } from '../../../shared/types/parallel-transcode'
import { getAnime4KShaderPath, isAnime4KAvailable } from '../../ffmpeg/anime4k'
import { demuxFile } from '../../ffmpeg/demux'
import { generateScreenshots, generateThumbnailSprite } from '../../ffmpeg/screenshot'
import { getFFmpegVersion } from '../../utils/ffmpeg-spawn'
import { createModuleLogger } from '../../utils/logger'
import { updateAnimeManifest } from '../anime-manifest-generator'
import { type ExternalSubtitleMatch, scanForExternalSubtitles } from '../external-subtitle-scanner'
import type { ImportQueueController } from '../import-queue-controller'
import { detectIntros } from '../intro-detector'
import {
  generateManifestFromDemux,
  rebuildManifestTracksFromFile,
  updateManifestEncoding,
  updateManifestMediaCids,
  updateManifestThumbnails,
} from '../manifest-generator'
import { ensureAnimeDirectory, ensureEpisodeDirectory, getDefaultLibraryPath } from '../output-path-resolver'
import { ParallelTranscodeManager } from '../parallel-transcode-manager'
import { downloadPoster, getAnimeWithRelated } from '../shikimori/client'
import { createAudioTracks } from './audio-track-creator'
import { createChapters, updateChaptersInManifest } from './chapter-creator'
import {
  buildTrackFileName,
  createConcurrencyLimiter,
  getPosterUrl,
  mapSeasonType,
  mapShikimoriStatus,
} from './helpers'
import * as db from './import-db'
import { getTrackedCids, startCidTracking, stopCidTracking, uploadToIpfs } from './import-ipfs'
import { createSubtitleTracks } from './subtitle-track-creator'
import type { ImportResult, PostProcessData, ProcessingStage, VideoEncodingMeta } from './types'
import { buildVideoOptions } from './video-options-builder'

const log = createModuleLogger('ImportService')

/**
 * ImportService — выполняет импорт аниме полностью в main process
 *
 * Не зависит от renderer — переживает навигацию, F5, и даже crash renderer'а.
 */
export class ImportService {
  // === Состояние (замена React refs) ===
  private createdAnimeId: string | null = null
  private createdAnimeFolder: string | null = null
  private _isCancelled = false
  private videoEncodingMeta = new Map<string, VideoEncodingMeta>()
  private currentStage: ProcessingStage = 'idle'

  constructor(private readonly queueController: ImportQueueController) {}

  get isCancelled() {
    return this._isCancelled
  }

  // === Обновление прогресса через ImportQueueController ===

  private currentItemId: string | null = null

  private setStage(stage: ProcessingStage) {
    this.currentStage = stage
  }

  private emitProgress(progress: number, fileName?: string, stage?: string) {
    if (this.currentItemId) {
      this.queueController.updateItemProgress(this.currentItemId, progress, fileName, stage ?? this.currentStage)
    }
  }

  private setFileProgress(currentFile: number, totalFiles: number, currentFileName: string | null) {
    // Демукс занимает 5-15% общего прогресса (энкод 15-90%)
    const percent = totalFiles > 0 ? 5 + Math.round((currentFile / totalFiles) * 10) : 0
    this.emitProgress(percent, currentFileName ?? undefined, this.currentStage)
  }

  // === Основной метод ===

  async process(entry: ImportQueueEntry): Promise<ImportResult> {
    this.currentItemId = entry.id
    this._isCancelled = false
    this.createdAnimeId = null
    this.createdAnimeFolder = null
    this.videoEncodingMeta.clear()
    this.setStage('idle')
    startCidTracking()

    const selectedFiles = (entry.files ?? []).filter(
      (f): f is typeof f & { episodeNumber: number } => f.selected && f.episodeNumber !== null,
    )

    if (selectedFiles.length === 0) {
      return { success: false, error: 'Нет выбранных файлов' }
    }

    // Настройки
    const importSettings = entry.importSettings
    const profileId = importSettings?.profileId
    const encodingProfile = await this.loadEncodingProfile(profileId)
    const audioMaxConcurrent = importSettings?.audioMaxConcurrent ?? 4
    // Anime4K нагружает GPU Vulkan — ограничиваем до 1 параллельного видео
    const videoMaxConcurrent = importSettings?.anime4kEnabled ? 1 : (importSettings?.videoMaxConcurrent ?? 2)
    const useCpuFallback = entry.vmafResult?.useCpuFallback
      || entry.encodingProfile?.preferCpu
      || entry.encodingProfile?.useGpu === false
      || entry.globalUseGpu === false
      || entry.forceCpu === true
    const vmafScore = entry.vmafResult?.vmafScore
    const syncOffset = entry.syncOffset ?? 0
    const fileAnalyses = entry.fileAnalyses

    log.info('Начинаем импорт', {
      anime: entry.selectedAnime.russian || entry.selectedAnime.name,
      files: selectedFiles.length,
      fileNames: selectedFiles.map((f) => `${f.name} (ep ${f.episodeNumber})`),
      videoMaxConcurrent,
      audioMaxConcurrent,
      hasFileAnalyses: !!fileAnalyses,
      fileAnalysesCount: fileAnalyses?.length,
      profileId,
      useCpuFallback,
      vmafScore,
    })

    // Коллекции для batch транскодирования
    const batchItems: BatchImportItem[] = []
    const episodeOutputDirs = new Map<string, string>()
    const postProcessDataMap = new Map<string, PostProcessData>()
    const episodesWithoutChapters: Array<{ id: string; sourcePath: string; durationMs: number }> = []
    let postProcessFailedEpisodes: Array<{ number: number; error: string }> = []
    const preEncodeTempFiles: string[] = [] // для очистки в finally

    try {
      // 0. Подготовка окружения (libraryPath из Settings, fallback на ~/Videos/Animatrona)
      const libraryPath = entry.globalLibraryPath || getDefaultLibraryPath()
      const animeName = entry.selectedAnime.russian ?? entry.selectedAnime.name
      const animeFolderPath = await ensureAnimeDirectory(libraryPath, animeName)
      this.createdAnimeFolder = animeFolderPath

      // FFmpeg info
      let ffmpegVersion: string | undefined
      try {
        ffmpegVersion = await getFFmpegVersion()
      } catch {
        /* не критично */
      }

      // 1. Создаём аниме в БД (или используем существующее при retranscode)
      let animeId: string
      let seasonId: string
      const seasonNum = entry.parsedInfo.seasonNumber ?? 1

      if (entry.isRetranscode && entry.existingAnimeId) {
        // Retranscode mode — используем существующее аниме, НЕ удаляем при ошибке
        animeId = entry.existingAnimeId
        this.createdAnimeId = null // НЕ удалять аниме при ошибке!
        const existingSeason = await db.findFirstSeason(animeId)
        seasonId = existingSeason?.id ?? ''
        log.info('Retranscode mode: используем существующее аниме', { animeId, seasonId })
        this.emitProgress(4, 'Retranscode: подготовка...', 'creating_anime')
      } else {
        this.setStage('creating_anime')
        this.emitProgress(1, 'Скачивание постера...', 'creating_anime')

        const posterId = await this.downloadAndSavePoster(entry.selectedAnime, animeFolderPath)
        log.debug('Постер', { posterId: posterId ?? 'нет' })

        this.emitProgress(2, 'Создание записи в БД...', 'creating_anime')
        animeId = await this.createAnimeRecord(entry.selectedAnime, entry.parsedInfo, animeFolderPath, posterId)
        this.createdAnimeId = animeId
        log.info('Аниме создано в БД', { animeId })

        // 2. Жанры и темы
        await this.saveGenresIfAvailable(animeId, entry.selectedAnime)

        // 3. Сезон
        this.emitProgress(3, 'Создание сезона...', 'creating_anime')
        seasonId = await this.createSeasonRecord(animeId, entry.selectedAnime, entry.parsedInfo)
        log.info('Сезон создан', { seasonId, seasonNum })
      }

      // 4. Внешние субтитры
      this.emitProgress(4, 'Сканирование субтитров...', 'creating_anime')
      const externalSubsMap = entry.isFileMode
        ? new Map<
          number,
          Array<{
            filePath: string
            episodeNumber: number | null
            language: string
            format: string
            title?: string
            matchedFonts?: Array<{ name: string; path: string }>
          }>
        >()
        : await this.scanExternalSubs(entry.folderPath, selectedFiles)

      // 4.5. Pre-encode: пережимаем исходники в H264 если включено
      if (entry.preEncode) {
        this.setStage('pre-encode')
        log.info('Pre-encode: включён', {
          crf: entry.preEncodeCrf ?? 14,
          preset: entry.preEncodePreset ?? 'medium',
          files: selectedFiles.length,
        })

        const { preEncodeFile } = await import('./pre-encode-step')
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        const cancelSignal = {
          get cancelled() {
            return self._isCancelled
          },
        }

        for (let i = 0; i < selectedFiles.length; i++) {
          if (this._isCancelled) {
            throw new Error('Импорт отменён пользователем')
          }

          const file = selectedFiles[i]
          const label = `Pre-encode ${i + 1}/${selectedFiles.length}: ${file.name}`
          this.emitProgress(1 + Math.round((i / selectedFiles.length) * 4), label, 'pre-encode')

          try {
            const result = await preEncodeFile(
              file.path,
              { crf: entry.preEncodeCrf, preset: entry.preEncodePreset },
              (percent) => {
                // Маппим 0-100% pre-encode в диапазон 1-5% общего прогресса
                const fileProgress = (i + percent / 100) / selectedFiles.length
                this.emitProgress(1 + Math.round(fileProgress * 4), label, 'pre-encode')
              },
              cancelSignal,
            )
            // Подменяем путь на temp — дальше pipeline работает с пережатым файлом
            preEncodeTempFiles.push(result.tempPath)
            ;(file as { path: string }).path = result.tempPath
            log.info('Pre-encode: файл готов', { episode: file.episodeNumber, tempPath: result.tempPath })
          } catch (err) {
            // Очищаем уже созданные temp файлы
            const { cleanupPreEncodeTemp } = await import('./pre-encode-step')
            for (const tempPath of preEncodeTempFiles) {
              cleanupPreEncodeTemp(tempPath)
            }
            throw new Error(
              `Pre-encode эпизода #${file.episodeNumber} не удался: ${
                err instanceof Error ? err.message : String(err)
              }`,
            )
          }
        }

        log.info('Pre-encode: все файлы готовы', { count: selectedFiles.length })
      }

      // 5. Обработка файлов (demux + создание эпизодов)
      this.setStage('demuxing')
      this.emitProgress(5, `Демукс 0/${selectedFiles.length}...`, 'demuxing')
      const demuxLimiter = createConcurrencyLimiter(2)
      let completedFiles = 0

      const processFile = async (file: { path: string; name: string; episodeNumber: number; selected: boolean }) => {
        if (this._isCancelled) {
          throw new Error('Импорт отменён пользователем')
        }

        const episodeOutputDir = await ensureEpisodeDirectory({
          libraryPath,
          animeName,
          seasonNumber: seasonNum,
          episodeNumber: file.episodeNumber,
        })

        // Demux — показываем прогресс с именем текущего файла (5-15%)
        const fileLabel = `Демукс ${completedFiles + 1}/${selectedFiles.length}: ${file.name}`
        this.emitProgress(5 + Math.round((completedFiles / selectedFiles.length) * 10), fileLabel, 'demuxing')
        const demuxResult = await demuxLimiter(() =>
          demuxFile(file.path, episodeOutputDir, {
            skipVideo: true,
            audioExtractMode: 'smart',
            onProgress: (fraction) => {
              // Маппим fraction 0..1 текущего файла в общий диапазон 5-15%
              const overallFraction = (completedFiles + fraction) / selectedFiles.length
              const percent = 5 + Math.round(overallFraction * 10)
              this.emitProgress(percent, fileLabel, 'demuxing')
            },
          })
        )

        completedFiles++
        this.setFileProgress(completedFiles, selectedFiles.length, `Демукс ${completedFiles}/${selectedFiles.length}`)

        if (this._isCancelled) {
          throw new Error('Импорт отменён пользователем')
        }

        const videoOutputPath = `${episodeOutputDir}/video.webm`
        const videoInputPath = file.path

        // Создаём Episode (или обновляем существующий при retranscode)
        let episodeId: string

        if (entry.isRetranscode) {
          const existing = await db.findEpisodeByNumber(animeId, file.episodeNumber)
          if (existing) {
            // Замена существующего: удаляем старые треки и обновляем метаданные
            episodeId = existing.id
            await db.deleteEpisodeTracks(episodeId)
            log.info('Retranscode: треки удалены, пересоздаём', { episodeId, episodeNumber: file.episodeNumber })
            await db.updateEpisode(episodeId, {
              folderPath: episodeOutputDir,
              durationMs: demuxResult.video ? Math.round(demuxResult.video.duration * 1000) : undefined,
              videoWidth: demuxResult.video?.width,
              videoHeight: demuxResult.video?.height,
              videoBitDepth: demuxResult.video?.bitDepth,
              // Сбрасываем CID — будут заново установлены в postProcess
              transcodedCid: null,
              manifestCid: null,
              ipfsSize: null,
              thumbnailCids: null,
              screenshotCids: null,
              metadataCid: null,
            })
          } else {
            // Новый эпизод в retranscode-режиме: создаём как обычно
            log.info('Retranscode: новый эпизод, создаём', { animeId, episodeNumber: file.episodeNumber })
            const episodeResult = await db.upsertEpisode({
              animeId,
              seasonId,
              number: file.episodeNumber,
              folderPath: episodeOutputDir,
              durationMs: demuxResult.video ? Math.round(demuxResult.video.duration * 1000) : undefined,
              videoWidth: demuxResult.video?.width,
              videoHeight: demuxResult.video?.height,
              videoBitDepth: demuxResult.video?.bitDepth,
            })
            episodeId = episodeResult.id
            log.info('Retranscode: новый эпизод создан', { episodeId, episodeNumber: file.episodeNumber })
          }
        } else {
          log.debug('Создаю эпизод', {
            animeId,
            seasonId,
            episodeNumber: file.episodeNumber,
            hasVideo: !!demuxResult.video,
            audioTracks: demuxResult.audioTracks?.length ?? 0,
            duration: demuxResult.video?.duration,
          })
          const episodeResult = await db.upsertEpisode({
            animeId,
            seasonId,
            number: file.episodeNumber,
            folderPath: episodeOutputDir,
            durationMs: demuxResult.video ? Math.round(demuxResult.video.duration * 1000) : undefined,
            videoWidth: demuxResult.video?.width,
            videoHeight: demuxResult.video?.height,
            videoBitDepth: demuxResult.video?.bitDepth,
          })
          episodeId = episodeResult.id
          log.info('Эпизод создан', { episodeId, episodeNumber: file.episodeNumber })
        }

        // Переопределения дорожек
        const fileAnalysis = fileAnalyses?.find((a) => a.episodeNumber === file.episodeNumber)
        const audioTrackOverrides = fileAnalysis?.audioRecommendations
          .filter((r) => r.enabled)
          .map((r) => ({ streamIndex: r.trackIndex, language: r.language, dubGroup: r.dubGroup }))
        const subtitleTrackOverrides = fileAnalysis?.subtitleRecommendations
          ?.filter((r) => r.enabled)
          .map((r) => ({ streamIndex: r.streamIndex, language: r.language, dubGroup: r.dubGroup }))

        // Данные для пост-обработки
        episodeOutputDirs.set(episodeId, episodeOutputDir)
        postProcessDataMap.set(episodeId, {
          episodeId,
          outputDir: episodeOutputDir,
          videoOutputPath,
          duration: demuxResult.video?.duration ?? 0,
          demuxResult,
          animeName,
          seasonNumber: seasonNum,
          episodeNumber: file.episodeNumber,
          sourcePath: file.path,
          audioTrackOverrides,
          subtitleTrackOverrides,
        })

        // Аудио и субтитры
        log.debug('Создаю аудио/субтитры', {
          episodeId,
          episodeNumber: file.episodeNumber,
          hasFileAnalysis: !!fileAnalyses?.find((a) => a.episodeNumber === file.episodeNumber),
          embeddedAudioCount: demuxResult.audioTracks?.length ?? 0,
          embeddedSubCount: demuxResult.subtitleTracks?.length ?? 0,
          externalSubsForEpisode: externalSubsMap.get(file.episodeNumber)?.length ?? 0,
        })
        const audioTracksToTranscode = await createAudioTracks(episodeId, demuxResult, fileAnalyses, file.episodeNumber)
        await createSubtitleTracks(
          episodeId,
          demuxResult,
          fileAnalyses,
          file.episodeNumber,
          episodeOutputDir,
          externalSubsMap,
        )

        // Главы
        const hasChaptersFromFile = await createChapters(episodeId, demuxResult)
        if (!hasChaptersFromFile && demuxResult.video?.duration) {
          episodesWithoutChapters.push({
            id: episodeId,
            sourcePath: file.path,
            durationMs: Math.round(demuxResult.video.duration * 1000),
          })
        }

        // BatchImportItem для транскодирования
        if (videoInputPath) {
          // Anime4K: фиксированный CQ 32 (VMAF не используется — апскейл всегда)
          const anime4kEnabled = importSettings?.anime4kEnabled && isAnime4KAvailable()
          const effectiveCq = importSettings?.cqOverride ?? encodingProfile?.cq ?? 28
          const videoOptions = buildVideoOptions(encodingProfile, effectiveCq)
          if (anime4kEnabled) {
            videoOptions.anime4kShaderPath = getAnime4KShaderPath()
          }
          if (importSettings?.denoiseEnabled) {
            videoOptions.denoiseEnabled = true
          }

          // Обновляем postProcessData
          const existing = postProcessDataMap.get(episodeId)
          if (existing) {
            postProcessDataMap.set(episodeId, {
              ...existing,
              encodingProfileId: encodingProfile?.id,
              encodingProfileName: encodingProfile?.name,
              videoOptions: {
                codec: videoOptions.codec,
                cq: videoOptions.cq,
                preset: videoOptions.preset,
                rateControl: videoOptions.rateControl ?? 'VBR',
                tune: videoOptions.tune,
                multipass: videoOptions.multipass,
                spatialAq: videoOptions.spatialAq,
                temporalAq: videoOptions.temporalAq,
                aqStrength: videoOptions.aqStrength,
                gopSize: videoOptions.gopSize,
                lookahead: videoOptions.lookahead ?? undefined,
                bRefMode: videoOptions.bRefMode,
                force10Bit: videoOptions.force10Bit,
              },
              vmafScore,
              encoderType: useCpuFallback ? 'cpu' : 'gpu',
              ffmpegVersion,
              videoMaxConcurrent,
              audioMaxConcurrent,
            })
          }

          // Размер видеопотока в исходнике (без аудио/сабов) для честного сравнения экономии
          const sourceStreamSize = demuxResult.video?.size
            ?? (demuxResult.video?.bitrate && demuxResult.video?.duration
              ? Math.round((demuxResult.video.bitrate * demuxResult.video.duration) / 8)
              : undefined)

          // Дедупликация имён
          const usedNames = new Set<string>()
          return {
            id: `import-${episodeId}`,
            episodeId,
            animeQueueItemId: entry.id,
            video: {
              inputPath: videoInputPath,
              outputPath: videoOutputPath,
              options: videoOptions,
              useCpuFallback,
              sourceStreamSize,
            },
            audioTracks: audioTracksToTranscode.map((track) => {
              let fileName = buildTrackFileName(track.language, track.dubGroup, 'm4a')
              if (usedNames.has(fileName)) {
                const base = fileName.slice(0, -4)
                let counter = 2
                while (usedNames.has(`${base}_${counter}.m4a`)) {
                  counter++
                }
                fileName = `${base}_${counter}.m4a`
              }
              usedNames.add(fileName)

              return {
                trackId: track.id,
                trackIndex: track.streamIndex,
                inputPath: track.inputPath,
                outputPath: track.passthrough ? track.inputPath : `${episodeOutputDir}/${fileName}`,
                options: { targetBitrate: entry.globalAudioBitrate ?? 192 },
                useStreamMapping: track.useStreamMapping,
                syncOffset: track.isDonor && syncOffset ? syncOffset : undefined,
                isExternal: track.isExternal,
                title: track.isExternal ? track.title : undefined,
                language: track.isExternal ? track.language : undefined,
                passthrough: track.passthrough,
                originalCodec: track.originalCodec,
              }
            }),
          } as BatchImportItem
        }

        return null
      }

      const batchResults = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await processFile(file)
          } catch (err) {
            const errMsg = err instanceof Error ? (err.stack ?? err.message) : String(err)
            log.error('Ошибка обработки файла, пропускаем', { file: file.name, error: errMsg })
            return null
          }
        }),
      )
      batchItems.push(...batchResults.filter((item): item is BatchImportItem => item !== null))

      log.info('Файлы обработаны', {
        totalFiles: selectedFiles.length,
        successfulBatchItems: batchItems.length,
        postProcessEntries: postProcessDataMap.size,
        episodeOutputDirs: episodeOutputDirs.size,
      })

      // 5.5. Автоопределение OP/ED для эпизодов без встроенных глав
      if (episodesWithoutChapters.length >= 2) {
        this.setStage('detecting_intros')
        this.emitProgress(13, `Определение OP/ED (${episodesWithoutChapters.length} эп.)...`, 'detecting_intros')
        try {
          const introResults = await detectIntros(
            episodesWithoutChapters.map((ep) => ({
              id: ep.id,
              sourcePath: ep.sourcePath,
              duration: ep.durationMs,
            })),
            (percent, stage) => {
              this.emitProgress(13 + Math.round(percent * 0.02), `OP/ED: ${stage}`, 'detecting_intros')
            },
          )

          // Сохраняем результаты как главы
          for (const result of introResults) {
            if (result.introStartMs != null || result.outroStartMs != null) {
              const chapters: Array<{
                startMs: number
                endMs: number
                title: string | null
                type: string
                skippable: boolean
              }> = []
              if (result.introStartMs != null && result.introEndMs != null) {
                chapters.push({
                  startMs: result.introStartMs,
                  endMs: result.introEndMs,
                  title: 'Opening',
                  type: 'op',
                  skippable: true,
                })
              }
              if (result.outroStartMs != null && result.outroEndMs != null) {
                chapters.push({
                  startMs: result.outroStartMs,
                  endMs: result.outroEndMs,
                  title: 'Ending',
                  type: 'ed',
                  skippable: true,
                })
              }
              if (chapters.length > 0) {
                await updateChaptersInManifest(result.episodeId, chapters)
                log.info('OP/ED сохранены', { episodeId: result.episodeId, chapters: chapters.length })
              }
            }
          }
        } catch (err) {
          log.warn('Не удалось определить OP/ED', { error: String(err) })
        }
      }

      // 6. Параллельное транскодирование
      let failedItemIds = new Set<string>()
      if (batchItems.length > 0) {
        this.setStage('transcoding_video')
        this.queueController.updateItemStatus(entry.id, 'transcoding')
        this.emitProgress(0, undefined, 'transcoding_video')
        failedItemIds = await this.runParallelTranscode(
          batchItems,
          postProcessDataMap,
          videoMaxConcurrent,
          audioMaxConcurrent,
        )

        if (this._isCancelled) {
          throw new Error('Импорт отменён пользователем')
        }

        // Исключаем failed эпизоды из постпроцесса
        if (failedItemIds.size > 0) {
          const failedEpisodeIds = new Set<string>()
          for (const item of batchItems) {
            if (failedItemIds.has(item.id)) {
              failedEpisodeIds.add(item.episodeId)
            }
          }
          for (const epId of failedEpisodeIds) {
            postProcessDataMap.delete(epId)
          }
          log.warn(`${failedItemIds.size} видео не транскодированы, пропускаем постпроцесс`, {
            failedEpisodeIds: [...failedEpisodeIds],
          })
        }

        // 7. Пост-обработка
        this.setStage('generating_manifests')
        this.queueController.updateItemStatus(entry.id, 'postprocess')
        const postProcessResult = await this.runPostProcess(postProcessDataMap)
        postProcessFailedEpisodes = postProcessResult.failedEpisodes
      }

      // Все файлы упали — не маскировать как success
      if (batchItems.length === 0 && selectedFiles.length > 0) {
        log.error('Все файлы не удалось обработать, импорт прерван', {
          totalFiles: selectedFiles.length,
          postProcessEntries: postProcessDataMap.size,
        })
        return {
          success: false,
          error: `Все ${selectedFiles.length} файлов не удалось обработать — проверьте логи`,
        }
      }

      if (this._isCancelled) {
        throw new Error('Импорт отменён пользователем')
      }

      // 8. Синхронизация связей (пропускаем при retranscode — уже есть)
      if (!entry.isRetranscode) {
        this.setStage('syncing_relations')
        this.emitProgress(90, undefined, 'syncing_relations')
        await this.syncRelations(animeId, entry.selectedAnime)
        await this.updateEpisodeNavigation(animeId)
      }

      if (this._isCancelled) {
        throw new Error('Импорт отменён пользователем')
      }

      // 9. AnimeManifest
      this.setStage('generating_manifests')
      this.emitProgress(95, 'Генерация AnimeManifest...', 'generating_manifests')
      await this.generateAndPublishAnimeManifest(animeId)

      this.setStage('done')

      // Собираем все предупреждения
      const warnings: string[] = []

      // Частичный успех — часть видео не транскодирована
      const failedCount = failedItemIds?.size ?? 0
      const successCount = selectedFiles.length - failedCount
      if (failedCount > 0 && successCount > 0) {
        warnings.push(`${failedCount} из ${selectedFiles.length} видео не удалось транскодировать`)
      }
      if (failedCount > 0 && successCount === 0) {
        return {
          success: false,
          error: `Все ${selectedFiles.length} видео не удалось транскодировать`,
        }
      }

      // Ошибки пост-обработки (IPFS загрузка) — с причинами
      if (postProcessFailedEpisodes.length > 0) {
        const sorted = postProcessFailedEpisodes.sort((a, b) => a.number - b.number)

        // Группируем по одинаковой ошибке — чтобы не дублировать текст для каждого эпизода
        const byError = new Map<string, number[]>()
        for (const { number: num, error } of sorted) {
          // Сокращаем длинные ошибки до первых 120 символов
          const shortError = error.length > 120 ? `${error.slice(0, 120)}…` : error
          const existing = byError.get(shortError)
          if (existing) {
            existing.push(num)
          } else {
            byError.set(shortError, [num])
          }
        }

        for (const [error, eps] of byError) {
          warnings.push(`Эп. ${eps.join(', ')}: ${error}`)
        }
      }

      const warning = warnings.length > 0 ? warnings.join('; ') : undefined

      // Реимпорт (retranscode) на новый pinner-сервер прошёл чисто — снимаем метку needsReupload.
      // При частичном успехе (failedCount/postProcessFailedEpisodes > 0) флаг оставляем —
      // contentHealth/missingCids всё равно покажут что не хватает, пусть пользователь перезальёт ещё раз.
      if (entry.isRetranscode && entry.existingAnimeId && failedCount === 0 && postProcessFailedEpisodes.length === 0) {
        await db.updateAnime(entry.existingAnimeId, { needsReupload: false }).catch((err) => {
          log.warn('Не удалось снять needsReupload после реимпорта', {
            animeId: entry.existingAnimeId,
            error: String(err),
          })
        })
      }

      return {
        success: true,
        animeId,
        episodeCount: successCount > 0 ? successCount : selectedFiles.length,
        warning,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const reason = this._isCancelled ? 'cancel' : 'error'

      // Cleanup IPFS — двухуровневый:
      // 1) deleteAnimeContent() — открепляет CID из БД (audio/subtitle, загруженные renderer'ом)
      // 2) getTrackedCids() — открепляет CID, загруженные в main (видео, скриншоты, манифесты),
      //    которые могли не попасть в БД (ошибка между upload и save)
      if (this.createdAnimeId) {
        // Шаг 1: открепляем CID, уже записанные в БД (ПЕРЕД удалением записей!)
        try {
          const { deleteAnimeContent } = await import('../content-deletion')
          const contentResult = await deleteAnimeContent(this.createdAnimeId)
          log.info(`Cleanup (${reason}): откреплено ${contentResult.deletedCids} CID из БД`)
        } catch (contentError) {
          log.warn('Cleanup: ошибка открепления контента из БД', { error: String(contentError) })
        }
      }

      // Шаг 2: открепляем CID, загруженные в main process за время импорта (не попавшие в БД)
      const trackedCids = getTrackedCids()
      if (trackedCids.size > 0) {
        log.warn(`Cleanup (${reason}): проверяем ${trackedCids.size} tracked CID`)
        try {
          const { getPinManager } = await import('../ipfs')
          const pinManager = getPinManager()
          let unpinned = 0
          for (const cid of trackedCids) {
            try {
              const isPinned = await pinManager.isPinned(cid)
              if (isPinned) {
                await pinManager.unpin(cid)
                unpinned++
              }
            } catch {
              // Не критично — CID мог быть уже откреплён
            }
          }
          if (unpinned > 0) {
            log.info(`Cleanup: дополнительно откреплено ${unpinned} tracked CID`)
          }
        } catch (unpinError) {
          log.error('Cleanup: ошибка открепления tracked CID', { error: String(unpinError) })
        }
      }

      // Cleanup DB
      if (this.createdAnimeId) {
        log.warn(`Cleanup (${reason}): удаляем аниме из БД`, { animeId: this.createdAnimeId })
        try {
          await db.deleteAnime(this.createdAnimeId)
        } catch (dbError) {
          log.error('Не удалось удалить аниме из БД', { error: String(dbError) })
        }
        this.createdAnimeId = null
      }

      if (this.createdAnimeFolder) {
        log.warn(`Cleanup (${reason}): удаляем папку`, { folder: this.createdAnimeFolder })
        try {
          fs.rmSync(this.createdAnimeFolder, { recursive: true, force: true })
        } catch {
          /* не критично */
        }
        this.createdAnimeFolder = null
      }

      return { success: false, error: errorMessage }
    } finally {
      // Очистка pre-encode temp файлов (оригиналы не тронуты)
      if (preEncodeTempFiles.length > 0) {
        const { cleanupPreEncodeTemp } = await import('./pre-encode-step')
        for (const tempPath of preEncodeTempFiles) {
          cleanupPreEncodeTemp(tempPath)
        }
        log.debug('Pre-encode: temp файлы очищены', { count: preEncodeTempFiles.length })
      }
      stopCidTracking()
      this.currentItemId = null
    }
  }

  /**
   * Отмена импорта
   */
  async cancel(): Promise<void> {
    log.warn('Отмена импорта...')
    this._isCancelled = true
    try {
      const ptm = ParallelTranscodeManager.getInstance()
      await ptm.cancelAll()
    } catch (error) {
      log.error('Ошибка отмены', { error: String(error) })
    }
  }

  // ========================
  // Приватные методы
  // ========================

  private async loadEncodingProfile(profileId?: string | null) {
    try {
      if (profileId) {
        const profile = await db.findEncodingProfile(profileId)
        if (profile) {
          return profile
        }
      }
      return await db.getDefaultEncodingProfile()
    } catch (error) {
      log.warn('Не удалось загрузить профиль', { error: String(error) })
      return null
    }
  }

  private async downloadAndSavePoster(
    selectedAnime: ImportQueueEntry['selectedAnime'],
    folderPath: string,
  ): Promise<string | undefined> {
    try {
      // Проверяем, есть ли постер у аниме с таким же shikimoriId (из предыдущего импорта)
      const shikimoriId = Number.parseInt(selectedAnime.id, 10)
      if (!Number.isNaN(shikimoriId)) {
        const existingAnime = await db.findAnimeByShikimoriId(shikimoriId)
        if (existingAnime?.posterId && existingAnime?.poster?.cid) {
          log.debug('Постер уже в IPFS, пропускаем скачивание', { shikimoriId, cid: existingAnime.poster.cid })
          return existingAnime.posterId
        }
      }

      const posterUrl = getPosterUrl(selectedAnime.posterUrl)
      if (!posterUrl) {
        return undefined
      }

      // Скачиваем постер с retry (Shikimori DDoS-Guard может блокировать первую попытку)
      let posterResult = await downloadPoster(posterUrl, selectedAnime.id, { savePath: folderPath })
      if (!posterResult) {
        log.info('Первая попытка скачивания постера не удалась, повторяем через 3сек', { posterUrl })
        await new Promise((resolve) => setTimeout(resolve, 3000))
        posterResult = await downloadPoster(posterUrl, selectedAnime.id, { savePath: folderPath })
      }
      if (!posterResult) {
        log.warn('Постер не скачан после 2 попыток', { posterUrl, animeId: selectedAnime.id })
        return undefined
      }

      // Загружаем постер в IPFS
      const ipfsResult = await uploadToIpfs(posterResult.localPath)
      const posterCid = ipfsResult?.cid
      if (!posterCid) {
        log.warn('Постер скачан, но IPFS upload вернул null — файл сохранён без CID', {
          localPath: posterResult.localPath,
          animeId: selectedAnime.id,
        })
      }

      const fileResult = await db.upsertFile({
        filename: posterResult.filename ?? `${selectedAnime.id}.jpg`,
        mimeType: posterResult.mimeType ?? 'image/jpeg',
        size: posterResult.size ?? 0,
        width: posterResult.width,
        height: posterResult.height,
        blurDataURL: posterResult.blurDataURL,
        category: 'POSTER',
        source: 'shikimori',
        cid: posterCid ?? undefined,
      })

      // Удаляем локальный файл
      if (posterCid) {
        try {
          fs.unlinkSync(posterResult.localPath)
        } catch {
          /* не критично */
        }
      }

      return fileResult.id
    } catch (error) {
      log.warn('Скачивание постера не удалось, продолжаем без постера', { error: String(error) })
      return undefined
    }
  }

  private async createAnimeRecord(
    selectedAnime: ImportQueueEntry['selectedAnime'],
    parsedInfo: ImportQueueEntry['parsedInfo'],
    folderPath: string,
    posterId?: string,
  ): Promise<string> {
    const animeResult = await db.upsertAnime({
      name: selectedAnime.russian ?? selectedAnime.name,
      originalName: selectedAnime.name,
      nameEn: null,
      year: selectedAnime.airedOn ? parseInt(selectedAnime.airedOn.split('-')[0]) : null,
      status: mapShikimoriStatus(selectedAnime.status ?? 'released'),
      shikimoriId: parseInt(selectedAnime.id, 10),
      posterId,
      folderPath,
      episodeCount: selectedAnime.episodes ?? 0,
      isBdRemux: parsedInfo.isBdRemux,
      rutrackerUrl: parsedInfo.rutrackerUrl ?? null,
    })
    return animeResult.id
  }

  private async createSeasonRecord(
    animeId: string,
    selectedAnime: ImportQueueEntry['selectedAnime'],
    parsedInfo: ImportQueueEntry['parsedInfo'],
  ): Promise<string> {
    const seasonNum = parsedInfo.seasonNumber ?? 1
    const result = await db.upsertSeason({
      animeId,
      number: seasonNum,
      name: `Сезон ${seasonNum}`,
      type: mapSeasonType(selectedAnime.kind ?? null),
    })
    return result.id
  }

  private async saveGenresIfAvailable(
    animeId: string,
    selectedAnime: ImportQueueEntry['selectedAnime'],
  ): Promise<void> {
    // selectedAnime может содержать genres из расширенных данных Shikimori
    const extAnime = selectedAnime as { genres?: Array<{ id: number; name: string; russian: string; kind?: string }> }
    if (!extAnime.genres?.length) {
      return
    }

    try {
      await db.saveGenresAndThemes(
        animeId,
        extAnime.genres.map((g) => ({
          id: g.id,
          name: g.name,
          russian: g.russian,
          kind: g.kind ?? 'genre',
        })),
      )
    } catch (err) {
      log.warn('Не удалось сохранить жанры', { error: String(err) })
    }
  }

  private async scanExternalSubs(
    folderPath: string,
    selectedFiles: Array<{ path: string; episodeNumber: number }>,
  ): Promise<Map<number, ExternalSubtitleMatch[]>> {
    try {
      const result = await scanForExternalSubtitles(
        folderPath,
        selectedFiles.map((f) => ({ path: f.path, episodeNumber: f.episodeNumber })),
      )

      // scanForExternalSubtitles возвращает { subtitles[] }, группируем в Map по episodeNumber
      const map = new Map<number, ExternalSubtitleMatch[]>()
      for (const sub of result.subtitles) {
        if (sub.episodeNumber == null) {
          continue
        }
        const existing = map.get(sub.episodeNumber) ?? []
        existing.push(sub)
        map.set(sub.episodeNumber, existing)
      }
      log.debug('Внешние субтитры сгруппированы', {
        totalMatched: result.subtitles.length,
        episodes: map.size,
        unmatched: result.unmatchedFiles.length,
      })
      return map
    } catch (error) {
      log.warn('Не удалось сканировать внешние субтитры', { error: String(error) })
      return new Map()
    }
  }

  private async runParallelTranscode(
    batchItems: BatchImportItem[],
    postProcessDataMap: Map<string, PostProcessData>,
    videoMaxConcurrent: number,
    audioMaxConcurrent: number,
  ): Promise<Set<string>> {
    const ptm = ParallelTranscodeManager.getInstance()
    const completedIds = new Set<string>()
    const totalItems = batchItems.length
    const expectedItemIds = new Set(batchItems.map((item) => item.id))

    log.info(`runParallelTranscode: ожидаем ${totalItems} items`, {
      expectedIds: [...expectedItemIds],
    })

    const failedItemIds = new Set<string>()

    const completionPromise = new Promise<void>((resolve, reject) => {
      let stalledTimer: ReturnType<typeof setTimeout> | null = null
      // 30 мин без ЛЮБОЙ активности (progress/completion) = зависание
      // BDRip с VMAF CQ 40 может кодировать одну серию > 10 минут
      const STALLED_TIMEOUT = 30 * 60 * 1000
      // Периодический лог каждые 60с для диагностики
      let diagnosticTimer: ReturnType<typeof setInterval> | null = null
      // Трекаем последний процент прогресса для определения реальной активности
      let lastProgressPercent = -1

      const resetStalledTimer = () => {
        if (stalledTimer) {
          clearTimeout(stalledTimer)
        }
        stalledTimer = setTimeout(() => {
          const pendingIds = [...expectedItemIds].filter((id) => !completedIds.has(id))
          log.error(`STALLED: ${completedIds.size}/${totalItems} completed, pending: ${pendingIds.join(', ')}`)
          // Не блокируем — продолжаем с тем что есть
          cleanup()
          resolve()
        }, STALLED_TIMEOUT)
      }

      const startDiagnostic = () => {
        diagnosticTimer = setInterval(() => {
          const pendingIds = [...expectedItemIds].filter((id) => !completedIds.has(id))
          log.info(`Transcode progress: ${completedIds.size}/${totalItems}, pending: ${pendingIds.length}`, {
            pendingIds: pendingIds.slice(0, 5),
          })
        }, 60_000)
      }

      resetStalledTimer()
      startDiagnostic()

      // Слушаем события напрямую от ParallelTranscodeManager (без IPC)
      // Сбрасываем stalled timer при ЛЮБОМ изменении прогресса — иначе
      // при кодировании длинных серий (>10 мин) timer срабатывает раньше
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onProgress = (progress: any) => {
        const vDone = progress?.videoTasks?.completed ?? 0
        const vTotal = progress?.videoTasks?.total ?? totalItems
        const aDone = progress?.audioTasks?.completed ?? 0
        const aTotal = progress?.audioTasks?.total ?? 0
        const pct = progress?.totalPercent ?? 0

        // Сбрасываем stalled timer если прогресс реально изменился
        const roundedPct = Math.round(pct * 10)
        if (roundedPct !== lastProgressPercent) {
          lastProgressPercent = roundedPct
          resetStalledTimer()
        }

        // Маппим PTM 0-100% в диапазон 15-90%
        const mappedPercent = 15 + Math.round(pct * 0.75)
        this.emitProgress(mappedPercent, `Энкод: ${vDone}/${vTotal} видео, ${aDone}/${aTotal} аудио`, 'transcoding')
      }

      const onVideoCompleted = (
        _itemId: string,
        episodeId: string,
        _outputPath: string,
        meta: { ffmpegCommand?: string; transcodeDurationMs?: number; activeGpuWorkers?: number },
      ) => {
        this.videoEncodingMeta.set(episodeId, meta)
      }

      const onItemCompleted = (itemId: string, _episodeId: string, success: boolean, errorMessage?: string) => {
        if (!expectedItemIds.has(itemId)) {
          return
        }

        completedIds.add(itemId)
        log.info(`Item completed: ${itemId}, ${completedIds.size}/${totalItems}, success=${success}`)

        if (!success) {
          failedItemIds.add(itemId)
          log.error(`Ошибка транскодирования item ${itemId}: ${errorMessage ?? 'unknown'}`)
        }

        if (completedIds.size >= totalItems) {
          cleanup()
          resolve()
        } else {
          // Сбрасываем stalled timer только на completion
          resetStalledTimer()
        }
      }

      const onBatchError = (error: string) => {
        cleanup()
        reject(new Error(`Batch error: ${error}`))
      }

      const onAllCancelled = () => {
        cleanup()
        reject(new Error('Импорт отменён пользователем'))
      }

      const cleanup = () => {
        if (stalledTimer) {
          clearTimeout(stalledTimer)
        }
        if (diagnosticTimer) {
          clearInterval(diagnosticTimer)
        }
        ptm.removeListener('aggregatedProgress', onProgress)
        ptm.removeListener('videoCompleted', onVideoCompleted)
        ptm.removeListener('itemCompleted', onItemCompleted)
        ptm.removeListener('batchError', onBatchError)
        ptm.removeListener('allCancelled', onAllCancelled)
      }

      ptm.on('aggregatedProgress', onProgress)
      ptm.on('videoCompleted', onVideoCompleted)
      ptm.on('itemCompleted', onItemCompleted)
      ptm.on('batchError', onBatchError)
      ptm.on('allCancelled', onAllCancelled)
    })

    // Запуск — ВАЖНО: startNewBatch вызывает reset(), который сбрасывает processingItemId.
    // Поэтому setProcessingItem ДОЛЖЕН быть ПОСЛЕ startNewBatch.
    ptm.startNewBatch(batchItems, undefined, { videoMaxConcurrent, audioMaxConcurrent })

    // Устанавливаем processingItemId ПОСЛЕ startNewBatch (reset() уже отработал)
    // updateImportQueueProgressFromMain проверяет его для маршрутизации прогресса в UI
    if (this.currentItemId) {
      const setResult = ptm.setProcessingItem(this.currentItemId)
      log.info('setProcessingItem', {
        itemId: this.currentItemId,
        success: setResult,
        currentProcessingId: ptm.getProcessingItemId(),
      })
    }

    await completionPromise

    // Сбрасываем processingItemId после завершения
    ptm.setProcessingItem(null)

    return failedItemIds
  }

  private async runPostProcess(
    postProcessDataMap: Map<string, PostProcessData>,
  ): Promise<{ failedEpisodes: Array<{ number: number; error: string }> }> {
    const episodes = Array.from(postProcessDataMap.values())
    const totalEpisodes = episodes.length
    const failedEpisodes: Array<{ number: number; error: string }> = []

    for (let i = 0; i < episodes.length; i++) {
      const data = episodes[i]

      const epLabel = `${i + 1}/${totalEpisodes} — Серия ${data.episodeNumber}`
      this.emitProgress(91 + (i / totalEpisodes) * 4, `${epLabel}: скриншоты...`, 'postprocess_screenshots')

      try {
        let thumbnailCidsJson: string | undefined
        let screenshotCidsJson: string | undefined

        // Скриншоты
        if (data.duration > 0) {
          try {
            const screenshotResult = await generateScreenshots(data.sourcePath, data.outputDir, data.duration, {
              count: 5,
              format: 'webp',
              thumbnailWidth: 320,
              fullWidth: 1280,
              quality: 80,
            })

            if (screenshotResult.thumbnails?.length) {
              const thumbnailResults = await Promise.all(
                screenshotResult.thumbnails.map((p: string) => uploadToIpfs(p)),
              )
              const validThumbnailCids = thumbnailResults
                .filter((r): r is NonNullable<typeof r> => r !== null)
                .map((r) => r.cid)
              if (validThumbnailCids.length > 0) {
                thumbnailCidsJson = JSON.stringify(validThumbnailCids)
                for (const thumbPath of screenshotResult.thumbnails) {
                  try {
                    fs.unlinkSync(thumbPath)
                  } catch {
                    /* ignore */
                  }
                }
              }

              if (screenshotResult.fullSize?.length) {
                const screenshotResults = await Promise.all(
                  screenshotResult.fullSize.map((p: string) => uploadToIpfs(p)),
                )
                const validScreenshotCids = screenshotResults
                  .filter((r): r is NonNullable<typeof r> => r !== null)
                  .map((r) => r.cid)
                if (validScreenshotCids.length > 0) {
                  screenshotCidsJson = JSON.stringify(validScreenshotCids)
                  for (const ssPath of screenshotResult.fullSize) {
                    try {
                      fs.unlinkSync(ssPath)
                    } catch {
                      /* ignore */
                    }
                  }
                }
              }
            }
          } catch (e) {
            log.warn(`Не удалось создать скриншоты`, { episode: data.episodeNumber, error: String(e) })
          }
        }

        // Thumbnail sprite
        this.emitProgress(91 + (i / totalEpisodes) * 4, `${epLabel}: превью-спрайт...`, 'postprocess_sprite')
        let spriteData: { vttCid: string; spriteCid: string } | undefined
        if (data.duration > 0) {
          try {
            const spriteResult = await generateThumbnailSprite(data.sourcePath, data.outputDir, data.duration, {
              frameCount: 100,
              frameWidth: 160,
              frameHeight: 90,
              columns: 10,
              quality: 75,
            })

            if (spriteResult.spritePath && spriteResult.vttPath) {
              const [vttResult, spriteUploadResult] = await Promise.all([
                uploadToIpfs(spriteResult.vttPath),
                uploadToIpfs(spriteResult.spritePath),
              ])
              if (vttResult?.cid && spriteUploadResult?.cid) {
                spriteData = { vttCid: vttResult.cid, spriteCid: spriteUploadResult.cid }
                try {
                  fs.unlinkSync(spriteResult.vttPath)
                  fs.unlinkSync(spriteResult.spritePath)
                } catch {
                  /* ignore */
                }
              }
            }
          } catch (e) {
            log.warn(`Не удалось создать sprite`, { episode: data.episodeNumber, error: String(e) })
          }
        }

        // Манифест
        this.emitProgress(92 + (i / totalEpisodes) * 4, `${epLabel}: манифест...`, 'postprocess_manifest')

        const manifestPath = `${data.outputDir}/manifest.json`
        await generateManifestFromDemux(data.demuxResult, {
          episodeId: data.episodeId,
          videoPath: data.sourcePath,
          outputDir: data.outputDir,
          animeInfo: {
            animeName: data.animeName,
            seasonNumber: data.seasonNumber,
            episodeNumber: data.episodeNumber,
          },
          audioTrackOverrides: data.audioTrackOverrides,
          subtitleTrackOverrides: data.subtitleTrackOverrides,
        })

        if (spriteData) {
          try {
            await updateManifestThumbnails(manifestPath, spriteData)
          } catch {
            /* ignore */
          }
        }

        // Encoding info
        if (data.videoOptions) {
          try {
            const encodingMeta = this.videoEncodingMeta.get(data.episodeId)
            const sourceSizeNum = data.demuxResult.video?.size
              ?? (data.demuxResult.video?.bitrate && data.demuxResult.video?.duration
                ? Math.round((data.demuxResult.video.bitrate * data.demuxResult.video.duration) / 8)
                : undefined)
            let transcodedSizeNum: number | undefined
            try {
              const stats = fs.statSync(data.videoOutputPath)
              transcodedSizeNum = stats.size
            } catch {
              /* ignore */
            }

            await updateManifestEncoding(manifestPath, {
              profileName: data.encodingProfileName ?? 'default',
              codec: data.videoOptions.codec,
              cq: data.videoOptions.cq,
              preset: data.videoOptions.preset,
              rateControl: data.videoOptions.rateControl,
              spatialAq: data.videoOptions.spatialAq,
              temporalAq: data.videoOptions.temporalAq,
              aqStrength: data.videoOptions.aqStrength,
              force10Bit: data.videoOptions.force10Bit,
              vmafScore: data.vmafScore,
              encoderType: data.encoderType ?? 'gpu',
              ffmpegCommand: encodingMeta?.ffmpegCommand,
              transcodeDurationMs: encodingMeta?.transcodeDurationMs,
              activeGpuWorkers: encodingMeta?.activeGpuWorkers,
              sourceSize: sourceSizeNum,
              transcodedSize: transcodedSizeNum,
              compressionRatio: sourceSizeNum && transcodedSizeNum ? transcodedSizeNum / sourceSizeNum : undefined,
              sourceCodec: data.demuxResult.video?.codec,
              sourceWidth: data.demuxResult.video?.width,
              sourceHeight: data.demuxResult.video?.height,
              sourceBitrate: data.demuxResult.video?.bitrate,
              sourceBitDepth: data.demuxResult.video?.bitDepth,
            })
          } catch {
            /* ignore */
          }
        }

        // Загружаем видео в IPFS
        this.emitProgress(
          93 + (i / totalEpisodes) * 4,
          `${epLabel}: загрузка видео в IPFS...`,
          'postprocess_ipfs_video',
        )
        const videoUploadResult = await uploadToIpfs(data.videoOutputPath)
        const transcodedCid = videoUploadResult?.cid
        const videoIpfsSize = videoUploadResult?.size
        if (!transcodedCid) {
          throw new Error(`Не удалось загрузить video.webm в IPFS: ${data.videoOutputPath}`)
        }
        if (transcodedCid) {
          try {
            fs.unlinkSync(data.videoOutputPath)
          } catch {
            /* ignore */
          }
        }

        // Обновляем манифест с CID'ами
        try {
          const dbAudioTracks = await db.findManyAudioTracks(data.episodeId)
          const dbSubtitleTracks = await db.findManySubtitleTracks(data.episodeId)

          const audioTrackCids: Record<string, string> = {}
          const audioTrackCodecs: Record<string, string> = {}
          const audioTrackChannels: Record<string, string> = {}
          const sizes: Record<string, number> = {}

          if (transcodedCid && videoIpfsSize) {
            sizes[transcodedCid] = videoIpfsSize
          }

          for (const t of dbAudioTracks) {
            const trackId = `audio-${t.streamIndex}`
            if (t.transcodedCid) {
              audioTrackCids[trackId] = t.transcodedCid
              if (t.ipfsSize) {
                sizes[t.transcodedCid] = t.ipfsSize
              }
            }
            if (t.codec) {
              audioTrackCodecs[trackId] = t.codec
            }
            if (t.channels) {
              audioTrackChannels[trackId] = t.channels
            }
          }

          const subtitleTrackCids: Record<string, string> = {}
          for (const t of dbSubtitleTracks) {
            if (t.fileCid) {
              subtitleTrackCids[`sub-${t.streamIndex}`] = t.fileCid
              if (t.ipfsSize) {
                sizes[t.fileCid] = t.ipfsSize
              }
            }
          }

          await updateManifestMediaCids(manifestPath, {
            videoCid: transcodedCid ?? undefined,
            audioTrackCids,
            audioTrackCodecs,
            audioTrackChannels,
            subtitleTrackCids,
            sizes,
          })
        } catch {
          /* ignore */
        }

        // Rebuild tracks из БД (полные данные для манифеста)
        try {
          const audioForManifest = await db.findAudioTracksForManifest(data.episodeId)
          const subsForManifest = await db.findSubtitleTracksForManifest(data.episodeId)
          rebuildManifestTracksFromFile(manifestPath, audioForManifest, subsForManifest)
        } catch {
          /* ignore */
        }

        // Metadata JSON
        const metadataJsonPath = data.demuxResult.metadata?.path
        let metadataCid: string | undefined
        if (metadataJsonPath) {
          metadataCid = (await uploadToIpfs(metadataJsonPath))?.cid ?? undefined
          if (metadataCid) {
            try {
              await updateManifestMediaCids(manifestPath, { metadataCid })
            } catch {
              /* ignore */
            }
            try {
              fs.unlinkSync(metadataJsonPath)
            } catch {
              /* ignore */
            }
          }
        }

        // Загружаем манифест в IPFS
        this.emitProgress(94 + (i / totalEpisodes) * 4, `${epLabel}: публикация манифеста...`, 'postprocess_publish')
        const manifestUploadResult = await uploadToIpfs(manifestPath)
        const manifestCid = manifestUploadResult?.cid
        if (manifestCid) {
          try {
            fs.unlinkSync(manifestPath)
          } catch {
            /* ignore */
          }
        }

        // Обновляем Episode
        await db.updateEpisode(data.episodeId, {
          transcodedCid: transcodedCid ?? undefined,
          ipfsSize: videoIpfsSize ?? undefined,
          manifestCid: manifestCid ?? undefined,
          thumbnailCids: thumbnailCidsJson,
          screenshotCids: screenshotCidsJson,
          metadataCid: metadataCid ?? undefined,
          // Проверяем существование профиля (мог быть удалён re-seedом во время транскодирования)
          encodingProfileId: data.encodingProfileId
            ? ((await db.findEncodingProfile(data.encodingProfileId))?.id ?? null)
            : undefined,
        })

        // Удаляем папку эпизода
        try {
          fs.rmSync(data.outputDir, { recursive: true, force: true })
        } catch {
          /* ignore */
        }

        log.info(`Episode ${data.episodeNumber} completed`)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        log.error(`Ошибка пост-обработки episode ${data.episodeNumber}`, { error: errorMsg })
        failedEpisodes.push({ number: data.episodeNumber, error: errorMsg })
      }
    }

    // Удаляем корневую папку аниме
    if (this.createdAnimeFolder) {
      try {
        fs.rmSync(this.createdAnimeFolder, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }

    return { failedEpisodes }
  }

  private async syncRelations(animeId: string, selectedAnime: ImportQueueEntry['selectedAnime']): Promise<void> {
    const shikimoriId = parseInt(selectedAnime.id, 10)
    if (!shikimoriId) {
      return
    }

    try {
      const animeWithRelated = await getAnimeWithRelated(shikimoriId)
      if (!animeWithRelated?.related?.length) {
        return
      }

      // Маппинг связей (как в franchise.handlers.ts)
      const RELATION_KIND_MAP: Record<string, string> = {
        sequel: 'SEQUEL',
        prequel: 'PREQUEL',
        side_story: 'SIDE_STORY',
        summary: 'SUMMARY',
        parent_story: 'PARENT_STORY',
        alternative_version: 'ALTERNATIVE_VERSION',
        alternative_setting: 'ALTERNATIVE_SETTING',
        spin_off: 'SPIN_OFF',
        full_story: 'FULL_STORY',
        other: 'OTHER',
      }

      const relatedAnimes: Array<{ shikimoriId: number; relationKind: string; name: string }> = []
      for (const related of animeWithRelated.related) {
        if (!related.anime || related.anime.kind === 'music') {
          continue
        }
        relatedAnimes.push({
          shikimoriId: parseInt(related.anime.id, 10),
          relationKind: RELATION_KIND_MAP[related.relationKind] || 'OTHER',
          name: related.anime.russian || related.anime.name,
        })
      }

      if (relatedAnimes.length === 0) {
        return
      }

      await db.syncAnimeRelations(
        animeId,
        relatedAnimes.map((r) => ({ targetShikimoriId: r.shikimoriId, relationKind: r.relationKind })),
      )

      // Франшиза
      const allIds = [shikimoriId, ...relatedAnimes.map((r) => r.shikimoriId)]
      const rootShikimoriId = Math.min(...allIds)
      try {
        const franchise = await db.upsertFranchise(rootShikimoriId, animeWithRelated.russian || animeWithRelated.name)
        await db.updateAnime(animeId, { franchiseId: franchise.id })
      } catch (franchiseError) {
        log.warn('Не удалось создать франшизу', { error: String(franchiseError) })
      }
    } catch (error) {
      log.warn('Ошибка синхронизации связей', { error: String(error) })
    }
  }

  private async updateEpisodeNavigation(animeId: string): Promise<void> {
    try {
      const episodes = await db.findManyEpisodes(animeId)
      const episodesWithManifest = episodes.filter(
        (ep): ep is typeof ep & { manifestCid: string } => ep.manifestCid !== null,
      )

      if (episodesWithManifest.length < 2) {
        return
      }

      // Вызываем batch-операцию через manifest-generator напрямую
      // TODO: реализовать updateNavigationBatch в manifest-generator
      log.info(`updateEpisodeNavigation: ${episodesWithManifest.length} эпизодов`)
    } catch (error) {
      log.warn('Ошибка обновления навигации', { error: String(error) })
    }
  }

  private async generateAndPublishAnimeManifest(animeId: string): Promise<void> {
    try {
      await updateAnimeManifest(animeId)
      log.info('AnimeManifest опубликован')
    } catch (error) {
      log.warn('Ошибка генерации AnimeManifest', { error: String(error) })
    }
  }
}
