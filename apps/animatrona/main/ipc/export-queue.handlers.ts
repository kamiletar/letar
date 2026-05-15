/**
 * IPC Handlers для очереди экспорта
 */

import type { ExportQueueSettings, ExportTaskCreateData } from '../services/export-queue'
import { ExportQueueService } from '../services/export-queue'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для очереди экспорта
 */
export function registerExportQueueHandlers(): void {
  const service = ExportQueueService.getInstance()

  // Подписка на события сервиса
  service.on('progress', (task) => broadcastToWindows('export-queue:progress', task))
  service.on('completed', (task) => broadcastToWindows('export-queue:completed', task))
  service.on('failed', (task) => broadcastToWindows('export-queue:failed', task))
  service.on('updated', (tasks) => broadcastToWindows('export-queue:updated', tasks))

  // === Handlers ===

  // Добавить задачу в очередь
  createHandler('export-queue:add', (data: ExportTaskCreateData) => service.addTask(data))

  // Отменить задачу
  createHandler('export-queue:cancel', (taskId: string) => service.cancelTask(taskId))

  // Приостановить задачу
  createHandler('export-queue:pause', (taskId: string) => service.pauseTask(taskId))

  // Возобновить задачу
  createHandler('export-queue:resume', (taskId: string) => service.resumeTask(taskId))

  // Повторить неудавшуюся задачу
  createHandler('export-queue:retry', (taskId: string) => service.retryTask(taskId))

  // Получить список задач
  createHandler('export-queue:list', () => service.listTasks())

  // Получить задачу по ID
  createHandler('export-queue:get', (taskId: string) => {
    const task = service.getTask(taskId)
    if (!task) {
      throw new Error('Task not found')
    }
    return task
  })

  // Очистить завершённые/отменённые задачи
  createHandler('export-queue:clear', () => service.clearCompleted())

  // Получить настройки
  createHandler('export-queue:getSettings', () => service.getSettings())

  // Обновить настройки
  createHandler('export-queue:updateSettings', (settings: Partial<ExportQueueSettings>) =>
    service.updateSettings(settings)
  )
}
