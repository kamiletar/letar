/**
 * ExportQueueService — сервис очереди экспорта
 *
 * Управляет очередью задач экспорта с поддержкой:
 * - Последовательного выполнения (один экспорт за раз)
 * - Приоритизации задач
 * - Pause/Resume/Cancel
 * - Персистентности между сессиями
 * - Событий для UI
 * - Автоматического retry при ошибках
 */

import { randomUUID } from 'crypto'
import { app, Notification } from 'electron'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

import type { SeriesExportProgress } from '../../../shared/types/export'
import { createModuleLogger } from '../../utils/logger'
import type { ExportConfig } from '../export-manager'
import type {
  ExportQueueResult,
  ExportQueueSettings,
  ExportTask,
  ExportTaskCreateData,
  ExportTaskStatus,
  QueueExportConfig,
} from './types'

const log = createModuleLogger('ExportQueue')

/** Путь к файлу сохранения очереди */
const getQueueFilePath = () => path.join(app.getPath('userData'), 'data', 'export-queue.json')

/** Настройки по умолчанию */
const DEFAULT_SETTINGS: ExportQueueSettings = {
  maxConcurrent: 1, // Пока только один экспорт за раз (ExportManager - singleton)
  autoRetry: true,
  maxRetries: 3,
  showNotifications: true,
}

/** Начальный прогресс */
const INITIAL_PROGRESS = {
  currentEpisode: 0,
  totalEpisodes: 0,
  fetchProgress: 0,
  encodeProgress: 0,
  bytesDownloaded: 0,
  speed: '',
  eta: '',
}

/**
 * Преобразовать QueueExportConfig в ExportConfig для ExportManager
 */
function toExportConfig(config: QueueExportConfig): ExportConfig {
  return {
    animeName: config.animeName,
    year: config.year,
    outputDir: config.outputDir,
    namingPattern: config.namingPattern,
    posterCid: config.posterCid,
    episodes: config.episodes.map((ep) => ({
      id: ep.id,
      number: ep.number,
      seasonNumber: ep.seasonNumber,
      name: ep.name,
      videoCid: ep.videoCid,
      audioTracks: ep.audioTracks.map((track) => ({
        language: track.language,
        title: track.title,
        transcodedCid: track.transcodedCid,
        streamIndex: track.streamIndex,
      })),
      subtitleTracks: ep.subtitleTracks.map((sub) => ({
        language: sub.language,
        title: sub.title,
        fileCid: sub.fileCid,
        fontCids: sub.fontCids,
      })),
      chapters: ep.chapters,
    })),
    selectedAudioKeys: config.selectedAudioKeys,
    selectedSubtitleKeys: config.selectedSubtitleKeys,
    defaultAudioIndex: config.defaultAudioIndex,
    defaultSubtitleIndex: config.defaultSubtitleIndex,
    franchise: config.franchise,
    seasonType: config.seasonType,
    createFolderStructure: config.createFolderStructure,
    openFolderAfterExport: config.openFolderAfterExport,
  }
}

/**
 * Singleton сервис очереди экспорта
 */
export class ExportQueueService extends EventEmitter {
  private static instance: ExportQueueService | null = null

  private tasks: Map<string, ExportTask> = new Map()
  private settings: ExportQueueSettings = DEFAULT_SETTINGS
  private runningTaskId: string | null = null
  private isProcessing = false
  private currentProgressHandler: ((progress: SeriesExportProgress) => void) | null = null

  private constructor() {
    super()
    this.loadQueue()
  }

  static getInstance(): ExportQueueService {
    if (!ExportQueueService.instance) {
      ExportQueueService.instance = new ExportQueueService()
    }
    return ExportQueueService.instance
  }

  /**
   * Добавить задачу в очередь
   */
  addTask(data: ExportTaskCreateData): ExportQueueResult<ExportTask> {
    try {
      const episodeNumbers = data.config.episodes.map((ep) => ep.number)

      const task: ExportTask = {
        id: randomUUID(),
        type: data.type,
        animeId: data.animeId,
        animeName: data.animeName,
        episodes: episodeNumbers,
        status: 'pending',
        progress: {
          ...INITIAL_PROGRESS,
          totalEpisodes: data.config.episodes.length,
        },
        outputPath: data.config.outputDir,
        config: data.config,
        createdAt: new Date().toISOString(),
        priority: data.priority ?? 10,
        retryCount: 0,
      }

      this.tasks.set(task.id, task)
      this.saveQueue()
      this.emitUpdated()

      // Запустить обработку очереди
      this.processQueue()

      return { success: true, data: task }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Отменить задачу
   */
  cancelTask(taskId: string): ExportQueueResult {
    const task = this.tasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Если задача выполняется — остановить ExportManager
    if (this.runningTaskId === taskId) {
      this.stopCurrentExport()
    }

    task.status = 'cancelled'
    task.completedAt = new Date().toISOString()
    this.saveQueue()
    this.emitUpdated()

    return { success: true }
  }

  /**
   * Приостановить задачу
   */
  pauseTask(taskId: string): ExportQueueResult {
    const task = this.tasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status === 'pending') {
      task.status = 'paused'
      this.saveQueue()
      this.emitUpdated()
      return { success: true }
    }

    // Если задача выполняется — остановить и пометить paused
    if (this.runningTaskId === taskId) {
      this.stopCurrentExport()
      task.status = 'paused'
      this.saveQueue()
      this.emitUpdated()
      return { success: true }
    }

    return { success: false, error: 'Cannot pause task in current status' }
  }

  /**
   * Возобновить задачу
   */
  resumeTask(taskId: string): ExportQueueResult {
    const task = this.tasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status === 'paused') {
      task.status = 'pending'
      this.saveQueue()
      this.emitUpdated()
      this.processQueue()
      return { success: true }
    }

    return { success: false, error: 'Cannot resume task in current status' }
  }

