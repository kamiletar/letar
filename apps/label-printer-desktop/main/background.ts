import { killAllChildProcesses, Logger } from '@letar/label-printer-core'
import { type ChildProcess, fork } from 'child_process'
import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc'
import { getDatabasePath, initializeDatabase } from './services/database'
import { scannerService } from './services/scanner.service'
import { settingsService } from './services/settings.service'
import { initAutoUpdater, registerUpdaterHandlers } from './services/updater.service'
import { getAvailablePort } from './utils/port-finder'

// Инициализируем логгер
Logger.initialize({
  level: 'info',
  console: true,
  file: false,
  maxSize: '10m',
  maxFiles: 5,
})

/** Ленивое получение логгера */
const getLogger = () => Logger.getInstance()

// === Глобальная обработка ошибок ===

// Необработанные исключения
process.on('uncaughtException', (error) => {
  getLogger().error(`[UncaughtException] ${error.message}`)
  getLogger().error(`[UncaughtException] Stack: ${error.stack}`)

  // Показываем диалог только если приложение готово
  if (app.isReady()) {
    dialog.showErrorBox('Критическая ошибка', `Произошла непредвиденная ошибка:\n\n${error.message}`)
  }
})

// Необработанные промисы
process.on('unhandledRejection', (reason, _promise) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  const stack = reason instanceof Error ? reason.stack : undefined
  getLogger().error(`[UnhandledRejection] ${message}`)
  if (stack) {
    getLogger().error(`[UnhandledRejection] Stack: ${stack}`)
  }
})

// В packaged Electron app.isPackaged === true
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let nextServer: ChildProcess | null = null
let serverPort = 3000

/**
 * Получить URL API сервера (для использования в main процессе)
 */
export function getApiBaseUrl(): string {
  const isProd = app.isPackaged || process.env.NODE_ENV === 'production'
  if (isProd) {
    return `http://127.0.0.1:${serverPort}`
  }
  // В dev режиме порт передаётся через argv
  const port = process.argv[2] || 8888
  return `http://localhost:${port}`
}

/**
 * Создание splash screen окна
 */
function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))

  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

/**
 * Закрытие splash screen
 */
function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
}

/**
 * Запуск Next.js standalone сервера
 * Возвращает порт, на котором запущен сервер
 */
async function startNextServer(): Promise<number> {
  const port = await getAvailablePort(5000)
  serverPort = port

  // Путь к standalone серверу (Next.js сохраняет структуру монорепо)
  const standaloneDir = path.join(process.resourcesPath, 'standalone')
  const serverPath = path.join(standaloneDir, 'apps', 'label-printer-desktop', 'renderer', 'server.js')
  const serverCwd = path.join(standaloneDir, 'apps', 'label-printer-desktop', 'renderer')

  // Путь к SQLite базе данных в userData
  const dbPath = getDatabasePath()

  getLogger().info(`[NextServer] Starting on port ${port}...`)
  getLogger().info(`[NextServer] Server path: ${serverPath}`)
  getLogger().info(`[NextServer] Server cwd: ${serverCwd}`)
  getLogger().info(`[NextServer] Database: ${dbPath}`)

  return new Promise((resolve, reject) => {
    // Запускаем Next.js сервер через fork (использует Node.js из Electron)
    nextServer = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        DATABASE_PATH: dbPath,
      },
      cwd: serverCwd,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    })

    // Логируем stdout
    nextServer.stdout?.on('data', (data) => {
      const msg = data.toString().trim()
      getLogger().info(`[NextServer] ${msg}`)

      // Ждём сообщения о готовности сервера
      if (msg.includes('Ready') || msg.includes('started server')) {
        resolve(port)
      }
    })

    // Логируем stderr
    nextServer.stderr?.on('data', (data) => {
      getLogger().error(`[NextServer] ${data.toString().trim()}`)
    })

    nextServer.on('error', (err) => {
      getLogger().error(`[NextServer] Failed to start: ${err.message}`)
      reject(err)
    })

    nextServer.on('close', (code) => {
      getLogger().info(`[NextServer] Process exited with code ${code}`)
      nextServer = null
    })

    // Таймаут на случай если сервер не стартует
    setTimeout(() => {
      // Если сервер ещё не ответил, всё равно пытаемся подключиться
      resolve(port)
    }, 5000)
  })
}

/**
 * Остановка Next.js сервера
 */
function stopNextServer(): void {
  if (nextServer) {
    getLogger().info('[NextServer] Stopping...')
    nextServer.kill()
    nextServer = null
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Современный вид без системной рамки
    // titleBarStyle: 'hiddenInset', // Раскомментировать для macOS style
    show: false,
  })

  // Показываем окно когда готово, закрываем splash
  mainWindow.once('ready-to-show', () => {
    closeSplashWindow()
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Загружаем приложение
  if (isProd) {
    await mainWindow.loadURL(`http://127.0.0.1:${serverPort}/home`)
  } else {
    const port = process.argv[2] || 8888
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }
}

// Инициализация приложения
app.whenReady().then(async () => {
  // Показываем splash screen сразу
  createSplashWindow()

  // Регистрируем IPC handlers
  registerIpcHandlers()
  registerUpdaterHandlers()

  // Инициализируем БД (копируем template + применяем миграции)
  try {
    await initializeDatabase()
  } catch (err) {
    getLogger().error(`[App] Failed to initialize database: ${err}`)
  }

  // В production запускаем Next.js сервер
  if (isProd) {
    try {
      await startNextServer()
    } catch (err) {
      getLogger().error(`[App] Failed to start Next.js server: ${err}`)
    }
  }

  await createWindow()

  // Инициализируем сканер (после создания окна)
  if (mainWindow) {
    scannerService.setMainWindow(mainWindow)
    try {
      const scannerConfig = await settingsService.getScannerConfig()
      await scannerService.connect(scannerConfig)
    } catch (err) {
      getLogger().error('[App] Failed to initialize scanner:', err)
    }
  }

  // Инициализируем автообновление (после создания окна)
  initAutoUpdater(mainWindow)

  app.on('activate', async () => {
    // macOS: создаём окно при клике на иконку в доке
    if (mainWindow === null) {
      await createWindow()
    }
  })
})

// Закрываем приложение при закрытии всех окон (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup при выходе
app.on('before-quit', async () => {
  killAllChildProcesses()
  await scannerService.disconnect()
  stopNextServer()
})

app.on('quit', async () => {
  killAllChildProcesses()
  await scannerService.disconnect()
  stopNextServer()
})
