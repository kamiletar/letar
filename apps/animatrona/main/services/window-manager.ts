/**
 * Window Manager — управление окнами Electron
 *
 * Создание и управление главным окном и splash screen.
 */

import { app, BrowserWindow } from 'electron'
import path from 'path'
import { setupWindowStateListeners } from '../ipc/window.handlers'
import { getServerPort } from './next-server'

/** Проверка production режима */
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

/** Главное окно приложения */
let mainWindow: BrowserWindow | null = null

/** Splash screen окно */
let splashWindow: BrowserWindow | null = null

/**
 * Получить главное окно
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * Получить splash window
 */
export function getSplashWindow(): BrowserWindow | null {
  return splashWindow
}

/**
 * Закрыть splash window
 */
export function closeSplashWindow(): void {
  if (splashWindow) {
    splashWindow.close()
    splashWindow = null
  }
}

/**
 * Получить путь к иконке приложения
 */
function getIconPath(): string {
  if (process.platform === 'win32') {
    return isProd
      ? path.join(process.resourcesPath, 'icon.ico')
      : path.join(__dirname, '..', '..', 'resources', 'icon.ico')
  }
  return isProd
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '..', '..', 'resources', 'icon.png')
}

/**
 * Создаёт splash screen окно
 */
export function createSplashWindow(): BrowserWindow {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const splashPath = isProd
    ? path.join(process.resourcesPath, 'splash.html')
    : path.join(__dirname, '..', '..', 'resources', 'splash.html')

  splashWindow.loadFile(splashPath)
  splashWindow.center()

  return splashWindow
}

/**
 * Создаёт главное окно приложения
 */
export async function createMainWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
    show: false,
    backgroundColor: '#1a1a2e',
    frame: false,
  })

  // Разрешаем загрузку изображений с локального Kubo gateway (IPFS постеры)
  // Без этого Electron блокирует cross-origin ответы (ERR_BLOCKED_BY_ORB)
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['http://127.0.0.1:*/ipfs/*', 'http://localhost:*/ipfs/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
        },
      })
    }
  )

  // Показываем окно когда оно готово и закрываем splash
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      closeSplashWindow()
      mainWindow?.show()
    }, 500)
  })

  // Загружаем приложение
  if (isProd) {
    await mainWindow.loadURL(`http://127.0.0.1:${getServerPort()}`)
  } else {
    const port = process.argv[2] || 3007
    await mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Шорткат для DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // Настраиваем listeners для frameless title bar
  setupWindowStateListeners(mainWindow)

  return mainWindow
}
