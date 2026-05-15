/**
 * Dev тесты для View Modes
 *
 * Тестируют переключение режимов отображения:
 * - individual (по отдельности) — AnimeGrid
 * - franchise (по франшизам) — FranchiseView
 *
 * Режим сохраняется в localStorage: animatrona:library:viewMode
 */

import { expect, test } from '@playwright/test'

/** localStorage ключ для отключения Welcome диалога */
const WELCOME_SHOWN_KEY = 'animatrona-welcome-shown'

/** localStorage ключ для режима отображения */
const VIEW_MODE_KEY = 'animatrona:library:viewMode'

/**
 * Отключить Welcome диалог перед навигацией.
 */
async function disableWelcomeDialog(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true')
  }, WELCOME_SHOWN_KEY)
}

test.describe('View Modes', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
    await page.goto('/library')
  })

  test('переключатель режимов отображается', async ({ page }) => {
    // SegmentGroup с двумя режимами
    const individualButton = page.getByText('По отдельности')
    const franchiseButton = page.getByText('По франшизам')

    await expect(individualButton).toBeVisible({ timeout: 5000 })
    await expect(franchiseButton).toBeVisible({ timeout: 5000 })
  })

  test('переключение на режим франшиз', async ({ page }) => {
    // Кликаем на "По франшизам"
    const franchiseButton = page.getByText('По франшизам')
    await expect(franchiseButton).toBeVisible({ timeout: 5000 })
    await franchiseButton.click()

    // Проверяем что localStorage обновился
    const viewMode = await page.evaluate((key) => localStorage.getItem(key), VIEW_MODE_KEY)
    expect(viewMode).toBe('franchise')
  })

  test('переключение на режим по отдельности', async ({ page }) => {
    // Сначала устанавливаем режим франшиз
    await page.evaluate((key) => localStorage.setItem(key, 'franchise'), VIEW_MODE_KEY)
    await page.reload()

    // Теперь кликаем на "По отдельности"
    const individualButton = page.getByText('По отдельности')
    await expect(individualButton).toBeVisible({ timeout: 5000 })
    await individualButton.click()

    // Проверяем что localStorage обновился
    const viewMode = await page.evaluate((key) => localStorage.getItem(key), VIEW_MODE_KEY)
    expect(viewMode).toBe('individual')
  })

  test('режим сохраняется после перезагрузки', async ({ page }) => {
    // Переключаем на франшизы
    const franchiseButton = page.getByText('По франшизам')
    await franchiseButton.click()

    // Перезагружаем страницу
    await page.reload()

    // Проверяем что режим восстановился
    const viewMode = await page.evaluate((key) => localStorage.getItem(key), VIEW_MODE_KEY)
    expect(viewMode).toBe('franchise')

    // SegmentGroup должен показывать активный элемент "По франшизам"
    // В Chakra SegmentGroup активный элемент имеет data-state="checked"
    const franchiseItem = page.locator('[data-state="checked"]').filter({ hasText: /по франшизам/i })
    await expect(franchiseItem.first()).toBeVisible({ timeout: 5000 })
  })

  test('дефолтный режим — individual', async ({ page }) => {
    // Очищаем localStorage
    await page.evaluate((key) => localStorage.removeItem(key), VIEW_MODE_KEY)
    await page.reload()

    // По умолчанию активен "По отдельности"
    const individualItem = page.locator('[data-state="checked"]').filter({ hasText: /по отдельности/i })
    await expect(individualItem.first()).toBeVisible({ timeout: 5000 })
  })
})
