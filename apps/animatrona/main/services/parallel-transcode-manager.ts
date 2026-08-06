/**
 * ParallelTranscodeManager — координатор параллельного кодирования
 *
 * Заменяет старый TranscodeManager, добавляя:
 * - Раздельные пулы для видео (GPU) и аудио (CPU)
 * - Параллельное кодирование видео и аудио одновременно
 * - Агрегированный прогресс для UI
 * - Отслеживание завершения эпизодов
 */

import { EventEmitter } from 'events'
import fs from 'fs'
import type {
  AggregatedProgress,
  AudioPoolTask,
  BatchImportItem,
  ImportQueueItem,
  VideoPoolTask,
} from '../../shared/types/parallel-transcode'
import type { CqSearchProgress } from '../../shared/types/vmaf'
import { createModuleLogger } from '../utils/logger'
import { updateAudioTrack } from './import/import-db'
import { uploadToIpfs } from './import/import-ipfs'
import { AudioPool } from './pools/audio-pool'
import { type LogEntry, VideoPool } from './pools/video-pool'

const log = createModuleLogger('ParallelTranscode')

export class ParallelTranscodeManager extends EventEmitter {
  private static instance: ParallelTranscodeManager | null = null

  /** Пул видео-кодирования (GPU) */
  private videoPool: VideoPool

  /** Пул аудио-кодирования (CPU) */
  private audioPool: AudioPool

  /** Очередь импорта (элементы = эпизоды) */
  private importQueue: Map<string, ImportQueueItem> = new Map()

  /** Завершённые видео-задачи (для отслеживания) */
  private completedVideoTasks: Set<string> = new Set()

  /** Завершённые аудио-задачи (для отслеживания) */
  private completedAudioTasks: Set<string> = new Set()

  /** Глобальная пауза */
  private globalPause = false

  /** ID текущего batch (для отслеживания завершения) */
  private currentBatchId: string | null = null

  /** ID элементов текущего batch */
  private currentBatchItems: Set<string> = new Set()

  // === Новые поля для сохранения состояния между навигациями ===

  /**
   * VMAF прогресс для каждого item
   * Хранится в main process для сохранения при навигации в renderer
   */
  private vmafProgressMap: Map<string, CqSearchProgress> = new Map()

  /**
   * ID текущего обрабатываемого item (защита от дублирования)
   * Используется для предотвращения повторного запуска обработки
   */
  private processingItemId: string | null = null

  // === Throttle для событий прогресса (предотвращение утечки памяти) ===

  /** Время последней отправки агрегированного прогресса */
  private lastProgressEmitTime = 0

  /** Минимальный интервал между отправками прогресса (мс) — 4 раза/сек вместо 8 */
  private readonly PROGRESS_EMIT_INTERVAL = 250

  private constructor() {
    super()

    // Инициализация пулов с дефолтными значениями
    // VideoPool: 2 параллельных GPU кодирования (Dual NVENC по умолчанию)
    // Реальное значение устанавливается через setVideoMaxConcurrent() перед addBatch()
    this.videoPool = new VideoPool({ maxConcurrent: 2 })
    // AudioPool: ограничиваем до 4 параллельных задач
    // (больше создаёт overhead от многих FFmpeg процессов)
    this.audioPool = new AudioPool({ maxConcurrent: 4 })

    this.setupPoolListeners()
  }

  /** Singleton */
  static getInstance(): ParallelTranscodeManager {
    if (!ParallelTranscodeManager.instance) {
      ParallelTranscodeManager.instance = new ParallelTranscodeManager()
    }
    return ParallelTranscodeManager.instance
  }

  // === Публичные методы ===

  /**
   * Полная очистка перед новым импортом
   * Сбрасывает все состояния пулов и очередей
   */
  reset(): void {
    log.warn('RESET called', {
      importQueue: this.importQueue.size,
      completedVideo: this.completedVideoTasks.size,
      completedAudio: this.completedAudioTasks.size,
    })
    log.debug('reset() stack trace', { stack: new Error().stack })
    this.videoPool.clear()
    this.audioPool.clear()
    this.importQueue.clear()
    this.completedVideoTasks.clear()
    this.completedAudioTasks.clear()
    this.globalPause = false
    this.currentBatchId = null
    this.currentBatchItems.clear()
    this.vmafProgressMap.clear()
    if (this.processingItemId) {
      log.warn('reset() сбрасывает processingItemId', { was: this.processingItemId })
    }
    this.processingItemId = null
    log.warn('Reset completed')
  }

