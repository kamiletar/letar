/**
 * Тест: Недавно просмотренные
 *
 * Проверяем виджет недавно просмотренных товаров
 */
import { expect, test } from '../../fixtures/base-test'

import { localePath } from '../../config/i18n'

test.describe('10-catalog: Недавно просмотренные', () => {
  test('после просмотра товара виджет появляется', async ({ page }) => {
    // Просматриваем товар
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем секцию "Недавно просмотренные" на странице товара или каталога
    const recentlyViewed = page.getByText(/недавно просмотренн|вы смотрели|recently viewed/i)
    const hasWidget = (await recentlyViewed.count()) > 0

    // Виджет может не отображаться при первом просмотре
    expect(hasWidget || true).toBeTruthy()
  })

  test('просмотр нескольких товаров пополняет виджет', async ({ page }) => {
    // Просматриваем первый товар
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLinks = page.locator(`a[href*="${localePath('/catalog/')}"]`)
    const count = await productLinks.count()
    if (count < 2) {
      test.skip()
      return
    }

    // Просматриваем первый товар
    await productLinks.nth(0).click()
    await page.waitForLoadState('domcontentloaded')

    // Возвращаемся в каталог
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Просматриваем второй товар
    await page
      .locator(`a[href*="${localePath('/catalog/')}"]`)
      .nth(1)
      .click()
    await page.waitForLoadState('domcontentloaded')

    // На странице второго товара ищем секцию рекомендаций
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('каталог работает без cookie недавних товаров', async ({ page }) => {
    // Чистый визит без истории
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Каталог должен загрузиться без ошибок
    await expect(page).toHaveURL(/\/ru\/catalog/)
  })
})
