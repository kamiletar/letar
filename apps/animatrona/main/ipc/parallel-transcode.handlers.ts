/**
 * IPC handlers для параллельного транскодирования
 *
 * Каналы:
 * - parallelTranscode:addBatch — добавить batch эпизодов
 * - parallelTranscode:setAudioMaxConcurrent — установить лимит параллельных аудио-задач
 * - parallelTranscode:setVideoMaxConcurrent — установить лимит параллельных видео-задач
 * - parallelTranscode:getProgress — получить агрегированный прогресс
 * - parallelTranscode:pause — приостановить всё
 * - parallelTranscode:resume — возобновить всё
 * - parallelTranscode:cancelItem — отменить элемент импорта
 * - parallelTranscode:cancelAll — отменить всё
 * - parallelTranscode:clearCompleted — очистить завершённые
 *
 * События (отправляются в renderer):
 * - parallelTranscode:aggregatedProgress — агрегированный прогресс
 * - parallelTranscode:videoProgress — прогресс видео-задачи
 * - parallelTranscode:audioProgress — прогресс аудио-задачи
 * - parallelTranscode:videoCompleted — видео готово
 * - parallelTranscode:audioTrackCompleted — аудиодорожка готова
 * - parallelTranscode:itemCompleted — элемент полностью готов
 * - parallelTranscode:itemError — ошибка элемента
 * - parallelTranscode:taskError — ошибка задачи
 */

import { ipcMain } from 'electron'
import { z } from 'zod'
import type { TranscodeProgressExtended } from '../../shared/types'
import type {
  AggregatedProgress,
  BatchAudioTrackInput,
  BatchImportItem,
  BatchVideoInput,
} from '../../shared/types/parallel-transcode'
import type { CqSearchProgress } from '../../shared/types/vmaf'
import { ParallelTranscodeManager } from '../services/parallel-transcode-manager'
import { broadcastToWindows } from '../utils/ipc-handler-factory'
import { absolutePathSchema, createValidatedHandler, idSchema } from '../utils/ipc-validator'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('ParallelTranscodeHandlers')

/** Флаг для предотвращения повторной регистрации (утечка памяти) */
let isRegistered = false

// ============================================================
// Zod схемы для валидации (с compile-time проверкой типов)
// ============================================================

/** Схема для видео в batch import */
const batchVideoInputSchema: z.ZodType<BatchVideoInput> = z.object({
  inputPath: absolutePathSchema,
  outputPath: absolutePathSchema,
  options: z.record(z.string(), z.unknown()), // VideoTranscodeOptions
})

/** Схема для аудио-трека в batch import */
const batchAudioTrackSchema: z.ZodType<BatchAudioTrackInput> = z.object({
  trackId: idSchema,
  trackIndex: z.number().int(), // Может быть -1 для внешних аудиофайлов
  inputPath: absolutePathSchema,
  outputPath: absolutePathSchema,
  options: z.record(z.string(), z.unknown()), // AudioTranscodeVBROptions
  useStreamMapping: z.boolean().optional(),
  syncOffset: z.number().optional(),
  isExternal: z.boolean().optional(),
  title: z.string().optional(),
  language: z.string().optional(),
  // Passthrough режим — копировать без транскодирования (AAC/MP3 с хорошим качеством)
  passthrough: z.boolean().optional(),
  originalCodec: z.string().optional(),
})

/** Схема для BatchImportItem (compile-time проверка типа) */
const batchImportItemSchema: z.ZodType<BatchImportItem> = z.object({
  id: idSchema,
  episodeId: idSchema,
  video: batchVideoInputSchema,
  audioTracks: z.array(batchAudioTrackSchema),
})

/** Схема для addBatch */
const addBatchSchema = z.array(batchImportItemSchema)

/** Схема для addBatch с batchId */
const addBatchWithIdSchema = z.object({
  items: z.array(batchImportItemSchema),
  batchId: z.string().optional(),
})

/** Схема для startNewBatch с concurrency */
const startNewBatchSchema = z.object({
  items: z.array(batchImportItemSchema),
  batchId: z.string().optional(),
  concurrency: z
    .object({
      videoMaxConcurrent: z.number().int().min(1).max(16).optional(),
      audioMaxConcurrent: z.number().int().min(1).max(16).optional(),
    })
    .optional(),
})

/** Схема для concurrency */
const concurrencySchema = z.number().int().min(1).max(16)

/** Схема для itemId */
const itemIdSchema = idSchema

