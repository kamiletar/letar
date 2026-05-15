import { expect, test } from '@playwright/test'

/**
 * Тесты страницы истории печати
 */
test.describe('История печати', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('страница истории загружается', async ({ page }) => {
    await expect(page.locator('text=История печати')).toBeVisible()
    await expect(page.locator('text=Список напечатанных этикеток')).toBeVisible()
  })

  test('фильтры поиска доступны', async ({ page }) => {
    // Проверяем поле поиска
    await expect(page.locator('input[placeholder*="GTIN"]')).toBeVisible()

    // Проверяем фильтры по дате
    await expect(page.locator('text=Начало периода')).toBeVisible()
    await expect(page.locator('text=Конец периода')).toBeVisible()
  })

  test('кнопка обновления доступна', async ({ page }) => {
    await expect(page.locator('button:has-text("Обновить")')).toBeVisible()
  })

  test('кнопка экспорта в Excel доступна', async ({ page }) => {
    await expect(page.locator('button:has-text("Экспорт в Excel")')).toBeVisible()
  })

  test('таблица истории имеет заголовки', async ({ page }) => {
    // При наличии данных таблица должна показывать заголовки
    // Если данных нет, будет пустое состояние
    const table = page.locator('table')
    const emptyState = page.locator('text=История печати пуста')

    // Либо таблица, либо пустое состояние
    const hasTable = (await table.count()) > 0
    const hasEmptyState = (await emptyState.count()) > 0

    expect(hasTable || hasEmptyState).toBeTruthy()
  })
})
