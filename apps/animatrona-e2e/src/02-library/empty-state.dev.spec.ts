/**
 * Dev тесты для Library page.
 *
 * Тестируют UI через HTTP (без Electron).
 * Быстрые тесты для разработки.
 */

import { expect, test } from '@playwright/test'

/** localStorage ключ для отключения Welcome диалога */
const WELCOME_SHOWN_KEY = 'animatrona-welcome-shown'

/**
 * Отключить Welcome диалог перед навигацией.
 * Устанавливает флаг в localStorage чтобы диалог не появлялся.
 */
async function disableWelcomeDialog(page: import('@playwright/test').Page) {
  // Нужно сначала перейти на страницу, потом установить localStorage
  // и перезагрузить, ИЛИ использовать addInitScript
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true')
  }, WELCOME_SHOWN_KEY)
}

test.describe('Library - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
    await page.goto('/library')
  })

  test('страница библиотеки загружается', async ({ page }) => {
    // Проверяем что страница загрузилась
    await expect(page).toHaveURL(/.*library.*/)
  })

  test('отображается sidebar с навигацией', async ({ page }) => {
    // Sidebar — это navigation element
    const sidebar = page.getByRole('navigation')
    await expect(sidebar).toBeVisible()

    // Ссылки навигации
    const libraryLink = page.getByRole('link', { name: /библиотека/i })
    const settingsLink = page.getByRole('link', { name: /настройки/i })

    await expect(libraryLink).toBeVisible()
    await expect(settingsLink).toBeVisible()
  })

  test('кнопка импорта доступна', async ({ page }) => {
    // Кнопка импорта в header или empty state
    const importButton = page.getByRole('button', { name: /импорт/i })
    await expect(importButton).toBeVisible()
  })
})

test.describe('Library - Search', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
    await page.goto('/library')
  })

  test('поле поиска доступно', async ({ page }) => {
    // Открываем QuickSearch диалог
    await page.keyboard.press('Control+k')

    // Ждём появления диалога
    const searchDialog = page.locator('[data-testid="quick-search-dialog"]')
    await expect(searchDialog).toBeVisible({ timeout: 5000 })

    // Проверяем что поле поиска есть
    const searchInput = page.locator('[data-testid="search-input"]')
    await expect(searchInput).toBeVisible()
  })

  test('горячая клавиша Ctrl+K открывает поиск', async ({ page }) => {
    // Нажимаем Ctrl+K
    await page.keyboard.press('Control+k')

    // Должен появиться диалог поиска
    const searchDialog = page.locator('[data-testid="quick-search-dialog"]')
    await expect(searchDialog).toBeVisible({ timeout: 5000 })
  })
})