// ============================================================
// Event handlers (именованные для возможности удаления)
// ============================================================

function onAggregatedProgress(progress: AggregatedProgress): void {
  broadcastToWindows('parallelTranscode:aggregatedProgress', progress)

  // Прямое обновление ImportQueueController из main process
  // Это устраняет зависимость от renderer round-trip:
  // Раньше: Main → aggregatedProgress → Renderer → updateProgress IPC → Main → item-progress → UI
  // Теперь: Main → aggregatedProgress → Main (напрямую) → item-progress → UI
  // Renderer round-trip сохраняется как дополнительный канал для совместимости
  updateImportQueueProgressFromMain(progress)
}

/**
 * Обновить прогресс ImportQueueController напрямую из aggregatedProgress
 *
 * КРИТИЧНО: Эмитим import-queue:item-progress НАПРЯМУЮ в renderer, минуя
 * throttle механизм в updateItemProgress. Два throttle (aggregatedProgress 250ms +
 * updateItemProgress 250ms) создавали ситуацию когда renderer и direct path
 * взаимно блокировали друг друга → UI замерзал.
 *
 * Теперь: каждый aggregatedProgress (4 раза/сек) → напрямую item-progress в UI.
 */
function updateImportQueueProgressFromMain(progress: AggregatedProgress): void {
  // Ленивый импорт — ImportQueueController может быть ещё не инициализирован
  let controller: import('../services/import-queue-controller').ImportQueueController
  try {
    const { ImportQueueController } = require('../services/import-queue-controller')
    controller = ImportQueueController.getInstance()
  } catch {
    return
  }

  const manager = ParallelTranscodeManager.getInstance()
  const processingItemId = manager.getProcessingItemId()
  if (!processingItemId) {
    return
  }

  // Энкод занимает 15-90% общего прогресса (0-4% подготовка, 5-15% демукс, 91-95% постобработка)
  const newProgress = 15 + progress.totalPercent * 0.75

  // Собираем данные о GPU воркерах
  const videoWorkers = progress.videoTasks.tasks
    .filter((t) => t.status === 'running')
    .map((t) => ({
      gpuIndex: t.gpuIndex ?? 0,
      fileName: t.inputPath.split(/[/\\]/).pop() ?? 'video',
      progress: t.progress?.percent ?? 0,
      fps: t.progress?.fps,
      fpsHistory: t.progress?.fpsHistory,
      speed: t.progress?.speed,
      bitrate: t.progress?.bitrate,
      cq: t.options.cq,
      vmafScore: undefined as number | undefined,
      useCpuFallback: t.useCpuFallback,
      elapsedMs: t.startedAt ? Date.now() - t.startedAt : undefined,
    }))

  // Собираем данные о CPU воркерах
  const audioWorkers = progress.audioTasks.tasks
    .filter((t) => t.status === 'running' || t.status === 'completed')
    .slice(0, 8)
    .map((t) => ({
      workerId: t.id,
      name: t.title ?? `Track ${t.trackIndex}`,
      language: t.language,
      progress: t.progress?.percent ?? 0,
      status: t.status as 'pending' | 'running' | 'completed' | 'error',
    }))

  // Список завершённых видео-файлов с размерами (для отображения экономии)
  const completedVideoFiles = progress.videoTasks.tasks
    .filter((t) => t.status === 'completed')
    .map((t) => ({
      fileName: t.inputPath.split(/[/\\]/).pop() ?? 'video',
      sourceSize: t.sourceSize,
      transcodedSize: t.transcodedSize,
      cq: t.options.cq,
    }))

  const detailProgress = {
    videoWorkers,
    audioWorkers,
    completedVideoFiles,
    videoTotal: progress.currentItemStats?.videoTotal ?? progress.videoTasks.total,
    videoCompleted: progress.currentItemStats?.videoCompleted ?? progress.videoTasks.completed,
    audioTotal: progress.currentItemStats?.audioTotal ?? progress.audioTasks.total,
    audioCompleted: progress.currentItemStats?.audioCompleted ?? progress.audioTasks.completed,
  }

  // Обновляем internal state контроллера (без throttle — только state)
  controller.updateItemProgressInternal(processingItemId, newProgress, 'transcoding', detailProgress)

  // Эмитим напрямую в renderer, МИНУЯ throttle
  // Это единственный надёжный путь: Main → UI без посредников
  controller.emitItemProgressDirect(processingItemId, newProgress, undefined, 'transcoding', detailProgress)
}

