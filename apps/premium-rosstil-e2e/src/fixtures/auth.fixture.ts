/**
 * Фикстуры аутентификации для E2E тестов
 *
 * ВАЖНО: Теперь используем storageState из setup тестов!
 * Сессии сохранены в playwright/.auth/admin.json и user.json
 * Это значительно ускоряет тесты - не нужно логиниться каждый раз
 */
import type { Page } from '@playwright/test'
import { test as base } from './base-test'
import { ADMIN_STORAGE_STATE, USER_STORAGE_STATE } from './storage-state'

/**
 * Типы фикстур аутентификации
 */
type AuthFixtures = {
  /** Страница с авторизованным админом */
  adminPage: Page
  /** Страница с авторизованным пользователем */
  userPage: Page
}

/**
 * Расширенный тест с фикстурами авторизации
 *
 * Использует storageState для восстановления сессии вместо логина через UI
 */
export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    // Создаём контекст с сохранённой сессией админа
    const context = await browser.newContext({
      storageState: ADMIN_STORAGE_STATE,
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  userPage: async ({ browser }, use) => {
    // Создаём контекст с сохранённой сессией пользователя
    const context = await browser.newContext({
      storageState: USER_STORAGE_STATE,
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from './base-test'
