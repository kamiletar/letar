/**
 * RestoreTracksManager — менеджер восстановления дорожек в main process
 *
 * Управляет очередью задач, concurrency, прогрессом.
 * Renderer подписывается на события и только отображает.
 */

import { EventEmitter } from 'events'
import { copyFile, mkdir, mkdtemp, rm } from 'fs/promises'
import os from 'os'
import path from 'path'

import type {
  RestoreConfig,
  RestoreFontTask,
  RestoreProgress,
  RestoreTask,
  RestoreTaskDetail,
} from '../../shared/types/restore-tracks'
import { extractFontsFromFile, extractStream } from '../ffmpeg'
import { transcodeAudio } from '../ffmpeg/transcode'
import { uploadToIpfs } from './import/import-ipfs'

import { getPrismaClient } from '../utils/db'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('RestoreTracks')

/** Интервал throttle для прогресса (мс) */
const PROGRESS_THROTTLE = 250
/** Таймаут без обновления прогресса — задача считается зависшей (мс) */
const STALE_TIMEOUT = 120_000
/** Интервал проверки stale задач (мс) */
const STALE_CHECK_INTERVAL = 30_000
/** Максимум retry для зависших задач */
const MAX_RETRIES = 1

export class RestoreTracksManager extends EventEmitter {
  private static instance: RestoreTracksManager | null = null

  /** Все задачи (дорожки) */
  private tasks: Map<string, RestoreTask> = new Map()
  /** Задачи шрифтов */
  private fontTasks: RestoreFontTask[] = []
  /** ID запущенных задач */
  private runningIds: Set<string> = new Set()
  /** Конфигурация */
  private config: RestoreConfig = { concurrency: 4, audioBitrate: 192, syncOffset: 0 }
  /** Флаг отмены */
  private cancelled = false
  /** Шрифты уже обработаны */
  private fontsProcessed = false
  /** Счётчики */
  private addedAudioTracks = 0
  private addedSubtitleTracks = 0
  /** Throttle */
  private lastProgressEmit = 0
  /** Интервал проверки stale задач */
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null

  static getInstance(): RestoreTracksManager {
    if (!RestoreTracksManager.instance) {
      RestoreTracksManager.instance = new RestoreTracksManager()
    }
    return RestoreTracksManager.instance
  }

  // === Публичные методы ===

  /** Запуск восстановления */
  start(tasks: RestoreTask[], fontTasks: RestoreFontTask[], config: RestoreConfig): void {
    this.reset()
    this.config = config

    const now = Date.now()
    for (const task of tasks) {
      task.status = 'queued'
      task.progress = 0
      task.phase = 'waiting'
      task.lastProgressUpdate = now
      task.retryCount = task.retryCount || 0
      this.tasks.set(task.id, task)
    }

    this.fontTasks = fontTasks.map((ft) => ({ ...ft, status: 'queued' as const, restoredCount: 0 }))

    log.info('Восстановление начато', {
      tracks: tasks.length,
      fonts: fontTasks.length,
      concurrency: config.concurrency,
    })

    this.emitProgress()
    this.startStaleCheck()
    this.processQueue()
  }

  /** Отмена */
  cancel(): void {
    this.cancelled = true
    this.stopStaleCheck()
    // Помечаем все queued как cancelled
    for (const task of this.tasks.values()) {
      if (task.status === 'queued') {
        task.status = 'cancelled'
      }
    }
    log.warn('Восстановление отменено')
    this.emit('cancelled')
    this.emitProgress()
  }

  /** Изменить concurrency на лету */
  setConcurrency(value: number): void {
    this.config.concurrency = Math.max(1, Math.min(16, value))
    log.info('Concurrency изменён', { value: this.config.concurrency })
    // Запускаем дополнительные задачи если лимит увеличен
    this.processQueue()
  }

