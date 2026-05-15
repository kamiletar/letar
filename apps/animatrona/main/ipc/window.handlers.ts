/**
 * IPC handlers для управления окном (frameless title bar)
 */

import { BrowserWindow } from 'electron'

import { createHandler, createHandlerWithEvent } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для управления окном
 */
export function registerWindowHandlers(): void {
  // Минимизировать окно
  createHandlerWithEvent('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  // Максимизировать / Восстановить окно
  createHandlerWithEvent('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
    return win?.isMaximized() ?? false
  })

  // Закрыть окно
  createHandlerWithEvent('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // Проверить, максимизировано ли окно
  createHandlerWithEvent('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized() ?? false
  })

  // Получить платформу (для позиционирования кнопок)
  createHandler('window:getPlatform', () => process.platform)
}

/**
 * Настраивает listeners для отслеживания состояния maximize/unmaximize
 * Вызывать после создания mainWindow
 */
export function setupWindowStateListeners(mainWindow: BrowserWindow): void {
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximizeChanged', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximizeChanged', false)
  })
}
