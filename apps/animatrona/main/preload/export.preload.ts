/**
 * Preload — Экспорт
 *
 * Очередь экспорта и экспорт для Web Player.
 */

import { ipcRenderer } from 'electron'
import type { QueueExportConfig } from '../../shared/types/export-queue'
import type { WebExportOptions, WebExportProgress, WebExportResult } from '../../shared/types/web-player'
import type { ExportQueueResult, ExportQueueSettings, ExportTask, ExportTaskCreateData } from '../services/export-queue'
import { on } from './ipc-helper'

/** Export Queue */
export const exportQueuePreload = {
  /** Добавить задачу в очередь */
  add: (data: ExportTaskCreateData): Promise<ExportQueueResult<ExportTask>> =>
    ipcRenderer.invoke('export-queue:add', data),

  /** Отменить задачу */
  cancel: (taskId: string): Promise<ExportQueueResult> => ipcRenderer.invoke('export-queue:cancel', taskId),

  /** Приостановить задачу */
  pause: (taskId: string): Promise<ExportQueueResult> => ipcRenderer.invoke('export-queue:pause', taskId),

  /** Возобновить задачу */
  resume: (taskId: string): Promise<ExportQueueResult> => ipcRenderer.invoke('export-queue:resume', taskId),

  /** Повторить неудавшуюся задачу */
  retry: (taskId: string): Promise<ExportQueueResult> => ipcRenderer.invoke('export-queue:retry', taskId),

  /** Получить список задач */
  list: (): Promise<ExportQueueResult<ExportTask[]>> => ipcRenderer.invoke('export-queue:list'),

  /** Получить задачу по ID */
  get: (taskId: string): Promise<ExportQueueResult<ExportTask>> => ipcRenderer.invoke('export-queue:get', taskId),

  /** Очистить завершённые/отменённые задачи */
  clear: (): Promise<ExportQueueResult<number>> => ipcRenderer.invoke('export-queue:clear'),

  /** Получить настройки */
  getSettings: (): Promise<ExportQueueResult<ExportQueueSettings>> => ipcRenderer.invoke('export-queue:getSettings'),

  /** Обновить настройки */
  updateSettings: (settings: Partial<ExportQueueSettings>): Promise<ExportQueueResult> =>
    ipcRenderer.invoke('export-queue:updateSettings', settings),

  /** Подписка на прогресс задачи */
  onProgress: on<[ExportTask]>('export-queue:progress'),

  /** Подписка на завершение задачи */
  onCompleted: on<[ExportTask]>('export-queue:completed'),

  /** Подписка на ошибку задачи */
  onFailed: on<[ExportTask]>('export-queue:failed'),

  /** Подписка на изменение очереди */
  onUpdated: on<[ExportTask[]]>('export-queue:updated'),
}

/** Web Export (для Web Player) */
export const webExportPreload = {
  /** Запуск экспорта для Web Player */
  start: async (config: QueueExportConfig, options: WebExportOptions): Promise<WebExportResult> => {
    const result = await ipcRenderer.invoke('web-export:start', config, options)
    // createHandler оборачивает в { success, data }, разворачиваем
    if (result.success && result.data) {
      return result.data
    }
    return { success: false, error: result.error ?? 'Web export failed' }
  },

  /** Отмена экспорта */
  cancel: (): Promise<void> => ipcRenderer.invoke('web-export:cancel'),

  /** Проверка статуса */
  isRunning: async (): Promise<boolean> => {
    const result = await ipcRenderer.invoke('web-export:is-running')
    // createHandler оборачивает в { success, data }
    return result.success && result.data === true
  },

  /** Подписка на прогресс */
  onProgress: on<[WebExportProgress]>('web-export:progress'),
}
