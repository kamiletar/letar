/**
 * IPC handlers для автообновлений
 */

import { app } from 'electron'

import { checkForUpdates, downloadUpdate, fetchChangelog, getUpdateStatus, installUpdate } from '../updater'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для управления обновлениями
 */
export function registerUpdaterHandlers(): void {
  // Получить текущий статус обновлений
  createHandler('updater:status', () => getUpdateStatus())

  // Получить версию приложения
  createHandler('updater:version', () => app.getVersion())

  // Проверить наличие обновлений
  createHandler('updater:check', () => checkForUpdates())

  // Скачать обновление
  createHandler('updater:download', () => downloadUpdate())

  // Установить обновление и перезапустить
  createHandler('updater:install', () => installUpdate())

  // Получить changelog из GitHub Releases
  createHandler('updater:getChangelog', (version: string) => fetchChangelog(version))
}
