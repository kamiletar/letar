/**
 * Preload — Очереди транскодирования
 *
 * Очередь транскодирования и параллельное транскодирование (Dual Encoders + CPU Audio).
 */

import { ipcRenderer } from 'electron'
import type {
  DemuxResult,
  PerFileTranscodeSettings,
  QueueItem,
  QueueItemStatus,
  TranscodeProgressExtended,
} from '../../shared/types'
import type { AggregatedProgress, BatchImportItem, ImportQueueItem } from '../../shared/types/parallel-transcode'
import { on } from './ipc-helper'

/** Очередь транскодирования */
export const transcodePreload = {
  /** Добавить файл в очередь */
  addToQueue: (
    filePath: string,
    settings?: PerFileTranscodeSettings,
  ): Promise<{ success: boolean; id?: string; error?: string }> =>
    ipcRenderer.invoke('transcode:addToQueue', filePath, settings),

  /** Удалить из очереди */
  removeFromQueue: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:removeFromQueue', id),

  /** Начать обработку очереди */
  start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('transcode:start'),

  /** Приостановить элемент */
  pauseItem: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:pauseItem', id),

  /** Возобновить элемент */
  resumeItem: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:resumeItem', id),

  /** Отменить элемент */
  cancelItem: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:cancelItem', id),

  /** Изменить порядок очереди */
  reorderQueue: (orderedIds: string[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:reorderQueue', orderedIds),

  /** Обновить настройки элемента */
  updateSettings: (id: string, settings: PerFileTranscodeSettings): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:updateSettings', id, settings),

  /** Получить текущую очередь */
  getQueue: (): Promise<{ success: boolean; queue: QueueItem[]; error?: string }> =>
    ipcRenderer.invoke('transcode:getQueue'),

  /** Получить элемент по ID */
  getItem: (id: string): Promise<{ success: boolean; item?: QueueItem; error?: string }> =>
    ipcRenderer.invoke('transcode:getItem', id),

  /** Анализировать элемент */
  analyzeItem: (id: string, demuxResult: DemuxResult): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:analyzeItem', id, demuxResult),

  /** Проверить возможность паузы */
  getPauseCapabilities: (): Promise<{
    success: boolean
    available: boolean
    method: 'signals' | 'pssuspend' | 'none'
    message?: string
    error?: string
  }> => ipcRenderer.invoke('transcode:getPauseCapabilities'),

  /** Приостановить всю обработку */
  pauseAll: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('transcode:pauseAll'),

  /** Возобновить всю обработку */
  resumeAll: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('transcode:resumeAll'),

  /** Установить путь к библиотеке */
  setLibraryPath: (libraryPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('transcode:setLibraryPath', libraryPath),

  /** Подписка на прогресс элемента */
  onProgress: on<[string, TranscodeProgressExtended]>('transcode:progress'),

  /** Подписка на изменение статуса */
  onStatusChange: on<[string, QueueItemStatus, string?]>('transcode:statusChange'),

  /** Подписка на изменение очереди */
  onQueueChange: on<[QueueItem[]]>('transcode:queueChange'),

  /** Подписка на начало обработки */
  onProcessingStarted: on<[]>('transcode:processingStarted'),

  /** Подписка на завершение обработки */
  onProcessingCompleted: on<[]>('transcode:processingCompleted'),
}

/** Параллельное транскодирование (Dual Encoders + CPU Audio) */
export const parallelTranscodePreload = {
  /** Добавить batch эпизодов для обработки (legacy без batchId) */
  addBatch: (items: BatchImportItem[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:addBatch', items),

  /** Добавить batch эпизодов для обработки с batchId */
  addBatchWithId: (items: BatchImportItem[], batchId?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:addBatchWithId', { items, batchId }),

  /** Начать новый batch с полным сбросом состояния + лимиты конкурентности */
  startNewBatch: (
    items: BatchImportItem[],
    batchId?: string,
    concurrency?: { videoMaxConcurrent?: number; audioMaxConcurrent?: number },
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:startNewBatch', { items, batchId, concurrency }),

  /** Получить текущий batch ID */
  getCurrentBatchId: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getCurrentBatchId'),

  /** Получить текущие лимиты параллельности */
  getConcurrencyLimits: (): Promise<{
    success: boolean
    data?: { videoMaxConcurrent: number; audioMaxConcurrent: number }
    error?: string
  }> => ipcRenderer.invoke('parallelTranscode:getConcurrencyLimits'),

  /** Установить максимальное количество параллельных аудио-задач */
  setAudioMaxConcurrent: (value: number): Promise<{ success: boolean; value?: number; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:setAudioMaxConcurrent', value),

  /** Установить максимальное количество параллельных видео-задач */
  setVideoMaxConcurrent: (value: number): Promise<{ success: boolean; value?: number; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:setVideoMaxConcurrent', value),

  /** Добавить один элемент */
  addItem: (item: BatchImportItem): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:addItem', item),

  /** Получить агрегированный прогресс */
  getProgress: (): Promise<{ success: boolean; progress: AggregatedProgress | null; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getProgress'),

  /** Получить элемент по ID */
  getItem: (itemId: string): Promise<{ success: boolean; item: ImportQueueItem | null; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getItem', itemId),

  /** Получить все элементы */
  getItems: (): Promise<{ success: boolean; items: ImportQueueItem[]; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getItems'),

  /** Проверить, идёт ли обработка */
  isProcessing: (): Promise<{ success: boolean; processing: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:isProcessing'),

  /** Приостановить всё */
  pause: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('parallelTranscode:pause'),

  /** Возобновить всё */
  resume: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('parallelTranscode:resume'),

  /** Отменить элемент */
  cancelItem: (itemId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:cancelItem', itemId),

  /** Отменить всё */
  cancelAll: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('parallelTranscode:cancelAll'),

  /** Очистить завершённые */
  clearCompleted: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:clearCompleted'),

  // === Подписки на события ===

  /** Подписка на агрегированный прогресс */
  onAggregatedProgress: on<[AggregatedProgress]>('parallelTranscode:aggregatedProgress'),

  /** Подписка на прогресс видео */
  onVideoProgress: on<[string, TranscodeProgressExtended]>('parallelTranscode:videoProgress'),

  /** Подписка на прогресс аудио */
  onAudioProgress: on<[string, TranscodeProgressExtended]>('parallelTranscode:audioProgress'),

  /** Подписка на завершение видео */
  onVideoCompleted: on<
    [
      string,
      string,
      string,
      ({ ffmpegCommand?: string; transcodeDurationMs?: number; activeGpuWorkers?: number } | undefined)?,
    ]
  >('parallelTranscode:videoCompleted'),

  /** Подписка на завершение аудиодорожки */
  onAudioTrackCompleted: on<[string, string, string, boolean?, string?]>('parallelTranscode:audioTrackCompleted'),

  /** Подписка на завершение элемента (видео + все аудио готовы) */
  onItemCompleted: on<[string, string, boolean, string?]>('parallelTranscode:itemCompleted'),

  /** Подписка на ошибку батча */
  onBatchError: on<[string]>('parallelTranscode:batchError'),

  /** Подписка на отмену всех задач */
  onAllCancelled: on<[]>('parallelTranscode:allCancelled'),

  /** Подписка на добавление элемента */
  onItemAdded: on<[string, string]>('parallelTranscode:itemAdded'),

  /** Подписка на ошибку элемента */
  onItemError: on<[string, string, string]>('parallelTranscode:itemError'),

  /** Подписка на ошибку задачи */
  onTaskError: on<[string, 'video' | 'audio', string]>('parallelTranscode:taskError'),

  /** Подписка на паузу */
  onPaused: on<[]>('parallelTranscode:paused'),

  /** Подписка на возобновление */
  onResumed: on<[]>('parallelTranscode:resumed'),

  /** Подписка на завершение batch */
  onBatchCompleted: on<[string, boolean]>('parallelTranscode:batchCompleted'),

  // === VMAF прогресс (сохраняется в main для навигации) ===

  /** Получить VMAF прогресс для item */
  getVmafProgress: (itemId?: string): Promise<{ success: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getVmafProgress', itemId),

  /** Получить все VMAF прогрессы */
  getAllVmafProgress: (): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getAllVmafProgress'),

  /** Подписка на VMAF прогресс */
  onVmafProgress: on<[string, unknown]>('parallelTranscode:vmafProgress'),

  // === Защита от дублирования обработки ===

  /** Проверить, обрабатывается ли item */
  isItemProcessing: (itemId?: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:isItemProcessing', itemId),

  /** Установить текущий обрабатываемый item (защита от дублей) */
  setProcessingItem: (itemId: string | null): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:setProcessingItem', itemId),

  /** Получить ID текущего обрабатываемого item */
  getProcessingItemId: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getProcessingItemId'),

  // === FFmpeg Log Viewer ===

  /** Получить все видео-логи */
  getVideoLogs: (): Promise<{
    success: boolean
    data?: Array<{ timestamp: number; taskId: string; level: 'info' | 'warning' | 'error'; message: string }>
    error?: string
  }> => ipcRenderer.invoke('parallelTranscode:getVideoLogs'),

  /** Получить логи конкретной видео-задачи */
  getVideoTaskLogs: (
    taskId: string,
  ): Promise<{
    success: boolean
    data?: Array<{ timestamp: number; taskId: string; level: 'info' | 'warning' | 'error'; message: string }>
    error?: string
  }> => ipcRenderer.invoke('parallelTranscode:getVideoTaskLogs', taskId),

  /** Очистить все видео-логи */
  clearVideoLogs: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:clearVideoLogs'),

  /** Получить количество записей в видео-логах */
  getVideoLogCount: (): Promise<{ success: boolean; data?: number; error?: string }> =>
    ipcRenderer.invoke('parallelTranscode:getVideoLogCount'),

  /** Подписка на новые записи логов (real-time) */
  onVideoLogEntry: on<[string, { timestamp: number; level: 'info' | 'warning' | 'error'; message: string }]>(
    'parallelTranscode:videoLogEntry',
  ),
}