  /**
   * Добавить batch эпизодов для импорта
   * Все задачи добавляются в пулы БЕЗ сброса состояния
   *
   * @param items Элементы для добавления
   * @param batchId Уникальный ID batch'а (для отслеживания завершения)
   *
   * @remarks
   * Используй startNewBatch() если нужен сброс перед новым batch'ом
   */
  addBatch(items: BatchImportItem[], batchId?: string): void {
    // Устанавливаем batch ID если передан
    if (batchId) {
      this.currentBatchId = batchId
      this.currentBatchItems = new Set(items.map((item) => item.id))
    }

    for (const item of items) {
      this.addImportItem(item)
    }
    this.emitAggregatedProgress()
  }

  /**
   * Начать новый batch с полным сбросом состояния
   * Используй когда нужно гарантировать чистый старт
   *
   * @param items Элементы для добавления
   * @param batchId Уникальный ID batch'а (для отслеживания завершения)
   * @param concurrency Лимиты параллельности (применяются ДО добавления задач)
   */
  startNewBatch(
    items: BatchImportItem[],
    batchId?: string,
    concurrency?: { videoMaxConcurrent?: number; audioMaxConcurrent?: number },
  ): void {
    // Защита от двойного вызова (React StrictMode / race condition)
    // Если pool уже имеет задачи — это повторный вызов, игнорируем
    const videoStatus = this.videoPool.getStatus()
    const audioStatus = this.audioPool.getStatus()
    if (videoStatus.running > 0 || videoStatus.queued > 0 || audioStatus.running > 0 || audioStatus.queued > 0) {
      log.warn('startNewBatch: игнорируем повторный вызов — задачи уже запущены', {
        videoRunning: videoStatus.running,
        videoQueued: videoStatus.queued,
        audioRunning: audioStatus.running,
        audioQueued: audioStatus.queued,
      })
      return
    }

    this.reset()

    // Устанавливаем лимиты ДО addBatch, иначе processQueue() запустит задачи
    // с дефолтным maxConcurrent (2) и пользовательская настройка не успеет примениться
    if (concurrency?.videoMaxConcurrent != null) {
      this.videoPool.setMaxConcurrent(concurrency.videoMaxConcurrent)
      log.info('Video max concurrent set before batch', { value: concurrency.videoMaxConcurrent })
    }
    if (concurrency?.audioMaxConcurrent != null) {
      this.audioPool.setMaxConcurrent(concurrency.audioMaxConcurrent)
      log.info('Audio max concurrent set before batch', { value: concurrency.audioMaxConcurrent })
    }

    this.addBatch(items, batchId)
  }

  /**
   * Получить текущий batch ID
   */
  getCurrentBatchId(): string | null {
    return this.currentBatchId
  }

  /**
   * Установить максимальное количество параллельных аудио-задач
   * Применяется к AudioPool (CPU-пул)
   */
  setAudioMaxConcurrent(value: number): void {
    this.audioPool.setMaxConcurrent(value)
    log.info('Audio max concurrent updated', { value: this.audioPool.getMaxConcurrent() })
  }

  /**
   * Получить текущий лимит параллельных аудио-задач
   */
  getAudioMaxConcurrent(): number {
    return this.audioPool.getMaxConcurrent()
  }

  /**
   * Установить максимальное количество параллельных видео-задач
   * Применяется к VideoPool (GPU-пул)
   */
  setVideoMaxConcurrent(value: number): void {
    this.videoPool.setMaxConcurrent(value)
    log.info('Video max concurrent updated', { value: this.videoPool.getMaxConcurrent() })
  }

  /**
   * Получить текущий лимит параллельных видео-задач
   */
  getVideoMaxConcurrent(): number {
    return this.videoPool.getMaxConcurrent()
  }

  // === VMAF прогресс (сохраняется в main для навигации) ===

