/**
 * Хелперы для запуска и тестирования Electron приложения.
 *
 * Использует electron-playwright-helpers для:
 * - Парсинга packaged app
 * - Stubbing native dialogs (showOpenDialog, showSaveDialog)
 * - IPC взаимодействий
 */

import { workspaceRoot } from '@nx/devkit'
import { parseElectronApp, stubAllDialogs, stubDialog } from 'electron-playwright-helpers'
import * as fs from 'fs'
import initSqlJs from 'fts5-sql-bundle'
import * as os from 'os'
import * as path from 'path'
import type { ElectronApplication, Page } from 'playwright'
import { _electron as electron } from 'playwright'

// Корень воркспейса из Nx (надёжнее, чем __dirname)
const WORKSPACE_ROOT = workspaceRoot

// Путь к изолированной папке userData для тестов (deprecated: используй createIsolatedUserDataDir)
const TEST_USER_DATA_DIR = path.join(os.tmpdir(), 'animatrona-e2e-userdata')

// Путь к template.db
const TEMPLATE_DB_PATH = path.join(WORKSPACE_ROOT, 'apps/animatrona/resources/template.db')

// Путь к WASM для sql.js (fts5-sql-bundle)
const WASM_PATH = path.join(WORKSPACE_ROOT, 'node_modules/fts5-sql-bundle/dist/sql-wasm.wasm')

/**
 * Подготовить изолированную БД для тестов
 *
 * Копирует template.db в userData/data/app.db и устанавливает изолированный libraryPath.
 * Это КРИТИЧНО для предотвращения записи тестовых файлов в реальную библиотеку пользователя.
 */
