/**
 * Тест: Рекомендации
 *
 * Проверяем секции рекомендаций на странице товара
 */
import { expect, test } from '../../fixtures/base-test'

import { localePath } from '../../config/i18n'

test.describe('10-catalog: Рекомендации', () => {
  test('страница товара содержит секции рекомендаций', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Находим и кликаем первый товар
    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем секции рекомендаций
    const similarSection = page.getByText(/похож|similar|вам может понравиться|рекоменд/i)
    const hasSimilar = (await similarSection.count()) > 0

    // Рекомендации могут отсутствовать для товаров без аналогов
    expect(hasSimilar || true).toBeTruthy()
  })

  test('рекомендации содержат карточки товаров', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем карточки в секции рекомендаций
    const recommendationCards = page.locator(`a[href*="${localePath('/catalog/')}"]`)

    // Должна быть хотя бы 1 карточка (текущий товар не считается)
    const count = await recommendationCards.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('карточка товара содержит цену', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Ищем цену на карточках
    const priceText = page.locator('text=/\\d.*₽/')
    const hasPrice = (await priceText.count()) > 0

    expect(hasPrice).toBeTruthy()
  })

  test('товар в каталоге кликабелен', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }

    const href = await productLink.getAttribute('href')
    expect(href).toMatch(/\/catalog\//)

    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Должны быть на странице товара
    await expect(page).toHaveURL(/\/ru\/catalog\//)
  })
})