  /**
   * Установить VMAF прогресс для item
   * Вызывается из vmaf.handlers.ts при поиске CQ
   */
  setVmafProgress(itemId: string, progress: CqSearchProgress): void {
    this.vmafProgressMap.set(itemId, progress)
    this.emit('vmafProgress', itemId, progress)
  }

  /**
   * Получить VMAF прогресс для item
   */
  getVmafProgress(itemId: string): CqSearchProgress | undefined {
    return this.vmafProgressMap.get(itemId)
  }

  /**
   * Получить все VMAF прогрессы
   */
  getAllVmafProgress(): Record<string, CqSearchProgress> {
    return Object.fromEntries(this.vmafProgressMap)
  }

  /**
   * Очистить VMAF прогресс для item
   */
  clearVmafProgress(itemId: string): void {
    this.vmafProgressMap.delete(itemId)
  }

  // === FFmpeg Log Viewer ===

  /**
   * Получить все логи видеопула
   */
  getVideoLogs(): LogEntry[] {
    return this.videoPool.getAllLogs()
  }

  /**
   * Получить логи конкретной видео-задачи
   */
  getVideoTaskLogs(taskId: string): LogEntry[] {
    return this.videoPool.getTaskLogs(taskId)
  }

  /**
   * Очистить все видео-логи
   */
  clearVideoLogs(): void {
    this.videoPool.clearAllLogs()
  }

  /**
   * Получить количество записей в видео-логах
   */
  getVideoLogCount(): number {
    return this.videoPool.getLogCount()
  }

  // === Защита от дублирования обработки ===

  /**
   * Проверить, обрабатывается ли item или вообще идёт обработка
   *
   * @param itemId Опциональный ID item для проверки конкретного
   * @returns true если обрабатывается
   */
  isItemProcessing(itemId?: string): boolean {
    if (itemId) {
      return this.processingItemId === itemId
    }
    return (
      this.processingItemId !== null || this.videoPool.getStatus().running > 0 || this.audioPool.getStatus().running > 0
    )
  }

  /**
   * Установить текущий обрабатываемый item (защита от дублей)
   *
   * @returns true если успешно установлен, false если уже обрабатывается другой
   */
  setProcessingItem(itemId: string | null): boolean {
    if (itemId === null) {
      this.processingItemId = null
      return true
    }

    // Если уже обрабатывается этот же item — не запускаем повторно!
    // Это защита от перезагрузки страницы и навигации
    if (this.processingItemId === itemId) {
      log.warn('Item already processing, rejecting duplicate', { itemId })
      return false
    }

    // Если обрабатывается другой item — не разрешаем
    if (this.processingItemId !== null) {
      log.warn('Cannot set processing item, another item already processing', {
        requestedItem: itemId,
        currentItem: this.processingItemId,
      })
      return false
    }

    this.processingItemId = itemId
    return true
  }

  /**
   * Получить ID текущего обрабатываемого item
   */
  getProcessingItemId(): string | null {
    return this.processingItemId
  }

