/**
 * Константы для путей к файлам состояния авторизации
 *
 * ВАЖНО: Playwright разрешает storageState относительно CWD и configDir.
 * При запуске через Nx CWD = workspace root, а configDir = apps/premium-rosstil-e2e/.
 * Пишем в ОБЕ локации чтобы оба механизма работали.
 */
import { resolve } from 'path'

const E2E_ROOT = resolve(__dirname, '..')

/**
 * Возвращает массив путей для записи storageState:
 * - configDir (для проектов с storageState в config)
 * - CWD (для test.use({ storageState: 'playwright/.auth/...' }))
 */
export function storagePaths(filename: string): string[] {
  const configDirPath = resolve(E2E_ROOT, `playwright/.auth/${filename}`)
  const cwdPath = resolve(process.cwd(), `playwright/.auth/${filename}`)
  // Если CWD совпадает с configDir, не дублируем
  if (configDirPath === cwdPath) {
    return [configDirPath]
  }
  return [configDirPath, cwdPath]
}

// Массивы путей для global-setup (запись в оба места)
export const ADMIN_PATHS = storagePaths('admin.json')
export const USER_PATHS = storagePaths('user.json')

// Первый путь — для playwright.config.ts и фикстур (чтение)
export const ADMIN_STORAGE_STATE = ADMIN_PATHS[0]
export const USER_STORAGE_STATE = USER_PATHS[0]