async function setupIsolatedDatabase(userDataDir: string, libraryPath: string): Promise<void> {
  // Создаём директорию data/
  const dataDir = path.join(userDataDir, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Копируем template.db
  const targetDbPath = path.join(dataDir, 'app.db')
  fs.copyFileSync(TEMPLATE_DB_PATH, targetDbPath)

  // Обновляем Settings с изолированным libraryPath через sql.js
  const SQL = await initSqlJs({ locateFile: () => WASM_PATH })
  const buffer = fs.readFileSync(targetDbPath)
  const db = new SQL.Database(buffer)

  try {
    const now = new Date().toISOString()
    // Вставляем или обновляем Settings с изолированной libraryPath
    // Settings имеет только updatedAt (без createdAt!)
    db.run(
      `INSERT INTO Settings (id, libraryPath, outputPath, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET libraryPath = excluded.libraryPath, outputPath = excluded.outputPath, updatedAt = excluded.updatedAt`,
      ['default', libraryPath, libraryPath, now]
    )

    // Сохраняем изменения
    fs.writeFileSync(targetDbPath, Buffer.from(db.export()))
  } finally {
    db.close()
  }
}

/**
 * Контекст запущенного Electron приложения
 */
export interface ElectronTestContext {
  /** Electron приложение */
  app: ElectronApplication
  /** Главное окно (Page) */
  page: Page
}

/**
 * Получить путь к production билду Electron приложения
 */
function getElectronAppPath(): string {
  const distDir = path.join(WORKSPACE_ROOT, 'apps/animatrona/dist')

  if (process.platform === 'win32') {
    return path.join(distDir, 'win-unpacked/Animatrona.exe')
  }
  if (process.platform === 'darwin') {
    return path.join(distDir, 'mac/Animatrona.app/Contents/MacOS/Animatrona')
  }
  // Linux
  return path.join(distDir, 'linux-unpacked/animatrona')
}

/**
 * Проверить, что production build существует
 */
export function checkProductionBuild(): boolean {
  const appPath = getElectronAppPath()
  return fs.existsSync(appPath)
}

/**
 * Запустить Electron приложение для тестирования
 *
 * @param options - Опции запуска
 * @returns Контекст с app и page
 *
 * @example
 * ```ts
 * const ctx = await launchElectronApp()
 * await ctx.page.getByRole('button', { name: 'Импорт' }).click()
 * await closeElectronApp(ctx)
 * ```
 */
export async function launchElectronApp(options?: {
  /** Таймаут ожидания первого окна (ms) */
  windowTimeout?: number
  /** Записывать видео тестов */
  recordVideo?: boolean
  /** Переменные окружения */
  env?: Record<string, string>
}): Promise<ElectronTestContext> {
  const { windowTimeout = 30000, recordVideo = true, env = {} } = options || {}

  const appPath = getElectronAppPath()

  if (!fs.existsSync(appPath)) {
    throw new Error(
      `Electron app not found at ${appPath}. ` + 'Run "bun nx build:win animatrona" first to create production build.'
    )
  }

  // Парсим packaged app для получения main entry point
  const appInfo = parseElectronApp(appPath)

  // Создаём УНИКАЛЬНУЮ изолированную папку userData для каждого теста
  // Это предотвращает конфликты между тестами и защищает реальные данные пользователя
  const userDataDir = createIsolatedUserDataDir()

  // Создаём изолированную папку библиотеки внутри userData
  // Это КРИТИЧНО: без этого тесты будут писать в реальную библиотеку пользователя!
  const libraryPath = path.join(userDataDir, 'TestLibrary')
  fs.mkdirSync(libraryPath, { recursive: true })

  // Подготавливаем БД с изолированной libraryPath
  await setupIsolatedDatabase(userDataDir, libraryPath)

  // Запускаем Electron
  const app = await electron.launch({
    executablePath: appInfo.executable,
    args: [
      appInfo.main,
      // Изолированная папка userData — не трогаем реальные данные пользователя
      `--user-data-dir=${userDataDir}`,
    ],
    env: {
      ...process.env,
      ...env,
      // Отключаем GPU для стабильности в CI
      ELECTRON_DISABLE_GPU: '1',
      // Помечаем как тестовое окружение
      NODE_ENV: 'test',
    },
    // Запись видео для отладки
    ...(recordVideo && {
      recordVideo: {
        dir: path.join(WORKSPACE_ROOT, 'apps/animatrona-e2e/test-videos'),
        size: { width: 1280, height: 800 },
      },
    }),
  })

  // Ждём первое окно (это будет splash screen)
  let page = await app.firstWindow({ timeout: windowTimeout })
  await page.waitForLoadState('domcontentloaded')

  // Animatrona использует splash screen, затем открывает main window
  // Ждём появления navigation (признак main window) или второго окна
  const hasNavigation = await page
    .getByRole('navigation')
    .isVisible()
    .catch(() => false)

  if (!hasNavigation) {
    // Splash screen открыт, ждём main window
    // Main window появляется как второе окно, splash закрывается
    const mainWindowPromise = new Promise<Page>((resolve) => {
      app.on('window', (newPage) => {
        resolve(newPage)
      })
    })

    // Ждём либо navigation в текущем окне, либо новое окно (с таймаутом)
    const result = await Promise.race([
      page
        .getByRole('navigation')
        .waitFor({ state: 'visible', timeout: windowTimeout })
        .then(() => 'nav'),
      mainWindowPromise.then((p) => ({ type: 'window', page: p })),
    ])

    if (typeof result === 'object' && result.type === 'window') {
      page = result.page
      await page.waitForLoadState('domcontentloaded')
    }
  }

  // Стабим все диалоги по умолчанию (возвращают canceled: true)
  await stubAllDialogs(app)

  // Отключаем welcome диалог:
  // 1. Устанавливаем localStorage флаг
  // 2. addInitScript — для будущих навигаций
  // 3. Reload — чтобы React увидел флаг при следующем рендере
  await page.evaluate(() => {
    localStorage.setItem('animatrona-welcome-shown', 'true')
  })
  await page.addInitScript(() => {
    localStorage.setItem('animatrona-welcome-shown', 'true')
  })
  // Reload чтобы React-приложение прочитало флаг из localStorage
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  return { app, page }
}

/**
 * Закрыть Electron приложение
 */
export async function closeElectronApp(ctx: ElectronTestContext): Promise<void> {
  if (ctx?.app) {
    await ctx.app.close()
  }
}

/**
 * Очистить тестовую папку userData
 *
 * Вызывать между тестами для полной изоляции или после всех тестов для cleanup.
 */
export function cleanupTestUserData(): void {
  if (fs.existsSync(TEST_USER_DATA_DIR)) {
    fs.rmSync(TEST_USER_DATA_DIR, { recursive: true, force: true })
  }
}

/**
 * Получить путь к тестовой папке userData
 */
export function getTestUserDataDir(): string {
  return TEST_USER_DATA_DIR
}

/**
 * Ожидание загрузки главного окна после splash screen
 *
 * Animatrona показывает splash screen при старте, затем загружает main window.
 * При первом запуске также показывается welcome-диалог onboarding.
 * Этот хелпер ждёт загрузки UI и закрывает welcome-диалог если он есть.
 */
export async function waitForMainWindow(ctx: ElectronTestContext, timeout = 60000): Promise<void> {
  // Ждём появления sidebar (признак загруженного main window)
  // Используем role='navigation' вместо data-testid для лучшей совместимости
  await ctx.page.getByRole('navigation').waitFor({ state: 'visible', timeout })

  // Даём время UI полностью загрузиться и появиться диалогам
  // Без этой задержки диалог может появиться ПОСЛЕ проверки
  await ctx.page.waitForTimeout(1000)

  // Функция закрытия welcome диалога
  const closeWelcomeDialog = async () => {
    const welcomeDialog = ctx.page.locator('text="Добро пожаловать в Animatrona!"')
    const isWelcomeVisible = await welcomeDialog.isVisible().catch(() => false)

    if (isWelcomeVisible) {
      // Проходим через все шаги onboarding
      const nextButton = ctx.page.getByRole('button', { name: /далее/i })
      const closeButton = ctx.page.getByRole('button', { name: /начать|закрыть|готово/i })

      // Кликаем "Далее" пока кнопка видна (несколько шагов)
      for (let i = 0; i < 10; i++) {
        const isNextVisible = await nextButton.isVisible().catch(() => false)
        if (!isNextVisible) {
          break
        }
        await nextButton.click()
        await ctx.page.waitForTimeout(500) // Анимация перехода
      }

      // Закрываем финальный шаг
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click()
      }

      // Ждём закрытия диалога
      await ctx.page
        .waitForSelector('text="Добро пожаловать"', { state: 'hidden', timeout: 5000 })
        .catch(() => undefined)
      return true
    }
    return false
  }

  // Вариант 1: старый onboarding "Добро пожаловать в Animatrona!"
  await closeWelcomeDialog()

  // Вариант 2: новый welcome диалог "Готовы начать?"
  const readyDialog = ctx.page.locator('text="Готовы начать?"')
  const isReadyVisible = await readyDialog.isVisible().catch(() => false)

  if (isReadyVisible) {
    // Нажимаем "Позже" чтобы закрыть диалог
    const laterButton = ctx.page.getByRole('button', { name: 'Позже' })
    if (await laterButton.isVisible().catch(() => false)) {
      await laterButton.click()
      // Ждём закрытия
      await ctx.page.waitForSelector('text="Готовы начать?"', { state: 'hidden', timeout: 5000 }).catch(() => undefined)
    }
  }

  // Финальная проверка — если диалог снова появился, закрываем ещё раз
  await ctx.page.waitForTimeout(500)
  await closeWelcomeDialog()
}

