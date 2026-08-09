/**
 * Обработка одного файла эпизода: demux, создание/обновление Episode в БД,
 * аудио/субтитры/главы, сборка BatchImportItem для транскодирования.
 *
 * Выделено из ImportService.process() (замыкание processFile) — раньше опиралось
 * на `this` (emitProgress/isCancelled/videoEncodingMeta), теперь принимает контекст явно.
 */

import type { EncodingProfile } from '../../../renderer/src/generated/prisma'
import type { ImportQueueEntry } from '../../../shared/types/import-queue'
import type { BatchImportItem } from '../../../shared/types/parallel-transcode'
import { getAnime4KShaderPath, isAnime4KAvailable } from '../../ffmpeg/anime4k'
import { demuxFile } from '../../ffmpeg/demux'
import { createModuleLogger } from '../../utils/logger'
import type { ExternalSubtitleMatch } from '../external-subtitle-scanner'
import { ensureEpisodeDirectory } from '../output-path-resolver'
import { createAudioTracks } from './audio-track-creator'
import { createChapters } from './chapter-creator'
import { buildTrackFileName } from './helpers'
import * as db from './import-db'
import { createSubtitleTracks } from './subtitle-track-creator'
import type { PostProcessData } from './types'
import { buildVideoOptions } from './video-options-builder'

const log = createModuleLogger('ImportService')

export interface EpisodeFileProcessingContext {
  entry: ImportQueueEntry
  animeId: string
  seasonId: string
  seasonNum: number
  animeName: string
  libraryPath: string
  /** Общее количество выбранных файлов — знаменатель для расчёта прогресса */
  totalFiles: number
  /** Общий на все файлы счётчик завершённого demux — мутируется параллельными вызовами */
  fileCounter: { completed: number }
  externalSubsMap:
    | Map<
      number,
      Array<{
        filePath: string
        episodeNumber: number | null
        language: string
        format: string
        title?: string
        matchedFonts?: Array<{ name: string; path: string }>
      }>
    >
    | Map<number, ExternalSubtitleMatch[]>
  fileAnalyses: ImportQueueEntry['fileAnalyses']
  importSettings: ImportQueueEntry['importSettings']
  encodingProfile: EncodingProfile | null
  useCpuFallback: boolean
  vmafScore: number | undefined
  syncOffset: number
  ffmpegVersion: string | undefined
  videoMaxConcurrent: number
  audioMaxConcurrent: number
  demuxLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  isCancelled: () => boolean
  emitProgress: (progress: number, fileName?: string, stage?: string) => void
  setFileProgress: (currentFile: number, totalFiles: number, currentFileName: string | null) => void
  episodeOutputDirs: Map<string, string>
  postProcessDataMap: Map<string, PostProcessData>
  episodesWithoutChapters: Array<{ id: string; sourcePath: string; durationMs: number }>
}

