/**
 * IPC Handlers для Web Export
 */

import type { QueueExportConfig } from '../../shared/types/export-queue'
import type { WebExportOptions, WebExportProgress, WebExportResult } from '../../shared/types/web-player'
import { WebExportManager } from '../services/web-export'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для web export
 */
export function registerWebExportHandlers(): void {
  const manager = WebExportManager.getInstance()

  // Запуск экспорта (особый случай — нужно подписаться на прогресс временно)
  createHandler(
    'web-export:start',
    async (config: QueueExportConfig, options: WebExportOptions): Promise<WebExportResult> => {
      const progressHandler = (progress: WebExportProgress) => {
        broadcastToWindows('web-export:progress', progress)
      }

      manager.on('progress', progressHandler)

      try {
        return await manager.startExport(config, options)
      } finally {
        manager.off('progress', progressHandler)
      }
    }
  )

  // Отмена экспорта
  createHandler('web-export:cancel', () => manager.cancel())

  // Проверка статуса
  createHandler('web-export:is-running', () => manager.isRunning())
}
