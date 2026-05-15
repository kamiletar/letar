/**
 * TranscodeManager — Singleton для управления очередью транскодирования
 *
 * Возможности:
 * - Очередь с приоритетами
 * - Пауза/возобновление процессов
 * - Отмена с очисткой файлов
 * - Расширенная статистика (fps, speed, bitrate, size)
 * - События для UI
 */

import type { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import { spawnFFmpeg } from '../utils/ffmpeg-spawn'

import type {
  DemuxResult,
  PerFileTranscodeSettings,
  QueueItem,
  QueueItemStatus,
  TranscodeProgressExtended,
  VideoTranscodeOptions,
} from '../../shared/types'
import { getVideoDuration } from '../ffmpeg/probe'
import { calculateETA, isProgressLine, parseFFmpegProgress } from '../ffmpeg/progress-parser'
import { defaultVideoOptions } from '../ffmpeg/transcode'
import {
  getPauseCapabilities,
  resumeChildProcess,
  suspendChildProcess,
  terminateChildProcess,
} from '../utils/process-control'

/** Генератор уникальных ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** События менеджера */
export interface TranscodeManagerEvents {
  /** Изменение прогресса элемента */
  progress: (id: string, progress: TranscodeProgressExtended) => void
  /** Изменение статуса элемента */
  statusChange: (id: string, status: QueueItemStatus, error?: string) => void
  /** Изменение очереди (добавление, удаление, переупорядочивание) */
  queueChange: (queue: QueueItem[]) => void
  /** Начало обработки очереди */
  processingStarted: () => void
  /** Завершение обработки очереди */
  processingCompleted: () => void
}

/**
 * Менеджер очереди транскодирования
 */
export class TranscodeManager extends EventEmitter {
  private static instance: TranscodeManager | null = null

  /** Очередь элементов */
  private queue: Map<string, QueueItem> = new Map()

  /** Активные процессы FFmpeg */
  private activeProcesses: Map<string, ChildProcess> = new Map()

  /** Максимальное количество параллельных задач */
  private maxConcurrent = 1

  /** Глобальная пауза */
  private globalPause = false

  /** Флаг обработки */
  private isProcessing = false

  /** Путь к библиотеке по умолчанию */
  private defaultLibraryPath = ''

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): TranscodeManager {
    if (!TranscodeManager.instance) {
      TranscodeManager.instance = new TranscodeManager()
    }
    return TranscodeManager.instance
  }

  /**
   * Установить путь к библиотеке по умолчанию
   */
  setDefaultLibraryPath(libraryPath: string): void {
    this.defaultLibraryPath = libraryPath
  }

  /**
   * Получить путь к библиотеке
   */
  getDefaultLibraryPath(): string {
    return this.defaultLibraryPath
  }

  /**
   * Добавить файл в очередь
   */
  addToQueue(filePath: string, settings?: PerFileTranscodeSettings): string {
    const id = generateId()
    const fileName = path.basename(filePath)

    const item: QueueItem = {
      id,
      filePath,
      fileName,
      status: 'pending',
      priority: this.queue.size,
      settings,
      addedAt: new Date().toISOString(),
    }

    this.queue.set(id, item)
    this.emitQueueChange()

    return id
  }

  /**
   * Удалить элемент из очереди
   */
  removeFromQueue(id: string): boolean {
    const item = this.queue.get(id)
    if (!item) {
      return false
    }

    // Если элемент в процессе, сначала отменяем
    if (item.status === 'transcoding' || item.status === 'paused') {
      this.cancelItem(id)
    }

    this.queue.delete(id)
    this.emitQueueChange()
    return true
  }

  /**
   * Получить элемент по ID
   */
  getItem(id: string): QueueItem | undefined {
    return this.queue.get(id)
  }

  /**
   * Получить всю очередь отсортированную по приоритету
   */
  getQueue(): QueueItem[] {
    return Array.from(this.queue.values()).sort((a, b) => a.priority - b.priority)
  }

  /**
   * Обновить настройки элемента
   */
  updateSettings(id: string, settings: PerFileTranscodeSettings): boolean {
    const item = this.queue.get(id)
    if (!item) {
      return false
    }

    // Можно обновлять только pending/ready элементы
    if (item.status !== 'pending' && item.status !== 'ready') {
      return false
    }

    item.settings = { ...item.settings, ...settings }
    this.queue.set(id, item)
    this.emitQueueChange()
    return true
  }

  /**
   * Изменить порядок очереди
   */
  reorderQueue(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const item = this.queue.get(id)
      if (item) {
        item.priority = index
        this.queue.set(id, item)
      }
    })
    this.emitQueueChange()
  }

  /**
   * Приостановить элемент
   */
  pauseItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'transcoding') {
      return false
    }

    const proc = this.activeProcesses.get(id)
    if (!proc) {
      return false
    }

    const success = suspendChildProcess(proc)
    if (success) {
      this.updateStatus(id, 'paused')
    }
    return success
  }

  /**
   * Возобновить элемент
   */
  resumeItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'paused') {
      return false
    }

    const proc = this.activeProcesses.get(id)
    if (!proc) {
      return false
    }

    const success = resumeChildProcess(proc)
    if (success) {
      this.updateStatus(id, 'transcoding')
    }
    return success
  }

  /**
   * Отменить элемент
   */
  cancelItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item) {
      return false
    }

    // Если в процессе — убить процесс
    if (item.status === 'transcoding' || item.status === 'paused') {
      const proc = this.activeProcesses.get(id)
      if (proc) {
        terminateChildProcess(proc, true)
        this.activeProcesses.delete(id)
      }

      // Удалить частично созданные файлы
      if (item.outputPath) {
        this.cleanupPartialFiles(item.outputPath)
      }
    }

    this.updateStatus(id, 'cancelled')
    return true
  }

  /**
   * Проверить возможность паузы
   */
  getPauseCapabilities() {
    return getPauseCapabilities()
  }

  /**
   * Начать обработку очереди
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    this.emit('processingStarted')

    await this.processQueue()

    this.isProcessing = false
    this.emit('processingCompleted')
  }

  /**
   * Приостановить всю обработку
   */
  pauseAll(): void {
    this.globalPause = true
    // Приостанавливаем все активные процессы
    for (const [id] of this.activeProcesses) {
      this.pauseItem(id)
    }
  }

  /**
   * Возобновить всю обработку
   */
  resumeAll(): void {
    this.globalPause = false
    // Возобновляем все приостановленные
    for (const [id, item] of this.queue) {
      if (item.status === 'paused') {
        this.resumeItem(id)
      }
    }
  }

  /**
   * Анализировать файл (запустить ffprobe)
   */
  async analyzeItem(id: string, demuxResult: DemuxResult): Promise<void> {
    const item = this.queue.get(id)
    if (!item) {
      return
    }

    this.updateStatus(id, 'analyzing')

    try {
      // Сохраняем результат demux
      item.demuxResult = demuxResult

      // Генерируем рекомендации для дорожек
      const recommendations = this.generateRecommendations(demuxResult)
      item.settings = {
        ...item.settings,
        trackRecommendations: recommendations,
      }

      this.updateStatus(id, 'ready')
    } catch (error) {
      this.updateStatus(id, 'error', error instanceof Error ? error.message : String(error))
    }
  }

  // === Приватные методы ===

  /**
   * Обработка очереди
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      if (this.globalPause) {
        await this.sleep(1000)
        continue
      }

      // Подсчёт активных
      const activeCount = Array.from(this.queue.values()).filter((i) => i.status === 'transcoding').length

      if (activeCount >= this.maxConcurrent) {
        await this.sleep(500)
        continue
      }

      // Найти следующий ready элемент
      const nextItem = this.getQueue().find(
        (i) => i.status === 'ready' || (i.status === 'pending' && i.settings?.skipTranscode)
      )

      if (!nextItem) {
        // Проверяем есть ли ещё pending элементы
        const hasPending = Array.from(this.queue.values()).some((i) => i.status === 'pending' || i.status === 'ready')
        if (!hasPending) {
          break // Очередь пуста
        }
        await this.sleep(500)
        continue
      }

      // Если нужно пропустить
      if (nextItem.settings?.skipTranscode) {
        this.updateStatus(nextItem.id, 'skipped')
        continue
      }

      // Запускаем транскодирование
      await this.transcodeItem(nextItem)
    }
  }

  /**
   * Транскодировать элемент
   */
  private async transcodeItem(item: QueueItem): Promise<void> {
    this.updateStatus(item.id, 'transcoding')

    const startedAt = new Date().toISOString()
    let inputSize = 0

    try {
      // Получаем размер входного файла
      const stats = await fs.promises.stat(item.filePath)
      inputSize = stats.size

      // Получаем длительность
      const duration = await getVideoDuration(item.filePath)
      const totalFrames = item.demuxResult?.video?.fps ? Math.floor(duration * item.demuxResult.video.fps) : undefined

      // Настройки видео
      const videoOptions: VideoTranscodeOptions = {
        ...defaultVideoOptions,
        ...item.settings?.videoOptions,
      }

      // Определяем выходной путь
      const outputPath = item.outputPath || path.join(path.dirname(item.filePath), 'output.mkv')

      // Собираем аргументы FFmpeg
      const args = this.buildFFmpegArgs(item.filePath, outputPath, videoOptions)

      // Запускаем FFmpeg
      const ff = spawnFFmpeg(args)
      this.activeProcesses.set(item.id, ff)

      const startTime = Date.now()

      // Обработка stderr для прогресса
      ff.stderr.on('data', (data: Buffer) => {
        const line = data.toString()

        if (isProgressLine(line)) {
          const parsed = parseFFmpegProgress(line)
          const elapsedTime = Date.now() - startTime

          const progress: TranscodeProgressExtended = {
            percent: parsed.currentTime ? (parsed.currentTime / duration) * 100 : 0,
            currentTime: parsed.currentTime || 0,
            totalDuration: duration,
            eta: calculateETA(parsed, duration) || 0,
            stage: 'video',
            fps: parsed.fps,
            speed: parsed.speed,
            bitrate: parsed.bitrate,
            outputSize: parsed.outputSize,
            elapsedTime,
            startedAt,
            inputSize,
            currentFrame: parsed.currentFrame,
            totalFrames,
          }

          item.progress = progress
          this.queue.set(item.id, item)
          this.emit('progress', item.id, progress)
        }
      })

      // Ожидаем завершения
      await new Promise<void>((resolve, reject) => {
        ff.on('close', (code) => {
          this.activeProcesses.delete(item.id)
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`FFmpeg завершился с кодом ${code}`))
          }
        })

        ff.on('error', (err) => {
          this.activeProcesses.delete(item.id)
          reject(err)
        })
      })

      this.updateStatus(item.id, 'completed')
    } catch (error) {
      if (item.status !== 'cancelled') {
        this.updateStatus(item.id, 'error', error instanceof Error ? error.message : String(error))
      }
    }
  }

  /**
   * Построить аргументы FFmpeg
   */
  private buildFFmpegArgs(inputPath: string, outputPath: string, options: VideoTranscodeOptions): string[] {
    const args = ['-y', '-i', inputPath]

    const codec = options.codec || 'av1'

    if (options.useGpu) {
      const nvencCodecs = {
        av1: 'av1_nvenc',
        hevc: 'hevc_nvenc',
        h264: 'h264_nvenc',
      }
      args.push(
        '-c:v',
        nvencCodecs[codec],
        '-cq',
        options.cq.toString(),
        '-preset',
        options.preset,
        '-tune',
        'hq',
        '-rc',
        'constqp'
      )
    } else {
      const cpuCodecs = {
        av1: 'libsvtav1',
        hevc: 'libx265',
        h264: 'libx264',
      }
      args.push('-c:v', cpuCodecs[codec], '-crf', options.cq.toString(), '-preset', options.preset)
    }

    // Без аудио (обрабатывается отдельно)
    args.push('-an')

    args.push(outputPath)
    return args
  }

  /**
   * Генерировать рекомендации для дорожек
   */
  private generateRecommendations(demuxResult: DemuxResult): PerFileTranscodeSettings['trackRecommendations'] {
    const videoRec = {
      action: 'transcode' as const,
      reason: 'Перекодировать в AV1 для уменьшения размера',
    }

    // Проверяем, нужно ли перекодировать видео
    if (demuxResult.video?.codec === 'av1') {
      videoRec.action = 'skip'
      videoRec.reason = 'Уже в AV1'
    }

    const audioRecs: Record<number, { action: 'transcode' | 'skip' | 'copy'; reason: string }> = {}

    for (const track of demuxResult.audioTracks) {
      const codec = track.codec.toLowerCase()
      const bitrate = track.bitrate || 0

      if (codec === 'aac' && bitrate > 0 && bitrate <= 256000) {
        audioRecs[track.index] = {
          action: 'skip',
          reason: `AAC ${Math.round(bitrate / 1000)}kbps — не нужно перекодировать`,
        }
      } else {
        audioRecs[track.index] = {
          action: 'transcode',
          reason: `${codec.toUpperCase()} → AAC для совместимости`,
        }
      }
    }

    return {
      video: videoRec,
      audio: audioRecs,
    }
  }

  /**
   * Обновить статус элемента
   */
  private updateStatus(id: string, status: QueueItemStatus, error?: string): void {
    const item = this.queue.get(id)
    if (!item) {
      return
    }

    item.status = status
    if (error) {
      item.error = error
    }
    this.queue.set(id, item)

    this.emit('statusChange', id, status, error)
    this.emitQueueChange()
  }

  /**
   * Отправить событие изменения очереди
   */
  private emitQueueChange(): void {
    this.emit('queueChange', this.getQueue())
  }

  /**
   * Удалить частично созданные файлы
   */
  private async cleanupPartialFiles(outputPath: string): Promise<void> {
    try {
      // Ищем частичные файлы в папке
      const dir = path.dirname(outputPath)
      const files = await fs.promises.readdir(dir)

      for (const file of files) {
        // Удаляем временные файлы FFmpeg
        if (file.endsWith('.tmp') || file.endsWith('.part')) {
          await fs.promises.unlink(path.join(dir, file)).catch(() => {
            // Игнорируем ошибки удаления временных файлов
          })
        }
      }
    } catch {
      // Игнорируем ошибки очистки
    }
  }

  /**
   * Асинхронная задержка
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/** Экспорт singleton */
export const transcodeManager = TranscodeManager.getInstance()
