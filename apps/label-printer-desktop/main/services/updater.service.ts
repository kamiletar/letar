/**
 * Сервис автообновления приложения
 * Использует electron-updater для проверки и установки обновлений с GitHub Releases
 */

import { Logger } from '@letar/label-printer-core'
import type { BrowserWindow } from 'electron'
import { app, dialog, ipcMain } from 'electron'
import type { UpdateInfo } from 'electron-updater'
import { autoUpdater } from 'electron-updater'
import { settingsService } from './settings.service'

/** Ленивое получение логгера */
const getLogger = () => Logger.getInstance()

// Состояние обновления
export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloaded: boolean
  error: string | null
  version: string | null
  releaseNotes: string | null
  progress: number | null
}

// Singleton состояние
let updateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  version: null,
  releaseNotes: null,
  progress: null,
}

/**
 * Инициализация сервиса автообновления
 * Вызывается после app.whenReady()
 */
export function initAutoUpdater(mainWindow: BrowserWindow | null): void {
  // Не проверяем обновления в dev режиме
  if (!app.isPackaged) {
    getLogger().info('[Updater] Skipping auto-update in development mode')
    return
  }

  // Настройка автообновления
  autoUpdater.logger = {
    info: (message: string) => getLogger().info(`[Updater] ${message}`),
    warn: (message: string) => getLogger().warn(`[Updater] ${message}`),
    error: (message: string) => getLogger().error(`[Updater] ${message}`),
    debug: (message: string) => getLogger().debug(`[Updater] ${message}`),
  }

  // Не скачивать автоматически — даём пользователю выбор
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // === События автообновления ===

  autoUpdater.on('checking-for-update', () => {
    getLogger().info('[Updater] Checking for updates...')
    updateStatus = { ...updateStatus, checking: true, error: null }
    notifyRenderer(mainWindow, 'update-status', updateStatus)
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    getLogger().info(`[Updater] Update available: ${info.version}`)
    updateStatus = {
      ...updateStatus,
      checking: false,
      available: true,
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    }
    notifyRenderer(mainWindow, 'update-status', updateStatus)

    // Показываем диалог о доступном обновлении
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: `Доступна новая версия ${info.version}`,
        detail: 'Хотите скачать и установить обновление сейчас?',
        buttons: ['Скачать', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-not-available', () => {
    getLogger().info('[Updater] No updates available')
    updateStatus = { ...updateStatus, checking: false, available: false }
    notifyRenderer(mainWindow, 'update-status', updateStatus)
  })

  autoUpdater.on('download-progress', (progress) => {
    getLogger().info(`[Updater] Download progress: ${progress.percent.toFixed(1)}%`)
    updateStatus = { ...updateStatus, progress: progress.percent }
    notifyRenderer(mainWindow, 'update-status', updateStatus)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    getLogger().info(`[Updater] Update downloaded: ${info.version}`)
    updateStatus = { ...updateStatus, downloaded: true, progress: 100 }
    notifyRenderer(mainWindow, 'update-status', updateStatus)

    // Показываем диалог об установке
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: 'Обновление скачано',
        detail: 'Перезапустить приложение для установки обновления?',
        buttons: ['Перезапустить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (err) => {
    getLogger().error(`[Updater] Error: ${err.message}`)
    updateStatus = { ...updateStatus, checking: false, error: err.message }
    notifyRenderer(mainWindow, 'update-status', updateStatus)
  })

  // Проверяем обновления при запуске (с задержкой 5 сек)
  // Только если автообновление включено в настройках
  setTimeout(async () => {
    try {
      const settings = await settingsService.getSettings()
      if (settings.autoUpdate === false) {
        getLogger().info('[Updater] Auto-update disabled in settings, skipping check')
        return
      }
      autoUpdater.checkForUpdates()
    } catch (_error) {
      getLogger().error('[Updater] Failed to check autoUpdate setting, checking anyway')
      autoUpdater.checkForUpdates()
    }
  }, 5000)
}

/**
 * Отправить сообщение в renderer процесс
 */
function notifyRenderer(window: BrowserWindow | null, channel: string, data: unknown): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, data)
  }
}

/**
 * Регистрация IPC handlers для обновления
 */
export function registerUpdaterHandlers(): void {
  // Проверить обновления вручную
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { success: false, error: 'Обновления недоступны в режиме разработки' }
    }

    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        success: true,
        updateAvailable: !!result?.updateInfo,
        version: result?.updateInfo?.version,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка проверки обновлений'
      return { success: false, error: message }
    }
  })

  // Скачать обновление
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка скачивания'
      return { success: false, error: message }
    }
  })

  // Установить обновление (перезапуск)
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
    return { success: true }
  })

  // Получить текущий статус
  ipcMain.handle('updater:status', () => {
    return updateStatus
  })

  // Получить текущую версию
  ipcMain.handle('updater:version', () => {
    return app.getVersion()
  })
}