// ==================== Dialog Stubbing ====================

/**
 * Stub для dialog.showOpenDialog — возвращает указанные файлы
 *
 * @example
 * ```ts
 * await stubOpenFileDialog(ctx.app, ['/path/to/video.mkv'])
 * await ctx.page.getByRole('button', { name: 'Выбрать файлы' }).click()
 * // Диалог не появится, вернутся указанные файлы
 * ```
 */
export async function stubOpenFileDialog(app: ElectronApplication, filePaths: string[]): Promise<void> {
  await stubDialog(app, 'showOpenDialog', {
    filePaths,
    canceled: false,
  })
}

/**
 * Stub для отмены dialog.showOpenDialog
 */
export async function stubCancelFileDialog(app: ElectronApplication): Promise<void> {
  await stubDialog(app, 'showOpenDialog', {
    filePaths: [],
    canceled: true,
  })
}

/**
 * Stub для dialog.showSaveDialog — возвращает указанный путь
 */
export async function stubSaveFileDialog(app: ElectronApplication, filePath: string): Promise<void> {
  await stubDialog(app, 'showSaveDialog', {
    filePath,
    canceled: false,
  })
}

/**
 * Stub для выбора папки через dialog.showOpenDialog
 */
export async function stubSelectFolderDialog(app: ElectronApplication, folderPath: string): Promise<void> {
  await stubDialog(app, 'showOpenDialog', {
    filePaths: [folderPath],
    canceled: false,
  })
}

// ==================== IPC Helpers ====================

/**
 * Выполнить JavaScript в main process Electron
 *
 * @example
 * ```ts
 * const version = await evaluateInMain(ctx.app, () => {
 *   return require('electron').app.getVersion()
 * })
 * ```
 */
export async function evaluateInMain<T>(app: ElectronApplication, fn: () => T | Promise<T>): Promise<T> {
  return await app.evaluate(fn)
}

/**
 * Получить версию приложения
 */
export async function getAppVersion(app: ElectronApplication): Promise<string> {
  return await app.evaluate(async ({ app }) => app.getVersion())
}

/**
 * Получить путь к userData
 */
export async function getUserDataPath(app: ElectronApplication): Promise<string> {
  return await app.evaluate(async ({ app }) => app.getPath('userData'))
}