  /** Получить текущий прогресс */
  getProgress(): RestoreProgress {
    const allTasks = Array.from(this.tasks.values())
    const completed = allTasks.filter((t) => t.status === 'completed').length
    const running = allTasks.filter((t) => t.status === 'running').length
    const queued = allTasks.filter((t) => t.status === 'queued').length
    const errors = allTasks.filter((t) => t.status === 'error').length
    const total = allTasks.length

    // Общий процент: среднее взвешенное завершённых + прогресс активных
    let totalPercent = 0
    if (total > 0) {
      const completedPercent = completed * 100
      const runningPercent = allTasks.filter((t) => t.status === 'running').reduce((sum, t) => sum + t.progress, 0)
      totalPercent = (completedPercent + runningPercent) / total
    }

    const fontsTotal = this.fontTasks.reduce((s, ft) => s + ft.missingFonts.length, 0)
    const fontsRestored = this.fontTasks.reduce((s, ft) => s + ft.restoredCount, 0)

    const now = Date.now()
    const taskDetails: RestoreTaskDetail[] = allTasks.map((t) => ({
      id: t.id,
      fileName: this.getTaskFileName(t),
      phase: t.phase,
      percent: t.progress,
      status: t.status,
      error: t.error,
      lastProgressMs: t.status === 'running' ? now - t.lastProgressUpdate : undefined,
    }))

    return {
      totalPercent,
      tasks: { total, completed, running, queued, errors },
      fonts: { total: fontsTotal, restored: fontsRestored },
      addedAudioTracks: this.addedAudioTracks,
      addedSubtitleTracks: this.addedSubtitleTracks,
      taskDetails,
    }
  }

  /** Проверить, идёт ли обработка */
  isProcessing(): boolean {
    return (
      this.runningIds.size > 0 ||
      Array.from(this.tasks.values()).some((t) => t.status === 'queued') ||
      this.fontTasks.some((ft) => ft.status === 'queued' || ft.status === 'running')
    )
  }

  // === Приватные методы ===

  private reset(): void {
    this.stopStaleCheck()
    this.tasks.clear()
    this.fontTasks = []
    this.runningIds.clear()
    this.cancelled = false
    this.fontsProcessed = false
    this.addedAudioTracks = 0
    this.addedSubtitleTracks = 0
  }

  /** Обработка очереди — запуск задач до лимита concurrency */
  private processQueue(): void {
    if (this.cancelled) return

    const queued = Array.from(this.tasks.values()).filter((t) => t.status === 'queued')

    let launched = false
    while (this.runningIds.size < this.config.concurrency && queued.length > 0) {
      const task = queued.shift()!
      this.runningIds.add(task.id)
      task.status = 'running'
      launched = true

      this.runTask(task)
        .catch((err) => {
          task.status = 'error'
          task.error = String(err)
          log.error('Ошибка задачи', { taskId: task.id, error: String(err) })
        })
        .finally(() => {
          this.runningIds.delete(task.id)
          this.emitProgress()
          this.processQueue()
        })
    }

    // Обновляем UI сразу после запуска задач (показать running статусы)
    if (launched) {
      this.emitProgress()
    }

    // Если все дорожки обработаны — шрифты
    const allTracksFinished = Array.from(this.tasks.values()).every(
      (t) => t.status !== 'queued' && t.status !== 'running'
    )
    if (allTracksFinished && !this.fontsProcessed && this.fontTasks.length > 0) {
      this.fontsProcessed = true
      void this.processAllFontTasks().then(() => {
        this.checkCompletion()
      })
      return
    }

    this.checkCompletion()
  }

  /** Проверка завершения всех задач */
  private checkCompletion(): void {
    const allTracksFinished = Array.from(this.tasks.values()).every(
      (t) => t.status !== 'queued' && t.status !== 'running'
    )
    const allFontsFinished = this.fontTasks.every((ft) => ft.status !== 'queued' && ft.status !== 'running')

    if (allTracksFinished && (allFontsFinished || this.fontTasks.length === 0)) {
      this.stopStaleCheck()
      const progress = this.getProgress()
      log.info('Восстановление завершено', {
        audio: this.addedAudioTracks,
        subtitles: this.addedSubtitleTracks,
        fonts: progress.fonts.restored,
        errors: progress.tasks.errors,
      })
      this.emit('completed', progress)
    }
  }

