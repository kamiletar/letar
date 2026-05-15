/**
 * IPC handlers для настроек системного трея
 *
 * Синхронизирует настройки трея между renderer (БД) и main process
 */

import { getTraySettings, updateTraySettings } from '../tray'
import { createHandler } from '../utils/ipc-handler-factory'

/** Настройки трея */
export interface TraySettings {
  minimizeToTray: boolean
  closeToTray: boolean
  showTrayNotification: boolean
}

/**
 * Регистрирует IPC handlers для настроек трея
 */
export function registerTrayHandlers(): void {
  // Получить текущие настройки трея
  createHandler('tray:getSettings', () => getTraySettings())

  // Обновить настройки трея
  createHandler('tray:updateSettings', (settings: Partial<TraySettings>) => {
    updateTraySettings(settings)
  })
}
