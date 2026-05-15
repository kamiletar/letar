/**
 * IPC handlers для Import Queue — Event-driven архитектура
 *
 * Команды (renderer → main):
 * - import-queue:add-items — добавить items в очередь
 * - import-queue:start — начать обработку
 * - import-queue:pause — приостановить очередь
 * - import-queue:resume — возобновить очередь
 * - import-queue:cancel-item — отменить item
 * - import-queue:remove-item — удалить item из очереди
 * - import-queue:get-state — получить текущее состояние
 * - import-queue:get-item — получить item по ID
 * - import-queue:clear-completed — очистить завершённые
 * - import-queue:set-auto-start — установить автозапуск
 *
 * Обновления (renderer → main, вызываются из ImportProcessor):
 * - import-queue:update-status — обновить статус item
 * - import-queue:update-progress — обновить прогресс item
 * - import-queue:update-vmaf-progress — обновить VMAF прогресс
 * - import-queue:set-vmaf-result — установить результат VMAF
 * - import-queue:set-import-result — установить результат импорта (animeId)
 *
 * События (main → renderer через BrowserWindow.webContents.send):
 * - import-queue:state-changed — полное состояние изменилось
 * - import-queue:item-status — статус item изменился
 * - import-queue:item-progress — прогресс item изменился
 *
 * @see ImportQueueController — единственный источник правды
 */

import type {
  ImportQueueAddData,
  ImportQueueDetailProgress,
  ImportQueueStatus,
  ImportQueueVmafProgress,
  ImportQueueVmafResult,
} from '../../shared/types/import-queue'
import { ImportQueueController } from '../services/import-queue-controller'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для очереди импорта
 */
export function registerImportQueueHandlers(): void {
  const controller = ImportQueueController.getInstance()

  // ==========================================
  // === Команды от renderer ===
  // ==========================================

  // Добавить items в очередь
  createHandler('import-queue:add-items', (items: ImportQueueAddData[]) => controller.addItems(items))

  // Начать обработку очереди
  createHandler('import-queue:start', () => controller.startQueue())

  // Приостановить очередь
  createHandler('import-queue:pause', () => controller.pauseQueue())

  // Возобновить очередь
  createHandler('import-queue:resume', () => controller.resumeQueue())

  // Отменить item
  createHandler('import-queue:cancel-item', (itemId: string) => controller.cancelItem(itemId))

  // Удалить item из очереди
  createHandler('import-queue:remove-item', (itemId: string) => controller.removeItem(itemId))

  // Повторить обработку item с ошибкой
  createHandler(
    'import-queue:retry-item',
    (itemId: string, options?: { skipCompressionCheck?: boolean }) => controller.retryItem(itemId, options),
  )

  // Пометить completed item как failed (для повторного импорта)
  createHandler('import-queue:mark-failed', (itemId: string) => controller.markItemFailed(itemId))

  // Отменить всю очередь
  createHandler('import-queue:cancel-all', () => controller.cancelAll())

  // Получить текущее состояние очереди
  createHandler('import-queue:get-state', () => controller.getState())

  // Получить item по ID
  createHandler('import-queue:get-item', (itemId: string) => controller.getItem(itemId))

  // Очистить завершённые items (опционально только успешные)
  createHandler(
    'import-queue:clear-completed',
    (options?: { onlySuccess?: boolean }) => controller.clearCompleted(options),
  )

  // Установить автозапуск
  createHandler('import-queue:set-auto-start', (enabled: boolean) => controller.setAutoStart(enabled))

  // Аудит завершённых items — найти неполные эпизоды
  createHandler('import-queue:audit-completed', () => controller.auditCompletedItems())

  // Переделать недостающие эпизоды (retranscode mode, опционально с pre-encode)
  createHandler(
    'import-queue:retry-missing',
    (itemId: string, preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string }) =>
      controller.retryMissingEpisodes(itemId, preEncodeOptions),
  )

  // Изменить порядок элементов в очереди (drag & drop)
  createHandler(
    'import-queue:reorder-items',
    (activeId: string, overId: string) => controller.reorderItems(activeId, overId),
  )

  // Обновить данные item (профиль, параллельность, sync offset и т.д.)
  createHandler(
    'import-queue:update-item',
    (itemId: string, data: Partial<ImportQueueAddData>) => controller.updateItem(itemId, data),
  )

  // ==========================================
  // === Обновления от renderer (ImportProcessor) ===
  // ==========================================

  // Обновить статус item
  createHandler(
    'import-queue:update-status',
    (itemId: string, status: ImportQueueStatus, error?: string) => controller.updateItemStatus(itemId, status, error),
  )

  // Обновить прогресс item
  createHandler(
    'import-queue:update-progress',
    (
      itemId: string,
      progress: number,
      currentFileName?: string,
      currentStage?: string,
      detailProgress?: ImportQueueDetailProgress,
    ) => controller.updateItemProgress(itemId, progress, currentFileName, currentStage, detailProgress),
  )

  // Обновить VMAF прогресс
  createHandler(
    'import-queue:update-vmaf-progress',
    (itemId: string, vmafProgress: ImportQueueVmafProgress) => controller.updateVmafProgress(itemId, vmafProgress),
  )

  // Установить результат VMAF
  createHandler(
    'import-queue:set-vmaf-result',
    (itemId: string, result: ImportQueueVmafResult) => controller.setVmafResult(itemId, result),
  )

  // Установить результат импорта (animeId)
  createHandler(
    'import-queue:set-import-result',
    (itemId: string, animeId: string) => controller.setImportResult(itemId, animeId),
  )

  // Handlers registered (no logging needed)
}