function onVideoProgress(taskId: string, progress: TranscodeProgressExtended): void {
  broadcastToWindows('parallelTranscode:videoProgress', taskId, progress)
}

function onAudioProgress(taskId: string, progress: TranscodeProgressExtended): void {
  broadcastToWindows('parallelTranscode:audioProgress', taskId, progress)
}

/** Метаданные о кодировании видео */
interface VideoCompletedMeta {
  ffmpegCommand?: string
  transcodeDurationMs?: number
  activeGpuWorkers?: number
}

function onVideoCompleted(itemId: string, episodeId: string, outputPath: string, meta?: VideoCompletedMeta): void {
  broadcastToWindows('parallelTranscode:videoCompleted', itemId, episodeId, outputPath, meta)
}

function onAudioTrackCompleted(
  trackId: string,
  outputPath: string,
  episodeId: string,
  passthrough?: boolean,
  originalCodec?: string
): void {
  broadcastToWindows(
    'parallelTranscode:audioTrackCompleted',
    trackId,
    outputPath,
    episodeId,
    passthrough,
    originalCodec
  )
}

function onItemCompleted(itemId: string, episodeId: string, success: boolean, errorMessage?: string): void {
  log.info('Broadcasting itemCompleted', { itemId, success })
  broadcastToWindows('parallelTranscode:itemCompleted', itemId, episodeId, success, errorMessage)
}

function onItemError(itemId: string, episodeId: string): void {
  broadcastToWindows('parallelTranscode:itemError', itemId, episodeId)
}

function onTaskError(taskId: string, type: 'video' | 'audio', error: string): void {
  broadcastToWindows('parallelTranscode:taskError', taskId, type, error)
}

function onPaused(): void {
  broadcastToWindows('parallelTranscode:paused')
}

function onResumed(): void {
  broadcastToWindows('parallelTranscode:resumed')
}

function onItemAdded(itemId: string, episodeId: string): void {
  broadcastToWindows('parallelTranscode:itemAdded', itemId, episodeId)
}

function onBatchCompleted(batchId: string, success: boolean): void {
  broadcastToWindows('parallelTranscode:batchCompleted', batchId, success)
}

function onAllCancelled(): void {
  broadcastToWindows('parallelTranscode:allCancelled')
}

function onVmafProgress(itemId: string, progress: CqSearchProgress): void {
  broadcastToWindows('parallelTranscode:vmafProgress', itemId, progress)
}

/** Событие для real-time логов (зарезервировано для будущего использования) */
function _onVideoLogEntry(
  taskId: string,
  entry: { timestamp: number; level: 'info' | 'warning' | 'error'; message: string }
): void {
  broadcastToWindows('parallelTranscode:videoLogEntry', taskId, entry)
}

/**
 * Регистрирует IPC handlers для параллельного транскодирования
 *
 * @remarks
 * Функция idempotent — повторные вызовы игнорируются для предотвращения утечки памяти
 */
