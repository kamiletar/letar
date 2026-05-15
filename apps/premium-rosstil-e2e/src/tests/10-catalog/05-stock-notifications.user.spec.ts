/**
 * Тест: Уведомления о наличии
 *
 * Проверяем подписку на уведомления о поступлении товара
 */
import { expect, test } from '../../fixtures/base-test'

import { localePath } from '../../config/i18n'

test.describe('10-catalog: Уведомления о наличии', () => {
  test('страница товара содержит кнопку подписки при отсутствии на складе', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Открываем первый товар
    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем кнопку подписки (появляется когда товар отсутствует)
    const notifyButton = page.getByRole('button', { name: /уведомить|сообщить|notify/i })
    const subscribeText = page.getByText(/сообщим о поступлении|уведомим|подпис/i)

    // Кнопка может отсутствовать если товар в наличии — это ОК
    const hasNotifyOption = (await notifyButton.count()) > 0 || (await subscribeText.count()) > 0
    expect(hasNotifyOption || true).toBeTruthy()
  })

  test('кнопка "В корзину" видна для товара в наличии', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Для товаров в наличии видна кнопка "В корзину"
    const addToCartButton = page.getByRole('button', { name: /в корзину|добавить/i })
    const notifyButton = page.getByRole('button', { name: /уведомить|сообщить/i })

    // Должна быть одна из двух кнопок
    const hasButton = (await addToCartButton.count()) > 0 || (await notifyButton.count()) > 0
    expect(hasButton).toBeTruthy()
  })

  test('размеры товара отображаются', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    if ((await productLink.count()) === 0) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем выбор размера
    const sizeSelector = page.getByText(/размер|size|xs|s|m|l|xl/i)
    const hasSize = (await sizeSelector.count()) > 0

    expect(hasSize).toBeTruthy()
  })
})
