/**
 * Фикстуры аутентификации для E2E тестов
 *
 * ВАЖНО: Используем storageState из setup тестов!
 * Сессии сохранены в playwright/.auth/admin.json
 * Это значительно ускоряет тесты - не нужно логиниться каждый раз
 */
import { type Page, test as base } from '@playwright/test'
import { existsSync } from 'fs'
import { ADMIN_STORAGE_STATE } from './storage-state'

/**
 * Типы фикстур аутентификации
 */
type AuthFixtures = {
  /** Страница с авторизованным админом */
  adminPage: Page
}

/**
 * Расширенный тест с фикстурами авторизации
 *
 * Использует storageState для восстановления сессии вместо логина через UI
 * Если файл сессии не существует (auth setup не прошёл), тест будет пропущен
 */
export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use, testInfo) => {
    // Проверяем существование файла сессии
    if (!existsSync(ADMIN_STORAGE_STATE)) {
      testInfo.skip(true, 'Auth setup не прошёл — файл сессии admin.json не найден. Создайте тестового админа в БД.')
      return
    }

    // Создаём контекст с сохранённой сессией админа
    const context = await browser.newContext({
      storageState: ADMIN_STORAGE_STATE,
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