export async function processEpisodeFile(
  file: { path: string; name: string; episodeNumber: number; selected: boolean },
  ctx: EpisodeFileProcessingContext,
): Promise<BatchImportItem | null> {
  const { entry, animeId, seasonId, seasonNum, animeName, libraryPath, totalFiles, fileCounter } = ctx

  if (ctx.isCancelled()) {
    throw new Error('Импорт отменён пользователем')
  }

  const episodeOutputDir = await ensureEpisodeDirectory({
    libraryPath,
    animeName,
    seasonNumber: seasonNum,
    episodeNumber: file.episodeNumber,
  })

  // Demux — показываем прогресс с именем текущего файла (5-15%)
  const fileLabel = `Демукс ${fileCounter.completed + 1}/${totalFiles}: ${file.name}`
  ctx.emitProgress(5 + Math.round((fileCounter.completed / totalFiles) * 10), fileLabel, 'demuxing')
  const demuxResult = await ctx.demuxLimiter(() =>
    demuxFile(file.path, episodeOutputDir, {
      skipVideo: true,
      audioExtractMode: 'smart',
      onProgress: (fraction) => {
        // Маппим fraction 0..1 текущего файла в общий диапазон 5-15%
        const overallFraction = (fileCounter.completed + fraction) / totalFiles
        const percent = 5 + Math.round(overallFraction * 10)
        ctx.emitProgress(percent, fileLabel, 'demuxing')
      },
    })
  )

  fileCounter.completed++
  ctx.setFileProgress(fileCounter.completed, totalFiles, `Демукс ${fileCounter.completed}/${totalFiles}`)

  if (ctx.isCancelled()) {
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
        // Сбрасываем CID — будут заново установлены в постпроцессе
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
  const fileAnalysis = ctx.fileAnalyses?.find((a) => a.episodeNumber === file.episodeNumber)
  const audioTrackOverrides = fileAnalysis?.audioRecommendations
    .filter((r) => r.enabled)
    .map((r) => ({ streamIndex: r.trackIndex, language: r.language, dubGroup: r.dubGroup }))
  const subtitleTrackOverrides = fileAnalysis?.subtitleRecommendations
    ?.filter((r) => r.enabled)
    .map((r) => ({ streamIndex: r.streamIndex, language: r.language, dubGroup: r.dubGroup }))

  // Данные для пост-обработки
  ctx.episodeOutputDirs.set(episodeId, episodeOutputDir)
  ctx.postProcessDataMap.set(episodeId, {
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
    hasFileAnalysis: !!ctx.fileAnalyses?.find((a) => a.episodeNumber === file.episodeNumber),
    embeddedAudioCount: demuxResult.audioTracks?.length ?? 0,
    embeddedSubCount: demuxResult.subtitleTracks?.length ?? 0,
    externalSubsForEpisode: ctx.externalSubsMap.get(file.episodeNumber)?.length ?? 0,
  })
  const audioTracksToTranscode = await createAudioTracks(episodeId, demuxResult, ctx.fileAnalyses, file.episodeNumber)
  await createSubtitleTracks(
    episodeId,
    demuxResult,
    ctx.fileAnalyses,
    file.episodeNumber,
    episodeOutputDir,
    ctx.externalSubsMap,
  )

  // Главы
  const hasChaptersFromFile = await createChapters(episodeId, demuxResult)
  if (!hasChaptersFromFile && demuxResult.video?.duration) {
    ctx.episodesWithoutChapters.push({
      id: episodeId,
      sourcePath: file.path,
      durationMs: Math.round(demuxResult.video.duration * 1000),
    })
  }

  // BatchImportItem для транскодирования
  if (videoInputPath) {
    // Anime4K: фиксированный CQ 32 (VMAF не используется — апскейл всегда)
    const anime4kEnabled = ctx.importSettings?.anime4kEnabled && isAnime4KAvailable()
    const effectiveCq = ctx.importSettings?.cqOverride ?? ctx.encodingProfile?.cq ?? 28
    const videoOptions = buildVideoOptions(ctx.encodingProfile, effectiveCq)
    if (anime4kEnabled) {
      videoOptions.anime4kShaderPath = getAnime4KShaderPath()
    }
    if (ctx.importSettings?.denoiseEnabled) {
      videoOptions.denoiseEnabled = true
    }

    // Обновляем postProcessData
    const existing = ctx.postProcessDataMap.get(episodeId)
    if (existing) {
      ctx.postProcessDataMap.set(episodeId, {
        ...existing,
        encodingProfileId: ctx.encodingProfile?.id,
        encodingProfileName: ctx.encodingProfile?.name,
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
        vmafScore: ctx.vmafScore,
        encoderType: ctx.useCpuFallback ? 'cpu' : 'gpu',
        ffmpegVersion: ctx.ffmpegVersion,
        videoMaxConcurrent: ctx.videoMaxConcurrent,
        audioMaxConcurrent: ctx.audioMaxConcurrent,
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
        useCpuFallback: ctx.useCpuFallback,
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
          syncOffset: track.isDonor && ctx.syncOffset ? ctx.syncOffset : undefined,
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