  /**
   * Добавить один эпизод для импорта
   */
  addImportItem(item: BatchImportItem): void {
    // Защита от дублей — не добавлять item который уже существует
    if (this.importQueue.has(item.id)) {
      log.warn('Item already exists in queue, skipping', { itemId: item.id })
      return
    }

    // Создаём видео-задачу
    const videoTask: VideoPoolTask = {
      id: `video-${item.id}`,
      type: 'video',
      queueItemId: item.id,
      animeQueueItemId: item.animeQueueItemId,
      episodeId: item.episodeId,
      inputPath: item.video.inputPath,
      outputPath: item.video.outputPath,
      options: item.video.options,
      status: 'queued',
      progress: null,
      // Передаём CPU fallback из VMAF результата
      useCpuFallback: item.video.useCpuFallback,
      // Размер исходного видеопотока (без аудио/сабов) — для честного сравнения экономии
      sourceStreamSize: item.video.sourceStreamSize,
    }

    // Создаём аудио-задачи
    const audioTasks: AudioPoolTask[] = item.audioTracks.map((track) => ({
      id: `audio-${item.id}-${track.trackIndex}`,
      type: 'audio',
      queueItemId: item.id,
      animeQueueItemId: item.animeQueueItemId,
      episodeId: item.episodeId,
      trackId: track.trackId,
      trackIndex: track.trackIndex,
      inputPath: track.inputPath,
      outputPath: track.outputPath,
      options: track.options,
      status: 'queued',
      progress: null,
      // Флаг для кодирования напрямую из исходного MKV (нужен -map 0:a:N)
      useStreamMapping: track.useStreamMapping,
      // Режим passthrough — копировать без транскодирования
      passthrough: track.passthrough,
      originalCodec: track.originalCodec,
    }))

    // DEBUG: Логируем аудио-задачи с passthrough
    log.info('Creating audio tasks', {
      itemId: item.id,
      audioTracksCount: audioTasks.length,
      tracks: audioTasks.map((t) => ({
        trackId: t.trackId,
        passthrough: t.passthrough,
        originalCodec: t.originalCodec,
        inputPath: t.inputPath?.slice(-50),
      })),
    })

    // Сохраняем в очередь импорта
    const importItem: ImportQueueItem = {
      id: item.id,
      episodeId: item.episodeId,
      status: 'processing',
      videoTask,
      audioTasks,
      addedAt: new Date().toISOString(),
    }
    this.importQueue.set(item.id, importItem)

    // Добавляем в пулы — они начнут обработку параллельно
    this.videoPool.addTask(videoTask)
    this.audioPool.addTasks(audioTasks)

    this.emit('itemAdded', item.id, item.episodeId)
  }

  /** Получить агрегированный прогресс */
  getAggregatedProgress(): AggregatedProgress {
    const videoStatus = this.videoPool.getStatus()
    const audioStatus = this.audioPool.getStatus()

    // Считаем статистику
    const videoCompleted = videoStatus.tasks.filter((t) => t.status === 'completed').length
    const videoErrors = videoStatus.tasks.filter((t) => t.status === 'error').length
    const audioCompleted = audioStatus.tasks.filter((t) => t.status === 'completed').length
    const audioErrors = audioStatus.tasks.filter((t) => t.status === 'error').length

    // Рассчитываем средний процент активных видео-задач
    const runningVideoTasks = videoStatus.tasks.filter((t) => t.status === 'running')
    let currentVideoPercent = 0
    if (runningVideoTasks.length > 0) {
      const totalPercent = runningVideoTasks.reduce((sum, task) => sum + (task.progress?.percent ?? 0), 0)
      currentVideoPercent = totalPercent / runningVideoTasks.length
    }

    // Взвешенный прогресс: видео 80%, аудио 20%
    // Учитываем прогресс текущих видео-задач для более плавного отображения
    const videoWeight = 0.8
    const audioWeight = 0.2

    // Прогресс видео: завершённые + частичный прогресс активных
    const videoTotal = videoStatus.tasks.length
    const videoProgress = videoTotal > 0
      ? ((videoCompleted + (runningVideoTasks.length > 0 ? currentVideoPercent / 100 : 0)) / videoTotal) * 100
      : 100

    // Прогресс аудио: только завершённые (аудио быстро кодируется)
    const audioTotal = audioStatus.tasks.length
    const audioProgress = audioTotal > 0 ? (audioCompleted / audioTotal) * 100 : 100

    // Итоговый взвешенный прогресс
    const totalPercent = videoProgress * videoWeight + audioProgress * audioWeight

    // Статистика текущего элемента (per-anime)
    // processingItemId — это ID аниме в очереди импорта (не episodeId)
    const currentAnimeId = this.processingItemId
    let currentItemStats = undefined
    if (currentAnimeId) {
      // Фильтруем по animeQueueItemId, которое мы передали при создании batch items
      const itemVideoTasks = videoStatus.tasks.filter((t) => t.animeQueueItemId === currentAnimeId)
      const itemAudioTasks = audioStatus.tasks.filter((t) => t.animeQueueItemId === currentAnimeId)

      if (itemVideoTasks.length > 0 || itemAudioTasks.length > 0) {
        currentItemStats = {
          itemId: currentAnimeId,
          videoTotal: itemVideoTasks.length,
          videoCompleted: itemVideoTasks.filter((t) => t.status === 'completed').length,
          audioTotal: itemAudioTasks.length,
          audioCompleted: itemAudioTasks.filter((t) => t.status === 'completed').length,
        }
      }
    }

    return {
      totalPercent,
      currentVideoPercent,
      videoTasks: {
        active: videoStatus.running,
        queued: videoStatus.queued,
        completed: videoCompleted,
        total: videoStatus.tasks.length,
        errors: videoErrors,
        tasks: videoStatus.tasks.filter((t) => t.status === 'running' || t.status === 'queued'),
      },
      audioTasks: {
        active: audioStatus.running,
        queued: audioStatus.queued,
        completed: audioCompleted,
        total: audioStatus.tasks.length,
        errors: audioErrors,
        tasks: audioStatus.tasks.filter((t) => t.status === 'running' || t.status === 'queued'),
      },
      items: Array.from(this.importQueue.values()),
      currentItemStats,
    }
  }