  /** Выполнить одну задачу */
  private async runTask(task: RestoreTask): Promise<void> {
    if (this.cancelled) {
      task.status = 'cancelled'
      return
    }

    try {
      if (task.trackType === 'audio') {
        await this.processAudioTask(task)
      } else {
        await this.processSubtitleTask(task)
      }
    } catch (err) {
      task.status = 'error'
      task.error = err instanceof Error ? err.message : String(err)
      this.emit('taskError', task.id, task.error)
    }
  }

  /** Обработка аудио дорожки */
  private async processAudioTask(task: RestoreTask): Promise<void> {
    const { donorPath, episodeDir, trackInfo, streamIndex } = task
    const lang = trackInfo.language || 'und'
    const nextIndex = (Date.now() + Math.random() * 10000) | 0
    const destPath = path.join(episodeDir, `audio_${trackInfo.isExternal ? 'ext' : 'donor'}_${nextIndex}_${lang}.m4a`)

    if (trackInfo.isExternal && !trackInfo.filePath) {
      throw new Error(`Внешняя дорожка без filePath: ${task.id}`)
    }

    const sourcePath = trackInfo.isExternal ? trackInfo.filePath! : donorPath
    // Внешние аудио всегда транскодируем (MKA/FLAC→AAC M4A), embedded тоже
    const shouldTranscode = true

    // Создаём директорию эпизода если не существует (IPFS-first — локальные папки удаляются)
    await mkdir(episodeDir, { recursive: true })

    // Фаза 1: Extract/Transcode
    this.setTaskProgress(task, 10, shouldTranscode ? 'transcode' : 'copy')
    this.emitProgressThrottled()

    if (shouldTranscode) {
      await transcodeAudio(
        sourcePath,
        destPath,
        {
          bitrate: this.config.audioBitrate,
          sampleRate: 48000,
          channels: 2,
          syncOffset: this.config.syncOffset,
          streamIndex: trackInfo.isExternal ? undefined : streamIndex,
        },
        (progress) => {
          // Маппинг: 10% (начало) → 70% (готов к upload)
          task.progress = 10 + (progress.percent ?? 0) * 0.6
          task.lastProgressUpdate = Date.now()
          this.emitProgressThrottled()
        }
      )
    } else {
      await copyFile(sourcePath, destPath)
    }

    if (this.cancelled) {
      task.status = 'cancelled'
      await rm(destPath, { force: true }).catch(() => {})
      return
    }

    // Фаза 2: IPFS upload
    this.setTaskProgress(task, 70, 'upload')
    this.emitProgress()

    const ipfsResult = await uploadToIpfs(destPath)
    // Cleanup temp — удаляем в любом случае (успех или ошибка IPFS)
    await rm(destPath, { force: true }).catch(() => {})

    if (!ipfsResult?.cid) {
      task.status = 'error'
      task.error = 'IPFS upload failed'
      return
    }

    // Фаза 3: DB
    this.setTaskProgress(task, 90, 'db')
    this.emitProgress()

    const db = getPrismaClient()
    // Не дублируем title если он совпадает с dubGroup (внешние озвучки)
    const audioTitle = trackInfo.title && trackInfo.title !== trackInfo.dubGroup ? trackInfo.title : undefined
    const record = await db.audioTrack.create({
      data: {
        episodeId: task.episodeId,
        streamIndex: nextIndex,
        language: lang,
        title: audioTitle,
        codec: 'aac',
        channels: trackInfo.channels ? `${trackInfo.channels}.0` : '2.0',
        bitrate: this.config.audioBitrate * 1000,
        isDefault: false,
        transcodedCid: ipfsResult.cid,
        ipfsSize: ipfsResult.size ?? undefined,
        dubGroup: trackInfo.dubGroup || undefined,
      },
    })

    task.status = 'completed'
    this.setTaskProgress(task, 100, 'done')
    task.resultCid = ipfsResult.cid
    task.resultDbId = record.id
    this.addedAudioTracks++
    this.emitProgress()
    this.emit('taskCompleted', task.id, true)
  }