// ==================== Window Helpers ====================

/**
 * Ожидание открытия нового окна
 *
 * Полезно для тестирования player window, которое открывается отдельно.
 */
export async function waitForNewWindow(app: ElectronApplication, timeout = 10000): Promise<Page> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for new window after ${timeout}ms`))
    }, timeout)

    app.on('window', (page) => {
      clearTimeout(timeoutId)
      resolve(page)
    })
  })
}

/**
 * Получить все открытые окна
 */
export async function getAllWindows(app: ElectronApplication): Promise<Page[]> {
  return await app.windows()
}

// ==================== Path Helpers ====================

/**
 * Путь к тестовым fixtures
 */
export function getFixturesPath(...segments: string[]): string {
  return path.join(WORKSPACE_ROOT, 'apps/animatrona-e2e/fixtures', ...segments)
}

/**
 * Путь к тестовым видео
 */
export function getTestVideoPath(filename: string): string {
  return getFixturesPath('videos', filename)
}

/**
 * Путь к временной тестовой БД
 */
export function getTestDbPath(filename: string): string {
  return getFixturesPath('test-db', filename)
}

/**
 * Создать уникальную userData директорию для теста
 */
export function createIsolatedUserDataDir(): string {
  const userDataDir = path.join(os.tmpdir(), `animatrona-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true })
  }
  return userDataDir
}

/**
 * Удалить userData директорию после теста
 */
export function cleanupUserDataDir(userDataDir: string): void {
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

/**
 * Запустить Electron с seeded БД для watch page тестов
 *
 * Создаёт изолированную userData директорию с:
 * - Копией seeded БД в data/app.db
 * - Изолированной папкой библиотеки (Library/) — чтобы тесты не трогали реальную библиотеку пользователя
 *
 * @param seededDbPath Путь к заполненной БД
 * @returns Контекст и userData директория
 */
export async function launchElectronWithSeededDb(
  seededDbPath: string,
  options?: {
    windowTimeout?: number
    recordVideo?: boolean
  }
): Promise<ElectronTestContext & { userDataDir: string; libraryPath: string }> {
  const { windowTimeout = 30000, recordVideo = true } = options || {}

  const appPath = getElectronAppPath()

  if (!fs.existsSync(appPath)) {
    throw new Error(
      `Electron app not found at ${appPath}. ` + 'Run "bun nx build:win animatrona" first to create production build.'
    )
  }

  // Создаём изолированную userData директорию
  const userDataDir = createIsolatedUserDataDir()

  // Создаём изолированную папку библиотеки внутри userData
  // Это предотвращает запись тестовых файлов в реальную библиотеку пользователя
  const libraryPath = path.join(userDataDir, 'Library')
  if (!fs.existsSync(libraryPath)) {
    fs.mkdirSync(libraryPath, { recursive: true })
  }

  // Копируем seeded БД в userData с изолированной libraryPath
  const { copyDatabaseToUserData } = await import('./db.helpers')
  await copyDatabaseToUserData(seededDbPath, userDataDir, libraryPath)

  // Парсим packaged app
  const appInfo = parseElectronApp(appPath)

  // Запускаем Electron с кастомной userData
  const app = await electron.launch({
    executablePath: appInfo.executable,
    args: [appInfo.main, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      ELECTRON_DISABLE_GPU: '1',
      NODE_ENV: 'test',
    },
    ...(recordVideo && {
      recordVideo: {
        dir: path.join(WORKSPACE_ROOT, 'apps/animatrona-e2e/test-videos'),
        size: { width: 1280, height: 800 },
      },
    }),
  })

  // Ждём первое окно
  let page = await app.firstWindow({ timeout: windowTimeout })
  await page.waitForLoadState('domcontentloaded')

  // Обработка splash screen
  const hasNavigation = await page
    .getByRole('navigation')
    .isVisible()
    .catch(() => false)

  if (!hasNavigation) {
    const mainWindowPromise = new Promise<Page>((resolve) => {
      app.on('window', (newPage) => {
        resolve(newPage)
      })
    })

    const result = await Promise.race([
      page
        .getByRole('navigation')
        .waitFor({ state: 'visible', timeout: windowTimeout })
        .then(() => 'nav'),
      mainWindowPromise.then((p) => ({ type: 'window', page: p })),
    ])

    if (typeof result === 'object' && result.type === 'window') {
      page = result.page
      await page.waitForLoadState('domcontentloaded')
    }
  }

  await stubAllDialogs(app)

  return { app, page, userDataDir, libraryPath }
}
