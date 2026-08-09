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
 *
 * Сам пайплайн разбит по фазам на соседние модули — process() их оркестрирует:
 * - anime-record-setup.ts — постер, Anime/Season в БД, жанры, внешние субтитры
 * - episode-file-processor.ts — demux + Episode в БД + аудио/субтитры/главы одного файла
 * - transcode-runner.ts — параллельное транскодирование через ParallelTranscodeManager
 * - post-process-runner.ts — скриншоты/спрайт/манифест/IPFS-загрузка после транскода
 * - relations-and-manifest.ts — связи с Shikimori, навигация, публикация AnimeManifest
 * - import-failure-cleanup.ts — открепление CID и удаление аниме при ошибке/отмене
 */

import type { ImportQueueEntry } from '../../../shared/types/import-queue'
import type { BatchImportItem } from '../../../shared/types/parallel-transcode'
import { getFFmpegVersion } from '../../utils/ffmpeg-spawn'
import { createModuleLogger } from '../../utils/logger'
import type { ImportQueueController } from '../import-queue-controller'
import { detectIntros } from '../intro-detector'
import { ensureAnimeDirectory, getDefaultLibraryPath } from '../output-path-resolver'
import { ParallelTranscodeManager } from '../parallel-transcode-manager'
import {
  createAnimeRecord,
  createSeasonRecord,
  downloadAndSavePoster,
  loadEncodingProfile,
  saveGenresIfAvailable,
  scanExternalSubs,
} from './anime-record-setup'
import { updateChaptersInManifest } from './chapter-creator'
import { type EpisodeFileProcessingContext, processEpisodeFile } from './episode-file-processor'
import { createConcurrencyLimiter } from './helpers'
import * as db from './import-db'
import { cleanupAfterImportFailure } from './import-failure-cleanup'
import { startCidTracking, stopCidTracking } from './import-ipfs'
import { runPostProcess } from './post-process-runner'
import { generateAndPublishAnimeManifest, syncRelations, updateEpisodeNavigation } from './relations-and-manifest'
import { runParallelTranscode } from './transcode-runner'
import type { ImportResult, PostProcessData, ProcessingStage, VideoEncodingMeta } from './types'

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
    const encodingProfile = await loadEncodingProfile(profileId)
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
      } catch (err) {
        log.warn('Не удалось определить версию FFmpeg, поле останется пустым в манифесте', {
          queueItemId: entry.id,
          error: String(err),
        })
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

        const posterId = await downloadAndSavePoster(entry.selectedAnime, animeFolderPath)
        log.debug('Постер', { posterId: posterId ?? 'нет' })

        this.emitProgress(2, 'Создание записи в БД...', 'creating_anime')
        animeId = await createAnimeRecord(entry.selectedAnime, entry.parsedInfo, animeFolderPath, posterId)
        this.createdAnimeId = animeId
        log.info('Аниме создано в БД', { animeId })

        // 2. Жанры и темы
        await saveGenresIfAvailable(animeId, entry.selectedAnime)

        // 3. Сезон
        this.emitProgress(3, 'Создание сезона...', 'creating_anime')
        seasonId = await createSeasonRecord(animeId, entry.selectedAnime, entry.parsedInfo)
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
        : await scanExternalSubs(entry.folderPath, selectedFiles)

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
      const fileCounter = { completed: 0 }

      const episodeFileCtx: EpisodeFileProcessingContext = {
        entry,
        animeId,
        seasonId,
        seasonNum,
        animeName,
        libraryPath,
        totalFiles: selectedFiles.length,
        fileCounter,
        externalSubsMap,
        fileAnalyses,
        importSettings,
        encodingProfile,
        useCpuFallback,
        vmafScore,
        syncOffset,
        ffmpegVersion,
        videoMaxConcurrent,
        audioMaxConcurrent,
        demuxLimiter,
        isCancelled: () => this._isCancelled,
        emitProgress: this.emitProgress.bind(this),
        setFileProgress: this.setFileProgress.bind(this),
        episodeOutputDirs,
        postProcessDataMap,
        episodesWithoutChapters,
      }

      const batchResults = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await processEpisodeFile(file, episodeFileCtx)
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
        failedItemIds = await runParallelTranscode(batchItems, videoMaxConcurrent, audioMaxConcurrent, {
          emitProgress: this.emitProgress.bind(this),
          videoEncodingMeta: this.videoEncodingMeta,
          currentItemId: this.currentItemId,
        })

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
        const postProcessResult = await runPostProcess(postProcessDataMap, {
          emitProgress: this.emitProgress.bind(this),
          videoEncodingMeta: this.videoEncodingMeta,
          createdAnimeFolder: this.createdAnimeFolder,
        })
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
        await syncRelations(animeId, entry.selectedAnime)
        await updateEpisodeNavigation(animeId)
      }

      if (this._isCancelled) {
        throw new Error('Импорт отменён пользователем')
      }

      // 9. AnimeManifest
      this.setStage('generating_manifests')
      this.emitProgress(95, 'Генерация AnimeManifest...', 'generating_manifests')
      const animeManifestResult = await generateAndPublishAnimeManifest(animeId)

      this.setStage('done')

      // Собираем все предупреждения
      const warnings: string[] = []

      // AnimeManifest (directoryCid) не опубликован — критично для contentHealth и раздачи по CID
      if (!animeManifestResult.success) {
        warnings.push(
          `AnimeManifest не опубликован (directoryCid не обновлён): ${
            animeManifestResult.error ?? 'неизвестная ошибка'
          }`,
        )
      }

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

      await cleanupAfterImportFailure({
        createdAnimeId: this.createdAnimeId,
        createdAnimeFolder: this.createdAnimeFolder,
        reason,
      })
      this.createdAnimeId = null
      this.createdAnimeFolder = null

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
}