  /** Обработка субтитровой дорожки */
  private async processSubtitleTask(task: RestoreTask): Promise<void> {
    const { donorPath, episodeDir, trackInfo, streamIndex } = task
    const lang = trackInfo.language || 'und'
    const format = trackInfo.format || 'ass'
    const nextIndex = (Date.now() + Math.random() * 10000) | 0
    const destPath = path.join(
      episodeDir,
      `subs_${trackInfo.isExternal ? 'ext' : 'donor'}_${nextIndex}_${lang}.${format}`
    )

    // Создаём директорию эпизода если не существует (IPFS-first — локальные папки удаляются)
    await mkdir(episodeDir, { recursive: true })

    if (trackInfo.isExternal && trackInfo.filePath) {
      // Внешний субтитр — копирование
      this.setTaskProgress(task, 20, 'copy')
      this.emitProgressThrottled()
      await copyFile(trackInfo.filePath, destPath)
    } else {
      // Встроенный субтитр — извлечение одного потока
      this.setTaskProgress(task, 20, 'extract')
      this.emitProgressThrottled()
      await extractStream(donorPath, destPath, `0:s:${streamIndex}`)
    }

    if (this.cancelled) {
      task.status = 'cancelled'
      await rm(destPath, { force: true }).catch(() => {})
      return
    }

    this.setTaskProgress(task, 50)
    this.emitProgress()

    // IPFS upload
    this.setTaskProgress(task, 70, 'upload')
    this.emitProgress()

    const ipfsResult = await uploadToIpfs(destPath)
    await rm(destPath, { force: true }).catch(() => {})

    if (!ipfsResult?.cid) {
      task.status = 'error'
      task.error = 'IPFS upload failed'
      return
    }

    // DB
    this.setTaskProgress(task, 90, 'db')
    this.emitProgress()

    const db = getPrismaClient()
    const record = await db.subtitleTrack.create({
      data: {
        episodeId: task.episodeId,
        streamIndex: trackInfo.isExternal ? -1 : nextIndex,
        language: lang,
        title: trackInfo.title || undefined,
        format,
        fileCid: ipfsResult.cid,
        ipfsSize: ipfsResult.size ?? undefined,
        isDefault: false,
        dubGroup: trackInfo.dubGroup || undefined,
      },
    })

    task.status = 'completed'
    this.setTaskProgress(task, 100, 'done')
    task.resultCid = ipfsResult.cid
    task.resultDbId = record.id
    this.addedSubtitleTracks++
    this.emitProgress()
    this.emit('taskCompleted', task.id, true)
  }

