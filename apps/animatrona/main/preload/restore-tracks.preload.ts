/**
 * Preload API для восстановления дорожек
 *
 * Renderer подписывается на события и отправляет команды,
 * вся оркестрация происходит в main process.
 */

import { ipcRenderer } from 'electron'

import type { RestoreConfig, RestoreFontTask, RestoreProgress, RestoreTask } from '../../shared/types/restore-tracks'

export const restoreTracksPreload = {
  /** Начать восстановление */
  start: (
    tasks: RestoreTask[],
    fontTasks: RestoreFontTask[],
    config: RestoreConfig
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('restoreTracks:start', tasks, fontTasks, config),

  /** Отменить */
  cancel: (): Promise<{ success: boolean }> => ipcRenderer.invoke('restoreTracks:cancel'),

  /** Изменить concurrency */
  setConcurrency: (value: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('restoreTracks:setConcurrency', value),

  /** Получить текущий прогресс */
  getProgress: (): Promise<{ success: boolean; data?: RestoreProgress }> =>
    ipcRenderer.invoke('restoreTracks:getProgress'),

  /** Проверить, идёт ли обработка */
  isProcessing: (): Promise<{ success: boolean; data?: boolean }> => ipcRenderer.invoke('restoreTracks:isProcessing'),

  // === Подписки на события ===

  /** Прогресс восстановления */
  onProgress: (callback: (progress: RestoreProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: RestoreProgress) => callback(progress)
    ipcRenderer.on('restoreTracks:progress', handler)
    return () => ipcRenderer.removeListener('restoreTracks:progress', handler)
  },

  /** Задача завершена */
  onTaskCompleted: (callback: (taskId: string, success: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string, success: boolean) => callback(taskId, success)
    ipcRenderer.on('restoreTracks:taskCompleted', handler)
    return () => ipcRenderer.removeListener('restoreTracks:taskCompleted', handler)
  },

  /** Всё восстановление завершено */
  onCompleted: (callback: (progress: RestoreProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: RestoreProgress) => callback(progress)
    ipcRenderer.on('restoreTracks:completed', handler)
    return () => ipcRenderer.removeListener('restoreTracks:completed', handler)
  },

  /** Ошибка задачи */
  onTaskError: (callback: (taskId: string, error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string, error: string) => callback(taskId, error)
    ipcRenderer.on('restoreTracks:taskError', handler)
    return () => ipcRenderer.removeListener('restoreTracks:taskError', handler)
  },

  /** Восстановление отменено */
  onCancelled: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('restoreTracks:cancelled', handler)
    return () => ipcRenderer.removeListener('restoreTracks:cancelled', handler)
  },
}
