/**
 * IPC handlers для восстановления дорожек
 *
 * Каналы (handlers):
 * - restoreTracks:start — начать восстановление
 * - restoreTracks:cancel — отменить
 * - restoreTracks:setConcurrency — изменить потоки
 * - restoreTracks:getProgress — получить прогресс
 * - restoreTracks:isProcessing — проверить
 *
 * События (broadcastToWindows):
 * - restoreTracks:progress — RestoreProgress
 * - restoreTracks:taskCompleted — (taskId, success)
 * - restoreTracks:completed — RestoreProgress (итоговый)
 * - restoreTracks:cancelled — ()
 */

import { ipcMain } from 'electron'
import type { RestoreConfig, RestoreFontTask, RestoreProgress, RestoreTask } from '../../shared/types/restore-tracks'
import { RestoreTracksManager } from '../services/restore-tracks-manager'
import { broadcastToWindows } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('RestoreTracksHandlers')

/** Флаг для предотвращения повторной регистрации */
let isRegistered = false

// === Именованные обработчики событий ===

function onProgress(progress: RestoreProgress): void {
  broadcastToWindows('restoreTracks:progress', progress)
}

function onTaskCompleted(taskId: string, success: boolean): void {
  broadcastToWindows('restoreTracks:taskCompleted', taskId, success)
}

function onTaskError(taskId: string, error: string): void {
  broadcastToWindows('restoreTracks:taskError', taskId, error)
}

function onCompleted(progress: RestoreProgress): void {
  broadcastToWindows('restoreTracks:completed', progress)
}

function onCancelled(): void {
  broadcastToWindows('restoreTracks:cancelled')
}

/**
 * Регистрация IPC handlers для восстановления дорожек
 */
export function registerRestoreTracksHandlers(): void {
  if (isRegistered) {
    log.warn('Handlers already registered, skipping')
    return
  }

  const manager = RestoreTracksManager.getInstance()

  // Подписка на события менеджера
  manager.on('progress', onProgress)
  manager.on('taskCompleted', onTaskCompleted)
  manager.on('taskError', onTaskError)
  manager.on('completed', onCompleted)
  manager.on('cancelled', onCancelled)

  // === IPC Handlers ===

  ipcMain.handle(
    'restoreTracks:start',
    async (_event, tasks: RestoreTask[], fontTasks: RestoreFontTask[], config: RestoreConfig) => {
      try {
        manager.start(tasks, fontTasks, config)
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )

  ipcMain.handle('restoreTracks:cancel', async () => {
    try {
      manager.cancel()
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('restoreTracks:setConcurrency', async (_event, value: number) => {
    try {
      manager.setConcurrency(value)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('restoreTracks:getProgress', async () => {
    try {
      return { success: true, data: manager.getProgress() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('restoreTracks:isProcessing', async () => {
    try {
      return { success: true, data: manager.isProcessing() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  isRegistered = true
}

/**
 * Отменяет регистрацию handlers
 */
export function unregisterRestoreTracksHandlers(): void {
  if (!isRegistered) {
    return
  }

  const manager = RestoreTracksManager.getInstance()

  manager.off('progress', onProgress)
  manager.off('taskCompleted', onTaskCompleted)
  manager.off('taskError', onTaskError)
  manager.off('completed', onCompleted)
  manager.off('cancelled', onCancelled)

  ipcMain.removeHandler('restoreTracks:start')
  ipcMain.removeHandler('restoreTracks:cancel')
  ipcMain.removeHandler('restoreTracks:setConcurrency')
  ipcMain.removeHandler('restoreTracks:getProgress')
  ipcMain.removeHandler('restoreTracks:isProcessing')

  isRegistered = false
}
