/**
 * Хелперы для тестов авторизации в E2E тестах
 *
 * Устраняет дублирование ~44 идентичных тестов
 * "неавторизованный пользователь редиректится на sign-in"
 */
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Storage state для неавторизованного пользователя
 * Используется для создания контекста без cookies
 */
export const UNAUTHENTICATED_STATE = { cookies: [], origins: [] }

/**
 * Создать контекст браузера без авторизации
 *
 * @param browser - Playwright Browser
 * @returns BrowserContext без сохранённых cookies
 *
 * @example
 * const context = await createUnauthenticatedContext(browser)
 * const page = await context.newPage()
 * await page.goto('/protected/')
 * await expect(page).toHaveURL(/sign-in/)
 * await context.close()
 */
export async function createUnauthenticatedContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    storageState: UNAUTHENTICATED_STATE,
  })
}

/**
 * Тест редиректа неавторизованного пользователя на sign-in
 *
 * @param browser - Playwright Browser
 * @param url - URL защищённой страницы
 * @param timeout - Таймаут ожидания редиректа
 *
 * @example
 * test('защита маршрута', async ({ browser }) => {
 *   await testUnauthenticatedRedirect(browser, '/dashboard/')
 * })
 */
export async function testUnauthenticatedRedirect(browser: Browser, url: string, timeout = 10000): Promise<void> {
  const context = await createUnauthenticatedContext(browser)
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/sign-in/, { timeout })
  } finally {
    await context.close()
  }
}

/**
 * Создать контекст с кастомным storage state
 *
 * @param browser - Playwright Browser
 * @param storageStatePath - Путь к файлу storage state
 * @returns BrowserContext с загруженными cookies
 *
 * @example
 * const context = await createAuthenticatedContext(browser, 'playwright/.auth/instructor.json')
 * const page = await context.newPage()
 * // ... выполнить действия
 * await context.close()
 */
export async function createAuthenticatedContext(browser: Browser, storageStatePath: string): Promise<BrowserContext> {
  return browser.newContext({
    storageState: storageStatePath,
  })
}

/**
 * Проверить существование storage state файла
 *
 * @param storageStatePath - Путь к файлу storage state
 * @returns true если файл существует
 *
 * @example
 * if (!storageStateExists('playwright/.auth/instructor.json')) {
 *   test.skip(true, 'Storage state не существует')
 * }
 */
export async function storageStateExists(storageStatePath: string): Promise<boolean> {
  const fs = await import('fs')
  return fs.existsSync(storageStatePath)
}

/**
 * Выполнить тест с авторизованным контекстом
 *
 * @param browser - Playwright Browser
 * @param storageStatePath - Путь к файлу storage state
 * @param testFn - Функция теста
 *
 * @example
 * await withAuthenticatedContext(browser, 'playwright/.auth/instructor.json', async (page) => {
 *   await page.goto('/dashboard/')
 *   await expect(page.getByText('Dashboard')).toBeVisible()
 * })
 */
export async function withAuthenticatedContext(
  browser: Browser,
  storageStatePath: string,
  testFn: (page: Page) => Promise<void>
): Promise<void> {
  const context = await createAuthenticatedContext(browser, storageStatePath)
  const page = await context.newPage()

  try {
    await testFn(page)
  } finally {
    await context.close()
  }
}

/**
 * Проверить, что пользователь авторизован (на странице отображается dashboard или профиль)
 *
 * @param page - Playwright Page
 * @param timeout - Таймаут проверки
 *
 * @example
 * await page.goto('/dashboard/')
 * await expectAuthenticated(page)
 */
export async function expectAuthenticated(page: Page, timeout = 10000): Promise<void> {
  // Проверяем, что НЕ на странице входа
  await expect(page).not.toHaveURL(/sign-in/, { timeout })
  // И не на странице регистрации
  await expect(page).not.toHaveURL(/sign-up/)
}

/**
 * Пути к storage state файлам для разных ролей
 */
export const storagePaths = {
  instructor: 'playwright/.auth/instructor.json',
  student: 'playwright/.auth/student.json',
  schoolAdmin: 'playwright/.auth/school-admin.json',
  owner: 'playwright/.auth/owner.json',
} as const

export type UserRole = keyof typeof storagePaths
