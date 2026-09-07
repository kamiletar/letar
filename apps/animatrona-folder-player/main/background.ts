import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'
import { initAllowedPaths } from './protocols/allowed-paths'
import { APP_INDEX_URL, registerAppProtocol, setupAppProtocolHandler } from './protocols/app.protocol'
import { registerMediaProtocol, setupMediaProtocolHandler } from './protocols/media.protocol'
import { findVideoFileInArgv } from './services/file-args.service'
import { getInitialWindowState, trackWindowBounds } from './services/window-bounds.service'

// Регистрация привилегий схем media:// и app:// — обязательно до app.whenReady()
registerMediaProtocol()
registerAppProtocol()

// Главный способ запуска плеера — двойной клик по файлу (fileAssociations в electron-builder.yml),
// а не иконка на рабочем столе. Второй двойной клик не должен поднимать вторую копию Electron —
// он обязан открыть файл в уже запущенном окне.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
  process.exit(0)
}

process.on('uncaughtException', (error) => {
  console.error('[UncaughtException]', error)
  if (app.isReady()) {
    import('electron').then(({ dialog }) => {
      dialog.showErrorBox('Критическая ошибка', `Произошла непредвиденная ошибка:\n\n${error.message}`)
    })
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason)
})

// В packaged Electron app.isPackaged === true
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

let mainWindow: BrowserWindow | null = null

// Файл, переданный аргументом при запуске (Windows/Linux) или через open-file (macOS, может
// прийти до готовности окна) — отправляется в renderer, как только страница догрузится.
let pendingFilePath: string | undefined = findVideoFileInArgv(process.argv)
let rendererReady = false

function sendOpenFile(filePath: string): void {
  if (mainWindow && rendererReady) {
    mainWindow.webContents.send('app:openFile', filePath)
  } else {
    pendingFilePath = filePath
  }
}

// macOS: должен быть зарегистрирован как можно раньше, до app.whenReady()
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  sendOpenFile(filePath)
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
})

// Второй двойной клик по ассоциированному файлу — фокусируем существующее окно вместо новой копии
app.on('second-instance', (_event, commandLine) => {
  if (!mainWindow) {
    return
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.focus()

  const filePath = findVideoFileInArgv(commandLine)
  if (filePath) {
    sendOpenFile(filePath)
  }
})

async function createWindow(): Promise<void> {
  const initialState = getInitialWindowState()

  mainWindow = new BrowserWindow({
    ...initialState.bounds,
    minWidth: 820,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Иначе таймеры прогресса/автоскрытия контролов начинают врать, пока окно неактивно
      backgroundThrottling: false,
    },
    show: false,
  })

  trackWindowBounds(mainWindow)

  mainWindow.once('ready-to-show', () => {
    if (initialState.isMaximized) {
      mainWindow?.maximize()
    }
    if (initialState.isFullScreen) {
      mainWindow?.setFullScreen(true)
    }
    mainWindow?.show()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    rendererReady = false
  })
  mainWindow.webContents.once('did-finish-load', () => {
    rendererReady = true
    if (pendingFilePath) {
      mainWindow?.webContents.send('app:openFile', pendingFilePath)
      pendingFilePath = undefined
    }
  })

  if (isProd) {
    // Рендерер — статический экспорт Next.js, отдаётся через привилегированную схему app://
    // (не file:// — под ним origin null, Chromium блокирует Worker/WASM, нужные SubtitlesOctopus)
    await mainWindow.loadURL(APP_INDEX_URL)
  } else {
    const port = process.argv[2] || 8888
    await mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  setupMediaProtocolHandler()
  setupAppProtocolHandler()
  initAllowedPaths()
  registerIpcHandlers(() => mainWindow)
  await createWindow()

  app.on('activate', async () => {
    // macOS: создаём окно при клике на иконку в доке
    if (mainWindow === null) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