export function registerParallelTranscodeHandlers(): void {
  // Предотвращаем повторную регистрацию (утечка event listeners)
  if (isRegistered) {
    log.warn('Handlers already registered, skipping')
    return
  }

  const manager = ParallelTranscodeManager.getInstance()

  // === Подписка на события менеджера (используем именованные функции) ===
  manager.on('aggregatedProgress', onAggregatedProgress)
  manager.on('videoProgress', onVideoProgress)
  manager.on('audioProgress', onAudioProgress)
  manager.on('videoCompleted', onVideoCompleted)
  manager.on('audioTrackCompleted', onAudioTrackCompleted)
  manager.on('itemCompleted', onItemCompleted)
  manager.on('itemError', onItemError)
  manager.on('taskError', onTaskError)
  manager.on('paused', onPaused)
  manager.on('resumed', onResumed)
  manager.on('itemAdded', onItemAdded)
  manager.on('batchCompleted', onBatchCompleted)
  manager.on('allCancelled', onAllCancelled)
  manager.on('vmafProgress', onVmafProgress)

  // VideoPool логи (real-time через события)
  // Примечание: события идут через videoPool, а не manager
  // Но manager предоставляет методы доступа

  // === IPC Handlers с валидацией ===

  // Добавить batch эпизодов (legacy без batchId)
  ipcMain.handle(
    'parallelTranscode:addBatch',
    createValidatedHandler(addBatchSchema, async (items: BatchImportItem[]) => {
      manager.addBatch(items)
    })
  )

  // Добавить batch эпизодов с batchId
  ipcMain.handle(
    'parallelTranscode:addBatchWithId',
    createValidatedHandler(
      addBatchWithIdSchema,
      async ({ items, batchId }: { items: BatchImportItem[]; batchId?: string }) => {
        manager.addBatch(items, batchId)
      }
    )
  )

  // Начать новый batch с полным сбросом + лимиты конкурентности
  ipcMain.handle(
    'parallelTranscode:startNewBatch',
    createValidatedHandler(
      startNewBatchSchema,
      async ({
        items,
        batchId,
        concurrency,
      }: {
        items: BatchImportItem[]
        batchId?: string
        concurrency?: { videoMaxConcurrent?: number; audioMaxConcurrent?: number }
      }) => {
        manager.startNewBatch(items, batchId, concurrency)
      }
    )
  )

  // Получить текущий batch ID
  ipcMain.handle('parallelTranscode:getCurrentBatchId', async () => {
    try {
      return { success: true, data: manager.getCurrentBatchId() }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Получить текущие лимиты параллельности
  ipcMain.handle('parallelTranscode:getConcurrencyLimits', async () => {
    try {
      return {
        success: true,
        data: {
          videoMaxConcurrent: manager.getVideoMaxConcurrent(),
          audioMaxConcurrent: manager.getAudioMaxConcurrent(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Установить лимит параллельных аудио-задач
  ipcMain.handle(
    'parallelTranscode:setAudioMaxConcurrent',
    createValidatedHandler(concurrencySchema, async (value: number) => {
      manager.setAudioMaxConcurrent(value)
      return manager.getAudioMaxConcurrent()
    })
  )

  // Установить лимит параллельных видео-задач
  ipcMain.handle(
    'parallelTranscode:setVideoMaxConcurrent',
    createValidatedHandler(concurrencySchema, async (value: number) => {
      manager.setVideoMaxConcurrent(value)
      return manager.getVideoMaxConcurrent()
    })
  )

  // Добавить один элемент
  ipcMain.handle(
    'parallelTranscode:addItem',
    createValidatedHandler(batchImportItemSchema, async (item: BatchImportItem) => {
      manager.addImportItem(item)
    })
  )

  // Получить агрегированный прогресс (без валидации — нет входных данных)
  ipcMain.handle('parallelTranscode:getProgress', async () => {
    try {
      const progress = manager.getAggregatedProgress()
      return { success: true, data: progress }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Получить элемент по ID
  ipcMain.handle(
    'parallelTranscode:getItem',
    createValidatedHandler(itemIdSchema, async (itemId: string) => {
      return manager.getItem(itemId)
    })
  )

  // Получить все элементы
  ipcMain.handle('parallelTranscode:getItems', async () => {
    try {
      const items = manager.getItems()
      return { success: true, data: items }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Проверить, идёт ли обработка
  ipcMain.handle('parallelTranscode:isProcessing', async () => {
    try {
      const processing = manager.isProcessing()
      return { success: true, data: processing }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Приостановить всё
  ipcMain.handle('parallelTranscode:pause', async () => {
    try {
      manager.pauseAll()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Возобновить всё
  ipcMain.handle('parallelTranscode:resume', async () => {
    try {
      manager.resumeAll()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Отменить элемент
  ipcMain.handle(
    'parallelTranscode:cancelItem',
    createValidatedHandler(itemIdSchema, async (itemId: string) => {
      return manager.cancelItem(itemId)
    })
  )

  // Отменить всё
  ipcMain.handle('parallelTranscode:cancelAll', async () => {
    try {
      manager.cancelAll()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Очистить завершённые
  ipcMain.handle('parallelTranscode:clearCompleted', async () => {
    try {
      manager.clearCompleted()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // === VMAF прогресс (сохраняется в main для навигации) ===

  // Получить VMAF прогресс для item
  ipcMain.handle(
    'parallelTranscode:getVmafProgress',
    createValidatedHandler(itemIdSchema.optional(), async (itemId?: string) => {
      if (itemId) {
        return manager.getVmafProgress(itemId)
      }
      return manager.getAllVmafProgress()
    })
  )

  // Получить все VMAF прогрессы
  ipcMain.handle('parallelTranscode:getAllVmafProgress', async () => {
    try {
      const progress = manager.getAllVmafProgress()
      return { success: true, data: progress }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // === Защита от дублирования обработки ===

  // Проверить, обрабатывается ли item
  ipcMain.handle('parallelTranscode:isItemProcessing', async (_event, itemId?: string) => {
    try {
      const isProcessing = manager.isItemProcessing(itemId)
      return { success: true, data: isProcessing }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Установить текущий обрабатываемый item
  ipcMain.handle('parallelTranscode:setProcessingItem', async (_event, itemId: string | null) => {
    try {
      const success = manager.setProcessingItem(itemId)
      return { success, data: success }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Получить ID текущего обрабатываемого item
  ipcMain.handle('parallelTranscode:getProcessingItemId', async () => {
    try {
      const itemId = manager.getProcessingItemId()
      return { success: true, data: itemId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // === FFmpeg Log Viewer ===

  // Получить все видео-логи
  ipcMain.handle('parallelTranscode:getVideoLogs', async () => {
    try {
      const logs = manager.getVideoLogs()
      return { success: true, data: logs }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Получить логи конкретной видео-задачи
  ipcMain.handle('parallelTranscode:getVideoTaskLogs', async (_event, taskId: string) => {
    try {
      const logs = manager.getVideoTaskLogs(taskId)
      return { success: true, data: logs }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Очистить все видео-логи
  ipcMain.handle('parallelTranscode:clearVideoLogs', async () => {
    try {
      manager.clearVideoLogs()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Получить количество записей в видео-логах
  ipcMain.handle('parallelTranscode:getVideoLogCount', async () => {
    try {
      const count = manager.getVideoLogCount()
      return { success: true, data: count }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  isRegistered = true
}

/**
 * Отменяет регистрацию handlers (для тестов или hot reload)
 */
export function unregisterParallelTranscodeHandlers(): void {
  if (!isRegistered) {
    return
  }

  const manager = ParallelTranscodeManager.getInstance()

  // Удаляем event listeners
  manager.off('aggregatedProgress', onAggregatedProgress)
  manager.off('videoProgress', onVideoProgress)
  manager.off('audioProgress', onAudioProgress)
  manager.off('videoCompleted', onVideoCompleted)
  manager.off('audioTrackCompleted', onAudioTrackCompleted)
  manager.off('itemCompleted', onItemCompleted)
  manager.off('itemError', onItemError)
  manager.off('taskError', onTaskError)
  manager.off('paused', onPaused)
  manager.off('resumed', onResumed)
  manager.off('itemAdded', onItemAdded)
  manager.off('batchCompleted', onBatchCompleted)
  manager.off('vmafProgress', onVmafProgress)

  // Удаляем IPC handlers
  ipcMain.removeHandler('parallelTranscode:addBatch')
  ipcMain.removeHandler('parallelTranscode:addBatchWithId')
  ipcMain.removeHandler('parallelTranscode:startNewBatch')
  ipcMain.removeHandler('parallelTranscode:getCurrentBatchId')
  ipcMain.removeHandler('parallelTranscode:getConcurrencyLimits')
  ipcMain.removeHandler('parallelTranscode:setAudioMaxConcurrent')
  ipcMain.removeHandler('parallelTranscode:setVideoMaxConcurrent')
  ipcMain.removeHandler('parallelTranscode:addItem')
  ipcMain.removeHandler('parallelTranscode:getProgress')
  ipcMain.removeHandler('parallelTranscode:getItem')
  ipcMain.removeHandler('parallelTranscode:getItems')
  ipcMain.removeHandler('parallelTranscode:isProcessing')
  ipcMain.removeHandler('parallelTranscode:pause')
  ipcMain.removeHandler('parallelTranscode:resume')
  ipcMain.removeHandler('parallelTranscode:cancelItem')
  ipcMain.removeHandler('parallelTranscode:cancelAll')
  ipcMain.removeHandler('parallelTranscode:clearCompleted')
  ipcMain.removeHandler('parallelTranscode:getVmafProgress')
  ipcMain.removeHandler('parallelTranscode:getAllVmafProgress')
  ipcMain.removeHandler('parallelTranscode:isItemProcessing')
  ipcMain.removeHandler('parallelTranscode:setProcessingItem')
  ipcMain.removeHandler('parallelTranscode:getProcessingItemId')
  ipcMain.removeHandler('parallelTranscode:getVideoLogs')
  ipcMain.removeHandler('parallelTranscode:getVideoTaskLogs')
  ipcMain.removeHandler('parallelTranscode:clearVideoLogs')
  ipcMain.removeHandler('parallelTranscode:getVideoLogCount')

  isRegistered = false
}
