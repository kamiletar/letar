/**
 * Хелперы для запуска и тестирования Animatrona Player (animatrona-folder-player).
 *
 * Упрощённая версия хелперов `animatrona-e2e` — у этого приложения нет БД (JSON/localStorage
 * через @letar/electron-storage) и нет welcome-онбординга, поэтому setupIsolatedDatabase и
 * closeWelcomeDialog из оригинала здесь не нужны вовсе.
 */

import { workspaceRoot } from '@nx/devkit'
import { parseElectronApp, stubAllDialogs, stubDialog } from 'electron-playwright-helpers'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { ElectronApplication, Page } from 'playwright'
import { _electron as electron } from 'playwright'

const WORKSPACE_ROOT = workspaceRoot

/**
 * Контекст запущенного Electron приложения
 */
export interface ElectronTestContext {
  app: ElectronApplication
  page: Page
}

/**
 * Путь к production билду Animatrona Player
 */
function getElectronAppPath(): string {
  const distDir = path.join(WORKSPACE_ROOT, 'apps/animatrona-folder-player/dist')

  if (process.platform === 'win32') {
    return path.join(distDir, 'win-unpacked/Animatrona Player.exe')
  }
  if (process.platform === 'darwin') {
    return path.join(distDir, 'mac/Animatrona Player.app/Contents/MacOS/Animatrona Player')
  }
  return path.join(distDir, 'linux-unpacked/animatrona-player')
}

/**
 * Проверить, что production build существует
 */
export function checkProductionBuild(): boolean {
  return fs.existsSync(getElectronAppPath())
}

/**
 * Запустить Animatrona Player для тестирования
 *
 * @example
 * ```ts
 * const ctx = await launchElectronApp()
 * await ctx.page.getByRole('button', { name: 'Выбрать папку' }).click()
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
      `Electron app not found at ${appPath}. `
        + 'Run "nx build:win animatrona-folder-player" first to create production build.',
    )
  }

  const appInfo = parseElectronApp(appPath)

  // Изолированная userData на каждый тест — не трогаем реальные настройки/историю пользователя
  const userDataDir = createIsolatedUserDataDir()

  const app = await electron.launch({
    executablePath: appInfo.executable,
    args: [appInfo.main, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      ...env,
      ELECTRON_DISABLE_GPU: '1',
      NODE_ENV: 'test',
    },
    ...(recordVideo && {
      recordVideo: {
        dir: path.join(WORKSPACE_ROOT, 'apps/animatrona-folder-player-e2e/test-videos'),
        size: { width: 1280, height: 800 },
      },
    }),
  })

  const page = await app.firstWindow({ timeout: windowTimeout })
  await page.waitForLoadState('domcontentloaded')

  // Стабим все диалоги по умолчанию (возвращают canceled: true) — конкретные сценарии
  // переопределяют нужный диалог через stubSelectFolderDialog/stubOpenFileDialog
  await stubAllDialogs(app)

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

// ==================== Dialog Stubbing ====================

/**
 * Stub для dialog.showOpenDialog — возвращает указанные файлы
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
 * Stub для выбора папки (`dialog:selectFolder` в main вызывает тот же showOpenDialog
 * с `properties: ['openDirectory']`)
 */
export async function stubSelectFolderDialog(app: ElectronApplication, folderPath: string): Promise<void> {
  await stubDialog(app, 'showOpenDialog', {
    filePaths: [folderPath],
    canceled: false,
  })
}

// ==================== IPC Helpers ====================

/**
 * Получить версию приложения
 */
export async function getAppVersion(app: ElectronApplication): Promise<string> {
  return await app.evaluate(async ({ app }) => app.getVersion())
}

// ==================== Path Helpers ====================

/**
 * Путь к тестовым fixtures
 */
export function getFixturesPath(...segments: string[]): string {
  return path.join(WORKSPACE_ROOT, 'apps/animatrona-folder-player-e2e/fixtures', ...segments)
}

/**
 * Создать уникальную userData директорию для теста
 */
export function createIsolatedUserDataDir(): string {
  const userDataDir = path.join(
    os.tmpdir(),
    `animatrona-folder-player-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
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
