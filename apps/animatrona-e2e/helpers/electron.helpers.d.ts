/**
 * Хелперы для запуска и тестирования Electron приложения.
 *
 * Использует electron-playwright-helpers для:
 * - Парсинга packaged app
 * - Stubbing native dialogs (showOpenDialog, showSaveDialog)
 * - IPC взаимодействий
 */
import { type ElectronApplication, type Page } from 'playwright'
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
 * Проверить, что production build существует
 */
export declare function checkProductionBuild(): boolean
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
export declare function launchElectronApp(options?: {
  /** Таймаут ожидания первого окна (ms) */
  windowTimeout?: number
  /** Записывать видео тестов */
  recordVideo?: boolean
  /** Переменные окружения */
  env?: Record<string, string>
}): Promise<ElectronTestContext>
/**
 * Закрыть Electron приложение
 */
export declare function closeElectronApp(ctx: ElectronTestContext): Promise<void>
/**
 * Ожидание загрузки главного окна после splash screen
 *
 * Animatrona показывает splash screen при старте, затем загружает main window.
 * Этот хелпер ждёт когда splash исчезнет и появится основной UI.
 */
export declare function waitForMainWindow(ctx: ElectronTestContext, timeout?: number): Promise<void>
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
export declare function stubOpenFileDialog(app: ElectronApplication, filePaths: string[]): Promise<void>
/**
 * Stub для отмены dialog.showOpenDialog
 */
export declare function stubCancelFileDialog(app: ElectronApplication): Promise<void>
/**
 * Stub для dialog.showSaveDialog — возвращает указанный путь
 */
export declare function stubSaveFileDialog(app: ElectronApplication, filePath: string): Promise<void>
/**
 * Stub для выбора папки через dialog.showOpenDialog
 */
export declare function stubSelectFolderDialog(app: ElectronApplication, folderPath: string): Promise<void>
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
export declare function evaluateInMain<T>(app: ElectronApplication, fn: () => T | Promise<T>): Promise<T>
/**
 * Получить версию приложения
 */
export declare function getAppVersion(app: ElectronApplication): Promise<string>
/**
 * Получить путь к userData
 */
export declare function getUserDataPath(app: ElectronApplication): Promise<string>
/**
 * Ожидание открытия нового окна
 *
 * Полезно для тестирования player window, которое открывается отдельно.
 */
export declare function waitForNewWindow(app: ElectronApplication, timeout?: number): Promise<Page>
/**
 * Получить все открытые окна
 */
export declare function getAllWindows(app: ElectronApplication): Promise<Page[]>
/**
 * Путь к тестовым fixtures
 */
export declare function getFixturesPath(...segments: string[]): string
/**
 * Путь к тестовым видео
 */
export declare function getTestVideoPath(filename: string): string
/**
 * Путь к временной тестовой БД
 */
export declare function getTestDbPath(filename: string): string
// # sourceMappingURL=electron.helpers.d.ts.map