  /** Приостановить все задачи */
  pauseAll(): void {
    this.globalPause = true
    this.videoPool.pauseAll()
    this.audioPool.pauseAll()
    this.emit('paused')
  }

  /** Возобновить все задачи */
  resumeAll(): void {
    this.globalPause = false
    this.videoPool.resumeAll()
    this.audioPool.resumeAll()
    this.emit('resumed')
  }

  /** Отменить элемент импорта */
  cancelItem(itemId: string): boolean {
    const item = this.importQueue.get(itemId)
    if (!item) {
      return false
    }

    // Отменяем видео
    this.videoPool.cancelTask(item.videoTask.id)

    // Отменяем все аудио
    for (const audioTask of item.audioTasks) {
      this.audioPool.cancelTask(audioTask.id)
    }

    item.status = 'cancelled'
    this.emit('itemCancelled', itemId, item.episodeId)
    this.emitAggregatedProgress()
    return true
  }

  /** Отменить все */
  cancelAll(): void {
    log.warn('CANCEL ALL called', { importQueue: this.importQueue.size })
    log.debug('cancelAll() stack trace', { stack: new Error().stack })
    this.videoPool.clear()
    this.audioPool.clear()

    for (const item of this.importQueue.values()) {
      item.status = 'cancelled'
    }

    this.emit('allCancelled')
    this.emitAggregatedProgress()
  }