  /**
   * Повторить неудавшуюся задачу
   */
  retryTask(taskId: string): ExportQueueResult {
    const task = this.tasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status === 'failed' || task.status === 'cancelled') {
      task.status = 'pending'
      task.error = undefined
      task.retryCount++
      task.progress = {
        ...INITIAL_PROGRESS,
        totalEpisodes: task.config.episodes.length,
      }
      this.saveQueue()
      this.emitUpdated()
      this.processQueue()
      return { success: true }
    }

    return { success: false, error: 'Cannot retry task in current status' }
  }

  /**
   * Получить список всех задач
   */
  listTasks(): ExportTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => {
      // Сначала по статусу (running > pending > completed)
      const statusOrder: Record<ExportTaskStatus, number> = {
        fetching: 0,
        encoding: 1,
        pending: 2,
        paused: 3,
        completed: 4,
        failed: 5,
        cancelled: 6,
      }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) {
        return statusDiff
      }

      // Потом по приоритету
      const priorityDiff = a.priority - b.priority
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      // Потом по времени создания
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  /**
   * Получить задачу по ID
   */
  getTask(taskId: string): ExportTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Очистить завершённые/отменённые задачи
   */
  clearCompleted(): ExportQueueResult<number> {
    let count = 0
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        this.tasks.delete(id)
        count++
      }
    }
    this.saveQueue()
    this.emitUpdated()
    return { success: true, data: count }
  }

  /**
   * Обновить настройки
   */
  updateSettings(settings: Partial<ExportQueueSettings>): void {
    this.settings = { ...this.settings, ...settings }
    // Не запускаем processQueue при изменении настроек
  }

  /**
   * Получить настройки
   */
  getSettings(): ExportQueueSettings {
    return { ...this.settings }
  }

  /**
   * Остановить текущий экспорт
   */
  private async stopCurrentExport(): Promise<void> {
    if (!this.runningTaskId) {
      return
    }

    try {
      const { ExportManager } = await import('../export-manager')
      const exportManager = ExportManager.getInstance()
      exportManager.cancel()

      // Отписаться от событий
      if (this.currentProgressHandler) {
        exportManager.off('progress', this.currentProgressHandler)
        this.currentProgressHandler = null
      }
    } catch (error) {
      log.error('Ошибка при остановке экспорта', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    this.runningTaskId = null
  }

  /**
   * Обработка очереди — запуск задач
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.runningTaskId) {
      return
    }
    this.isProcessing = true

    try {
      // Найти первую pending задачу
      const pendingTask = Array.from(this.tasks.values())
        .filter((t) => t.status === 'pending')
        .sort((a, b) => {
          const priorityDiff = a.priority - b.priority
          if (priorityDiff !== 0) {
            return priorityDiff
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })[0]

      if (pendingTask) {
        await this.startTask(pendingTask)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Запустить выполнение задачи
   */
  private async startTask(task: ExportTask): Promise<void> {
    this.runningTaskId = task.id
    task.status = 'fetching'
    task.startedAt = new Date().toISOString()
    this.emitUpdated()
    this.saveQueue()

    try {
      const { ExportManager } = await import('../export-manager')
      const exportManager = ExportManager.getInstance()

      // Подписаться на события прогресса
      this.currentProgressHandler = (progress: SeriesExportProgress) => {
        this.handleExportProgress(task.id, progress)
      }
      exportManager.on('progress', this.currentProgressHandler)

      // Преобразовать конфиг и запустить экспорт
      const exportConfig = toExportConfig(task.config)
      const result = await exportManager.startExport(exportConfig)

      // Отписаться от событий
      exportManager.off('progress', this.currentProgressHandler)
      this.currentProgressHandler = null
      this.runningTaskId = null

      // Обработать результат
      if (result.success) {
        this.completeTask(task.id)
      } else {
        const errorMsg = result.failedEpisodes.length > 0
          ? `Failed: ${result.failedEpisodes.map((e) => e.error).join(', ')}`
          : 'Export failed'
        this.failTask(task.id, errorMsg)
      }
    } catch (error) {
      // Отписаться от событий при ошибке
      if (this.currentProgressHandler) {
        try {
          const { ExportManager } = await import('../export-manager')
          ExportManager.getInstance().off('progress', this.currentProgressHandler)
        } catch {
          // Игнорируем ошибку при попытке отписаться
        }
        this.currentProgressHandler = null
      }
      this.runningTaskId = null

      const errorMsg = error instanceof Error ? error.message : String(error)

      // Автоматический retry при ошибках сети
      if (this.settings.autoRetry && task.retryCount < this.settings.maxRetries && this.isRetryableError(errorMsg)) {
        task.status = 'pending'
        task.retryCount++
        task.error = `Retry ${task.retryCount}/${this.settings.maxRetries}: ${errorMsg}`
        this.saveQueue()
        this.emitUpdated()
        // Запустить следующую задачу (может быть эта же после небольшой паузы)
        setTimeout(() => this.processQueue(), 5000)
      } else {
        this.failTask(task.id, errorMsg)
      }
    }
  }

  /**
   * Обработать прогресс от ExportManager
   */
  private handleExportProgress(taskId: string, progress: SeriesExportProgress): void {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    // Определить статус по прогрессу ExportManager
    const currentEp = progress.episodes[progress.currentEpisodeIndex]
    if (currentEp) {
      // Если текущий эпизод обрабатывается — статус encoding
      task.status = currentEp.status === 'processing' ? 'encoding' : 'fetching'
    }

    // Обновить прогресс задачи
    task.progress = {
      currentEpisode: progress.currentEpisodeIndex + 1,
      totalEpisodes: progress.totalEpisodes,
      fetchProgress: 0, // ExportManager не даёт отдельно fetch progress
      encodeProgress: currentEp?.percent ?? 0,
      bytesDownloaded: 0,
      speed: '',
      eta: '',
    }

    this.emit('progress', task)
    // Не сохраняем на каждый progress update — слишком часто
  }

  /**
   * Завершить задачу успешно
   */
  private completeTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    task.status = 'completed'
    task.completedAt = new Date().toISOString()
    task.progress.encodeProgress = 100
    task.progress.currentEpisode = task.progress.totalEpisodes

    this.emit('completed', task)
    this.emitUpdated()
    this.saveQueue()

    // Системное уведомление
    if (this.settings.showNotifications) {
      new Notification({
        title: 'Экспорт завершён',
        body: `${task.animeName} — ${task.episodes.length} эп.`,
      }).show()
    }

    // Запустить следующую задачу
    this.processQueue()
  }

  /**
   * Завершить задачу с ошибкой
   */
  private failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    task.status = 'failed'
    task.error = error
    task.completedAt = new Date().toISOString()

    this.emit('failed', task)
    this.emitUpdated()
    this.saveQueue()

    // Системное уведомление
    if (this.settings.showNotifications) {
      new Notification({
        title: 'Ошибка экспорта',
        body: `${task.animeName}: ${error.slice(0, 100)}`,
      }).show()
    }

    // Запустить следующую задачу
    this.processQueue()
  }

  /**
   * Проверить, можно ли retry при данной ошибке
   */
  private isRetryableError(error: string): boolean {
    const retryablePatterns = [
      'network',
      'timeout',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'fetch failed',
      'IPFS',
      'gateway',
    ]
    const lowerError = error.toLowerCase()
    return retryablePatterns.some((pattern) => lowerError.includes(pattern.toLowerCase()))
  }

  /**
   * Сохранить очередь в файл
   */
  private saveQueue(): void {
    try {
      const filePath = getQueueFilePath()
      const dir = path.dirname(filePath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const data = {
        tasks: Array.from(this.tasks.values()),
        settings: this.settings,
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      log.error('Ошибка сохранения очереди', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Загрузить очередь из файла
   */
  private loadQueue(): void {
    try {
      const filePath = getQueueFilePath()

      if (!fs.existsSync(filePath)) {
        return
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)

      // Загрузить задачи
      if (Array.isArray(data.tasks)) {
        for (const task of data.tasks as ExportTask[]) {
          // Сбросить running задачи в pending (приложение перезапустилось)
          if (task.status === 'fetching' || task.status === 'encoding') {
            task.status = 'pending'
          }
          this.tasks.set(task.id, task)
        }
      }

      // Загрузить настройки
      if (data.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...data.settings }
      }
    } catch (error) {
      log.error('Ошибка загрузки очереди', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Emit updated event
   */
  private emitUpdated(): void {
    this.emit('updated', this.listTasks())
  }
}
