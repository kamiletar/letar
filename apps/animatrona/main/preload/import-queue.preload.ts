/**
 * Preload — Import Queue, шаблоны и история импортов
 *
 * Event-driven очередь импорта, шаблоны и история.
 */

import { ipcRenderer } from 'electron'
import type {
  ImportHistoryCreateData,
  ImportHistoryEntry,
  ImportHistoryFilter,
  ImportHistoryStats,
} from '../../shared/types/import-history'
import type {
  ImportQueueAddData,
  ImportQueueDetailProgress,
  ImportQueueEntry,
  ImportQueueState,
  ImportQueueStatus,
  ImportQueueVmafProgress,
  ImportQueueVmafResult,
} from '../../shared/types/import-queue'
import type {
  ImportTemplate,
  ImportTemplateCreateData,
  ImportTemplateUpdateData,
} from '../../shared/types/import-template'
import { on } from './ipc-helper'

/** Import Queue — Event-driven архитектура */
export const importQueuePreload = {
  // === Команды ===

  /** Добавить items в очередь */
  addItems: (items: ImportQueueAddData[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:add-items', items),

  /** Начать обработку очереди */
  start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('import-queue:start'),

  /** Приостановить очередь */
  pause: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('import-queue:pause'),

  /** Возобновить очередь */
  resume: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('import-queue:resume'),

  /** Отменить item */
  cancelItem: (itemId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:cancel-item', itemId),

  /** Удалить item из очереди */
  removeItem: (itemId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:remove-item', itemId),

  /** Повторить обработку item с ошибкой */
  retryItem: (itemId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:retry-item', itemId),

  /** Пометить completed item как failed (для повторного импорта) */
  markItemFailed: (itemId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:mark-failed', itemId),

  /** Отменить всю очередь */
  cancelAll: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('import-queue:cancel-all'),

  /** Получить текущее состояние очереди */
  getState: (): Promise<{ success: boolean; data?: ImportQueueState; error?: string }> =>
    ipcRenderer.invoke('import-queue:get-state'),

  /** Получить item по ID */
  getItem: (itemId: string): Promise<{ success: boolean; data?: ImportQueueEntry; error?: string }> =>
    ipcRenderer.invoke('import-queue:get-item', itemId),

  /** Очистить завершённые items (опционально только успешные — error/cancelled не трогаем) */
  clearCompleted: (options?: { onlySuccess?: boolean }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:clear-completed', options),

  /** Установить автозапуск */
  setAutoStart: (enabled: boolean): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:set-auto-start', enabled),

  /** Изменить порядок элементов (drag & drop) */
  reorderItems: (activeId: string, overId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:reorder-items', activeId, overId),

  /** Обновить данные item (профиль, параллельность, sync offset и т.д.) */
  updateItem: (itemId: string, data: Partial<ImportQueueAddData>): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:update-item', itemId, data),

  /** Аудит завершённых items — найти неполные эпизоды */
  auditCompleted: (): Promise<{ success: boolean; data?: { checked: number; markedFailed: number }; error?: string }> =>
    ipcRenderer.invoke('import-queue:audit-completed'),

  /** Переделать недостающие эпизоды (retranscode mode, опционально с pre-encode) */
  retryMissing: (
    itemId: string,
    preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string }
  ): Promise<{ success: boolean; data?: { newItemId?: string }; error?: string }> =>
    ipcRenderer.invoke('import-queue:retry-missing', itemId, preEncodeOptions),

  // === Обновления от renderer (ImportProcessor) ===

  /** Обновить статус item */
  updateStatus: (
    itemId: string,
    status: ImportQueueStatus,
    error?: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:update-status', itemId, status, error),

  /** Обновить прогресс item */
  updateProgress: (
    itemId: string,
    progress: number,
    currentFileName?: string,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:update-progress', itemId, progress, currentFileName, currentStage, detailProgress),

  /** Обновить VMAF прогресс */
  updateVmafProgress: (
    itemId: string,
    vmafProgress: ImportQueueVmafProgress
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:update-vmaf-progress', itemId, vmafProgress),

  /** Установить результат VMAF */
  setVmafResult: (itemId: string, result: ImportQueueVmafResult): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:set-vmaf-result', itemId, result),

  /** Установить результат импорта (animeId) */
  setImportResult: (itemId: string, animeId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('import-queue:set-import-result', itemId, animeId),

  // === Подписки на события (main → renderer) ===

  /** Подписка на изменение состояния очереди */
  onStateChanged: on<[ImportQueueState]>('import-queue:state-changed'),

  /** Подписка на изменение статуса item */
  onItemStatus: on<[{ itemId: string; status: ImportQueueStatus; error?: string }]>('import-queue:item-status'),

  /** Подписка на изменение прогресса item */
  onItemProgress: on<
    [
      {
        itemId: string
        progress: number
        currentFileName?: string
        currentStage?: string
        detailProgress?: ImportQueueDetailProgress
        vmafProgress?: ImportQueueVmafProgress
      },
    ]
  >('import-queue:item-progress'),

  /** Подписка на инвалидацию кэша (main → renderer после завершения импорта) */
  onCacheInvalidate: on<[string[]]>('import-queue:cache-invalidate'),
}

/** Шаблоны импорта */
export const templatesPreload = {
  /** Получить все шаблоны (дефолтные + пользовательские) */
  getAll: (): Promise<{ success: boolean; data?: ImportTemplate[]; error?: string }> =>
    ipcRenderer.invoke('templates:getAll'),

  /** Получить шаблон по ID */
  getById: (id: string): Promise<{ success: boolean; data?: ImportTemplate; error?: string }> =>
    ipcRenderer.invoke('templates:getById', id),

  /** Создать шаблон */
  create: (data: ImportTemplateCreateData): Promise<{ success: boolean; data?: ImportTemplate; error?: string }> =>
    ipcRenderer.invoke('templates:create', data),

  /** Обновить шаблон */
  update: (
    id: string,
    data: ImportTemplateUpdateData
  ): Promise<{ success: boolean; data?: ImportTemplate; error?: string }> =>
    ipcRenderer.invoke('templates:update', id, data),

  /** Удалить шаблон */
  delete: (id: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('templates:delete', id),

  /** Отметить шаблон как использованный */
  markAsUsed: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('templates:markAsUsed', id),
}

/** История импортов */
export const historyPreload = {
  /** Получить все записи истории */
  getAll: (): Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }> =>
    ipcRenderer.invoke('history:getAll'),

  /** Получить записи с фильтром */
  get: (filter?: ImportHistoryFilter): Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }> =>
    ipcRenderer.invoke('history:get', filter),

  /** Получить запись по ID */
  getById: (id: string): Promise<{ success: boolean; data?: ImportHistoryEntry; error?: string }> =>
    ipcRenderer.invoke('history:getById', id),

  /** Добавить запись в историю */
  add: (data: ImportHistoryCreateData): Promise<{ success: boolean; data?: ImportHistoryEntry; error?: string }> =>
    ipcRenderer.invoke('history:add', data),

  /** Удалить запись */
  delete: (id: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('history:delete', id),

  /** Очистить историю */
  clear: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('history:clear'),

  /** Получить статистику */
  getStats: (): Promise<{ success: boolean; data?: ImportHistoryStats; error?: string }> =>
    ipcRenderer.invoke('history:getStats'),

  /** Получить последние N записей */
  getRecent: (limit?: number): Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }> =>
    ipcRenderer.invoke('history:getRecent', limit),
}
