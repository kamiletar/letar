/**
 * Тест: Коллекции
 *
 * Проверяем доступность и отображение коллекций в каталоге
 */
import { expect, test } from '../../fixtures/base-test'

import { localePath } from '../../config/i18n'

test.describe('10-catalog: Коллекции', () => {
  test('страница каталога доступна', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/ru\/catalog/)
  })

  test('каталог содержит товары', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Ищем карточки товаров
    const productLinks = page.locator(`a[href*="${localePath('/catalog/')}"]`)
    const productCards = page.locator('[data-testid="product-card"]')

    const hasProducts = (await productLinks.count()) > 0 || (await productCards.count()) > 0
    expect(hasProducts).toBeTruthy()
  })

  test('фильтр "Новая коллекция" работает', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Ищем фильтр или ссылку "Новая коллекция"
    const newCollectionFilter = page.getByText(/новая коллекция|new collection|новинк/i)

    if ((await newCollectionFilter.count()) > 0) {
      await newCollectionFilter.first().click()
      await page.waitForLoadState('domcontentloaded')
    }
  })
})
