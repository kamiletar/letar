/**
 * Preload — App, Window, Tray
 *
 * Информация о приложении, управление окном и системный трей.
 */

import { ipcRenderer } from 'electron'
import { on } from './ipc-helper'

/** Информация о приложении и системные операции */
export const appPreload = {
  /** Получить версию приложения */
  getVersion: async (): Promise<string> => {
    const result = await ipcRenderer.invoke('app:getVersion')
    return result.success ? result.data : ''
  },

  /** Открыть URL во внешнем браузере */
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),

  /** Показать файл/папку в проводнике */
  showInFolder: (fullPath: string): Promise<void> => ipcRenderer.invoke('app:showInFolder', fullPath),

  /** Получить системный путь */
  getPath: async (name: string): Promise<string> => {
    const result = await ipcRenderer.invoke('app:getPath', name)
    return result.success ? result.data : ''
  },

  /** Получить количество ядер CPU */
  getCpuCount: async (): Promise<number> => {
    const result = await ipcRenderer.invoke('app:getCpuCount')
    return result.success ? result.data : 1
  },

  /** Получить информацию о диске */
  getDiskInfo: async (
    targetPath?: string
  ): Promise<{ total: number; free: number; used: number; usedPercent: number } | null> => {
    const result = await ipcRenderer.invoke('app:getDiskInfo', targetPath)
    return result.success ? result.data : null
  },

  /** Получить размер папки библиотеки (с кешированием, TTL 5 минут) */
  getLibrarySize: async (libraryPath: string, forceRefresh?: boolean): Promise<number> => {
    const result = await ipcRenderer.invoke('app:getLibrarySize', libraryPath, forceRefresh)
    return result.success ? result.data : 0
  },

  /** Инвалидировать кеш размера библиотеки (вызывать после импорта) */
  invalidateLibrarySizeCache: async (): Promise<boolean> => {
    const result = await ipcRenderer.invoke('app:invalidateLibrarySizeCache')
    return result.success ? result.data : false
  },

  /** Показать системное уведомление */
  showNotification: async (options: {
    title: string
    body: string
    type?: 'info' | 'success' | 'error'
  }): Promise<boolean> => {
    const result = await ipcRenderer.invoke('app:showNotification', options)
    return result.success ? result.data : false
  },

  /** Получить состояние блокировки сна */
  getPowerSaveState: async (): Promise<{
    isBlocking: boolean
    autoEnabled: boolean
    manualEnabled: boolean
  }> => {
    const result = await ipcRenderer.invoke('app:getPowerSaveState')
    return result.success ? result.data : { isBlocking: false, autoEnabled: true, manualEnabled: false }
  },

  /** Переключить ручную блокировку сна */
  togglePowerSaveManual: async (): Promise<{
    isBlocking: boolean
    manualEnabled: boolean
  }> => {
    const result = await ipcRenderer.invoke('app:togglePowerSaveManual')
    return result.success ? result.data : { isBlocking: false, manualEnabled: false }
  },

  /** Установить авто-блокировку при транскодировании */
  setPowerSaveAuto: async (enabled: boolean): Promise<{ autoEnabled: boolean }> => {
    const result = await ipcRenderer.invoke('app:setPowerSaveAuto', enabled)
    return result.success ? result.data : { autoEnabled: false }
  },

  /** Установить блокировку сна при воспроизведении видео */
  setPowerSavePlayback: async (isPlaying: boolean): Promise<{ isBlocking: boolean }> => {
    const result = await ipcRenderer.invoke('app:setPowerSavePlayback', isPlaying)
    return result.success ? result.data : { isBlocking: false }
  },

  /** Проверить нужен ли setup wizard (первый запуск без libraryPath) */
  getSetupStatus: async (): Promise<{ needsSetup: boolean; defaultLibraryPath: string }> => {
    const result = await ipcRenderer.invoke('app:getSetupStatus')
    return result.success ? result.data : { needsSetup: false, defaultLibraryPath: '' }
  },

  /** Завершить setup wizard — сохранить libraryPath и запустить Kubo */
  completeSetup: async (libraryPath: string): Promise<void> => {
    await ipcRenderer.invoke('app:completeSetup', libraryPath)
  },

  /** Запустить миграцию библиотеки на новый диск */
  startLibraryMigration: async (opts: { toPath: string; mode: 'copy' | 'move' }): Promise<{ started: boolean }> => {
    const result = await ipcRenderer.invoke('app:startLibraryMigration', opts)
    return result.success ? result.data : { started: false }
  },

  /** Подписка на прогресс миграции библиотеки */
  onMigrationProgress:
    on<[import('../services/library/library-migration').MigrationProgress]>('app:migration-progress'),
}

/** Управление окном (frameless title bar) */
export const windowPreload = {
  /** Минимизировать окно */
  minimize: async (): Promise<void> => {
    await ipcRenderer.invoke('window:minimize')
  },

  /** Максимизировать / Восстановить окно */
  maximize: async (): Promise<boolean> => {
    const result = await ipcRenderer.invoke('window:maximize')
    return result.success ? result.data : false
  },

  /** Закрыть окно */
  close: async (): Promise<void> => {
    await ipcRenderer.invoke('window:close')
  },

  /** Проверить, максимизировано ли окно */
  isMaximized: async (): Promise<boolean> => {
    const result = await ipcRenderer.invoke('window:isMaximized')
    return result.success ? result.data : false
  },

  /** Получить платформу (для позиционирования кнопок) */
  getPlatform: async (): Promise<'win32' | 'darwin' | 'linux'> => {
    const result = await ipcRenderer.invoke('window:getPlatform')
    return result.success ? result.data : 'win32'
  },

  /** Подписка на изменение состояния maximize */
  onMaximizeChanged: on<[boolean]>('window:maximizeChanged'),
}

/** Системный трей */
export const trayPreload = {
  /** Получить текущие настройки трея */
  getSettings: (): Promise<{ minimizeToTray: boolean; closeToTray: boolean; showTrayNotification: boolean }> =>
    ipcRenderer.invoke('tray:getSettings'),

  /** Обновить настройки трея */
  updateSettings: (settings: {
    minimizeToTray?: boolean
    closeToTray?: boolean
    showTrayNotification?: boolean
  }): Promise<void> => ipcRenderer.invoke('tray:updateSettings', settings),

  /** Подписка на изменение настроек трея из main process (например, из контекстного меню) */
  onSettingsChanged:
    on<[{ minimizeToTray: boolean; closeToTray: boolean; showTrayNotification: boolean }]>('tray:settingsChanged'),
}