  /** Обработка всех задач шрифтов */
  private async processAllFontTasks(): Promise<void> {
    // Дополняем subtitleTrackIds из свежесозданных дорожек (этой же сессии)
    for (const fontTask of this.fontTasks) {
      const newSubIds = Array.from(this.tasks.values())
        .filter(
          (t) =>
            t.trackType === 'subtitle' &&
            t.status === 'completed' &&
            t.episodeId === fontTask.episodeId &&
            t.resultDbId &&
            // Только ASS/SSA форматы нуждаются в шрифтах
            (t.trackInfo.format === 'ass' || t.trackInfo.format === 'ssa')
        )
        .map((t) => t.resultDbId!)

      if (newSubIds.length > 0) {
        const existing = new Set(fontTask.subtitleTrackIds)
        for (const id of newSubIds) {
          if (!existing.has(id)) fontTask.subtitleTrackIds.push(id)
        }
        log.info('FontTask дополнен новыми дорожками', {
          episodeId: fontTask.episodeId,
          added: newSubIds.length,
          total: fontTask.subtitleTrackIds.length,
        })
      }
    }

    for (const fontTask of this.fontTasks) {
      if (this.cancelled) break
      fontTask.status = 'running'

      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'animatrona-fonts-'))
      try {
        const result = await extractFontsFromFile(fontTask.donorPath, tempDir)
        if (result.fonts.length === 0) {
          fontTask.status = 'completed'
          continue
        }

        const normalizeName = (n: string) => n.toLowerCase().replace(/\.(ttf|otf|ttc|woff2?)$/i, '')
        const missing = result.fonts.filter((f) =>
          fontTask.missingFonts.some((m) => normalizeName(m) === normalizeName(f.fileName))
        )

        const db = getPrismaClient()

        for (const font of missing) {
          if (this.cancelled) break
          const ipfsResult = await uploadToIpfs(font.path)
          if (!ipfsResult?.cid) continue

          for (const trackId of fontTask.subtitleTrackIds) {
            try {
              await db.subtitleFont.create({
                data: {
                  subtitleTrackId: trackId,
                  fontName: font.name,
                  fileExt: font.ext,
                  fileCid: ipfsResult.cid,
                  ipfsSize: ipfsResult.size ?? undefined,
                },
              })
            } catch (dbErr) {
              log.warn('Не удалось создать SubtitleFont (возможно дубликат)', {
                trackId,
                fontName: font.name,
                error: String(dbErr),
              })
            }
          }
          fontTask.restoredCount++
        }

        fontTask.status = 'completed'
      } catch (err) {
        fontTask.status = 'error'
        fontTask.error = String(err)
        log.error('Ошибка обработки шрифтов', { donorPath: fontTask.donorPath, error: String(err) })
      } finally {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      }

      this.emitProgress()
    }
  }

  /** Имя задачи для UI */
  private getTaskFileName(task: RestoreTask): string {
    const prefix = task.trackType === 'audio' ? '[AUD]' : '[SUB]'
    return `${prefix} ${task.trackInfo.title || task.trackInfo.language || 'unknown'}`
  }

  /** Обновить прогресс задачи + timestamp */
  private setTaskProgress(task: RestoreTask, progress: number, phase?: RestoreTask['phase']): void {
    task.progress = progress
    task.lastProgressUpdate = Date.now()
    if (phase) task.phase = phase
  }

  /** Отправить прогресс (без throttle) */
  private emitProgress(): void {
    this.lastProgressEmit = Date.now()
    this.emit('progress', this.getProgress())
  }

  /** Отправить прогресс с throttle */
  private emitProgressThrottled(): void {
    const now = Date.now()
    if (now - this.lastProgressEmit < PROGRESS_THROTTLE) return
    this.emitProgress()
  }

  /** Запуск проверки зависших задач */
  private startStaleCheck(): void {
    this.stopStaleCheck()
    this.staleCheckInterval = setInterval(() => this.checkStaleTasks(), STALE_CHECK_INTERVAL)
  }

  /** Остановка проверки зависших задач */
  private stopStaleCheck(): void {
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval)
      this.staleCheckInterval = null
    }
  }

  /** Проверка зависших задач и retry/error */
  private checkStaleTasks(): void {
    if (this.cancelled) return

    const now = Date.now()
    let changed = false

    for (const task of this.tasks.values()) {
      if (task.status !== 'running') continue
      if (now - task.lastProgressUpdate < STALE_TIMEOUT) continue

      // Задача зависла
      if (task.retryCount < MAX_RETRIES) {
        log.warn('Stale задача — retry', { taskId: task.id, retry: task.retryCount + 1 })
        task.retryCount++
        task.status = 'queued'
        task.progress = 0
        task.phase = 'waiting'
        task.lastProgressUpdate = now
      } else {
        log.error('Stale задача — ошибка после retry', { taskId: task.id })
        task.status = 'error'
        task.error = `Timeout: нет прогресса более ${STALE_TIMEOUT / 1000}с`
      }

      this.runningIds.delete(task.id)
      changed = true
    }

    if (changed) {
      this.emitProgress()
      this.processQueue()
    }
  }
}
