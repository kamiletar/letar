import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'
import { APP_INDEX_URL, registerAppProtocol, setupAppProtocolHandler } from './protocols/app.protocol'
import { initializeDatabase } from './services/database'
import { closePrismaClient, initializePrismaDb } from './utils/db'

// Регистрация привилегий схемы app:// — обязательно до app.whenReady() (нужна для ASS-субтитров
// эпизодов через SubtitlesOctopus: Worker+WASM не работают под file://, см.
// .claude/docs/electron-app-protocol.md)
registerAppProtocol()

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

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 820,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
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
  setupAppProtocolHandler()
  await initializeDatabase()
  await initializePrismaDb()

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

app.on('before-quit', () => {
  void closePrismaClient()
})