  /** Очистить завершённые элементы */
  clearCompleted(): void {
    for (const [id, item] of this.importQueue) {
      if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error') {
        this.importQueue.delete(id)
      }
    }
    this.completedVideoTasks.clear()
    this.completedAudioTasks.clear()
  }

  /** Получить элемент по ID */
  getItem(itemId: string): ImportQueueItem | undefined {
    return this.importQueue.get(itemId)
  }

  /** Получить все элементы */
  getItems(): ImportQueueItem[] {
    return Array.from(this.importQueue.values())
  }

  /** Проверить, есть ли активные задачи */
  isProcessing(): boolean {
    const videoStatus = this.videoPool.getStatus()
    const audioStatus = this.audioPool.getStatus()
    return videoStatus.running > 0 || audioStatus.running > 0 || videoStatus.queued > 0 || audioStatus.queued > 0
  }

  // === Приватные методы ===

  /** Настройка слушателей событий от пулов */
  private setupPoolListeners(): void {
    // === Video Pool Events ===

    this.videoPool.on('taskProgress', (taskId: string, progress) => {
      this.emit('videoProgress', taskId, progress)
      this.emitAggregatedProgressThrottled() // Throttled: 4 раза/сек вместо каждого события
    })

    this.videoPool.on('taskCompleted', (task: VideoPoolTask) => {
      this.completedVideoTasks.add(task.id)
      this.handleVideoCompleted(task)
    })

    this.videoPool.on('taskError', (task: VideoPoolTask) => {
      this.emit('taskError', task.id, 'video', task.error)
      this.handleTaskError(task.queueItemId)
    })

    this.videoPool.on('taskCancelled', (_task: VideoPoolTask) => {
      // Уже обработано в cancelItem
    })

    // === Audio Pool Events ===

    this.audioPool.on('taskProgress', (taskId: string, progress) => {
      this.emit('audioProgress', taskId, progress)
      this.emitAggregatedProgressThrottled() // Throttled: 4 раза/сек вместо каждого события
    })

    this.audioPool.on('taskCompleted', (task: AudioPoolTask) => {
      this.completedAudioTasks.add(task.id)
      this.handleAudioCompleted(task)
    })

    this.audioPool.on('taskError', (task: AudioPoolTask) => {
      this.emit('taskError', task.id, 'audio', task.error)
      this.handleTaskError(task.queueItemId)
    })

    this.audioPool.on('taskCancelled', (_task: AudioPoolTask) => {
      // Уже обработано в cancelItem
    })
  }

  /** Обработка завершения видео */
  private handleVideoCompleted(task: VideoPoolTask): void {
    const item = this.importQueue.get(task.queueItemId)
    if (!item) {
      log.warn('handleVideoCompleted: item not found in queue', { itemId: task.queueItemId })
      return
    }

    log.info('Video task completed', {
      itemId: task.queueItemId,
      videoStatus: item.videoTask.status,
    })

    item.videoCompleted = true

    // Захватываем размеры до того как файлы будут удалены при IPFS-загрузке.
    // sourceSize — предпочитаем размер исходного видеопотока (из демукса), а не файла
    // целиком (с аудио/сабами), чтобы сравнение с transcodedSize (video.webm) было честным.
    if (task.sourceStreamSize !== undefined) {
      task.sourceSize = task.sourceStreamSize
    } else {
      try {
        task.sourceSize = fs.statSync(task.inputPath).size
      } catch {
        /* исходник может быть недоступен — не критично */
      }
    }
    try {
      task.transcodedSize = fs.statSync(task.outputPath).size
    } catch {
      /* output ещё не записан — не критично */
    }

    // Передаём все данные о кодировании для сохранения в БД
    this.emit('videoCompleted', task.queueItemId, task.episodeId, task.outputPath, {
      ffmpegCommand: task.ffmpegCommand,
      transcodeDurationMs: task.transcodeDurationMs,
      activeGpuWorkers: task.activeGpuWorkers,
    })
    this.emitAggregatedProgress() // Обновить счётчики
    this.checkItemCompletion(item)
  }

  /** Обработка завершения аудио — загрузка в IPFS и обновление БД */
  private handleAudioCompleted(task: AudioPoolTask): void {
    this.emit(
      'audioTrackCompleted',
      task.trackId,
      task.outputPath,
      task.episodeId,
      task.passthrough,
      task.originalCodec,
    )

    // Загружаем аудио в IPFS и обновляем transcodedCid + ipfsSize в БД
    this.uploadAudioToIpfs(task).catch((err) => {
      log.error('Ошибка загрузки аудио в IPFS', { trackId: task.trackId, error: String(err) })
    })

    const item = this.importQueue.get(task.queueItemId)
    if (item) {
      const audioStatuses = item.audioTasks.map((t) => t.status).join(', ')
      log.info('Audio track completed', {
        itemId: task.queueItemId,
        trackId: task.trackId,
        audioStatuses,
      })
      this.emitAggregatedProgress() // Обновить счётчики
      this.checkItemCompletion(item)
    } else {
      log.warn('handleAudioCompleted: item not found', { itemId: task.queueItemId })
    }
  }

  /** Загружает транскодированное аудио в IPFS и обновляет запись в БД */
  private async uploadAudioToIpfs(task: AudioPoolTask): Promise<void> {
    const result = await uploadToIpfs(task.outputPath)
    if (!result) {
      log.warn('uploadAudioToIpfs: не удалось загрузить', { trackId: task.trackId, path: task.outputPath })
      return
    }

    await updateAudioTrack(task.trackId, {
      transcodedCid: result.cid,
      ipfsSize: result.size ?? null,
      // Обновляем битрейт на целевой (не исходный из ffprobe)
      ...(task.passthrough ? {} : { bitrate: task.options.targetBitrate * 1000 }),
    })

    log.info('Аудио загружено в IPFS', {
      trackId: task.trackId,
      cid: result.cid,
      size: result.size,
    })

    // Удаляем temp файл после успешной загрузки
    try {
      const fs = await import('fs')
      // Не удаляем если input === output (passthrough)
      if (task.inputPath !== task.outputPath) {
        fs.unlinkSync(task.outputPath)
      }
    } catch {
      /* файл может быть уже удалён */
    }
  }

  /** Обработка ошибки в задаче */
  private handleTaskError(itemId: string): void {
    const item = this.importQueue.get(itemId)
    if (!item) {
      return
    }

    this.emit('itemError', itemId, item.episodeId)
    this.emitAggregatedProgress()

    // Проверяем завершение элемента — ошибочная задача тоже считается "finished"
    this.checkItemCompletion(item)
  }

  /** Проверка полного завершения элемента */
  private checkItemCompletion(item: ImportQueueItem): void {
    // Проверяем видео (завершено = completed, error или cancelled)
    const videoFinished = item.videoTask.status === 'completed'
      || item.videoTask.status === 'error'
      || item.videoTask.status === 'cancelled'
    const videoSuccessful = item.videoTask.status === 'completed'

    // Проверяем все аудио
    const allAudioFinished = item.audioTasks.every(
      (t) => t.status === 'completed' || t.status === 'error' || t.status === 'cancelled',
    )
    const allAudioSuccessful = item.audioTasks.every((t) => t.status === 'completed')

    // Отладочный вывод для диагностики
    const audioStatuses = item.audioTasks.map((t) => t.status)
    const audioCompleted = audioStatuses.filter((s) => s === 'completed').length
    const audioTotal = item.audioTasks.length
    log.debug('checkItemCompletion progress', {
      itemId: item.id,
      videoStatus: item.videoTask.status,
      videoFinished,
      audioCompleted,
      audioTotal,
      allAudioFinished,
    })

    if (videoFinished && allAudioFinished) {
      if (videoSuccessful && allAudioSuccessful) {
        item.status = 'completed'
        log.info('Item completed successfully', { itemId: item.id, episodeId: item.episodeId })
        this.emit('itemCompleted', item.id, item.episodeId, true)
      } else {
        item.status = 'error'
        const errorMessage = item.videoTask.error || item.audioTasks.find((t) => t.error)?.error || 'Unknown error'
        log.error('Item completed with error', { itemId: item.id, error: errorMessage })
        this.emit('itemCompleted', item.id, item.episodeId, false, errorMessage)
        this.emit('itemError', item.id, item.episodeId)
      }
      this.emitAggregatedProgress()

      // Проверяем завершение всего batch
      this.checkBatchCompletion()
    }
  }

  /** Проверка завершения всего batch */
  private checkBatchCompletion(): void {
    if (!this.currentBatchId || this.currentBatchItems.size === 0) {
      return
    }

    // Проверяем статус всех элементов batch
    let allCompleted = true
    let hasErrors = false

    for (const itemId of this.currentBatchItems) {
      const item = this.importQueue.get(itemId)
      if (!item) {
        continue
      }

      if (item.status === 'processing') {
        allCompleted = false
        break
      }

      if (item.status === 'error') {
        hasErrors = true
      }
    }

    if (allCompleted) {
      const batchId = this.currentBatchId
      log.info('Batch completed', { batchId, hasErrors })

      // Сбрасываем batch данные
      this.currentBatchId = null
      this.currentBatchItems.clear()

      // Эмитим событие завершения batch
      this.emit('batchCompleted', batchId, !hasErrors)
    }
  }

  /**
   * Throttled версия emitAggregatedProgress
   * Ограничивает частоту отправки до 4 раз/сек (250ms интервал)
   * Это снижает нагрузку на IPC и количество re-renders в renderer
   */
  private emitAggregatedProgressThrottled(): void {
    const now = Date.now()
    if (now - this.lastProgressEmitTime < this.PROGRESS_EMIT_INTERVAL) {
      return
    }
    this.lastProgressEmitTime = now
    this.emitAggregatedProgress()
  }

  /** Отправить агрегированный прогресс */
  private emitAggregatedProgress(): void {
    const progress = this.getAggregatedProgress()

    // DEBUG: Логируем прогресс видео-задач (только при наличии активных)
    if (progress.videoTasks.tasks.length > 0) {
      const _videoProgress = progress.videoTasks.tasks.map((t) => ({
        id: t.id.slice(-6),
        status: t.status,
        percent: t.progress?.percent?.toFixed(1) ?? 'null',
      }))
    }

    this.emit('aggregatedProgress', progress)
  }
}
