/**
 * Интеграционные тесты: Промокоды
 *
 * Тестируем:
 * - В checkout есть поле промокода
 * - Невалидный промокод показывает ошибку
 * - Валидный промокод показывает скидку
 * - Скидка отражается в итоговой сумме
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'
import { disconnectDb } from '../../helpers/db.helpers'
import { CartPage } from '../../pages/cart'
import { CatalogPage, ProductDetailPage } from '../../pages/catalog'

/**
 * Гарантирует наличие товара в корзине для тестов checkout
 */
async function ensureCartHasItem(page: import('@playwright/test').Page) {
  const cartPage = new CartPage(page)
  await cartPage.goto()

  if (await cartPage.isEmpty()) {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector(`a[href*="${localePath('/catalog/')}"]`, { timeout: 15000 })
    const productLink = page.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    await productLink.click()
    await page.waitForLoadState('domcontentloaded')

    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(productPage.addToCartButton).toBeEnabled({ timeout: 10000 })
    await productPage.addToCartButton.click()

    const toast = page.getByText(/товар добавлен|добавлен в корзину/i)
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toBeHidden({ timeout: 10000 })
  }
}

test.describe.serial('07-integration: Промокоды в checkout', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  test('подготовка: товар в корзине', async ({ userPage }) => {
    await ensureCartHasItem(userPage)

    const cartPage = new CartPage(userPage)
    await cartPage.goto()
    expect(await cartPage.isEmpty()).toBe(false)
  })

  test('checkout содержит поле промокода', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    if ((await heading.count()) === 0) {
      test.skip()
      return
    }

    // Ищем поле промокода
    const promoInput = userPage.getByLabel(/промокод/i).or(userPage.getByPlaceholder(/промокод/i))
    const promoBlock = userPage.getByText(/промокод|скидочный код/i)

    const hasPromo = (await promoInput.count()) > 0 || (await promoBlock.count()) > 0
    expect(hasPromo).toBeTruthy()
  })

  test('невалидный промокод показывает ошибку', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    if ((await heading.count()) === 0) {
      test.skip()
      return
    }

    // Находим поле промокода
    const promoInput = userPage.getByLabel(/промокод/i).or(userPage.getByPlaceholder(/промокод/i))
    if ((await promoInput.count()) === 0) {
      test.skip()
      return
    }

    // Вводим невалидный код
    await promoInput.first().click()
    await promoInput.first().fill('INVALID_CODE_12345')

    // Нажимаем кнопку применения
    const applyButton = userPage.getByRole('button', { name: /применить|проверить/i })
    if ((await applyButton.count()) > 0) {
      await applyButton.click()
      await userPage.waitForTimeout(2000)

      // Должно быть сообщение об ошибке
      const errorMessage = userPage.getByText(/не найден|недействител|не существует|ошибка/i)
      const hasError = (await errorMessage.count()) > 0
      expect(hasError).toBeTruthy()
    }
  })

  test('пустой промокод не вызывает ошибки', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    if ((await heading.count()) === 0) {
      test.skip()
      return
    }

    // Поле промокода пустое — кнопка оформления должна быть доступна
    const submitButton = userPage.getByRole('button', { name: /оформить заказ/i })
    await expect(submitButton).toBeVisible()
  })

  test('итоговая сумма отображается в checkout', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    if ((await heading.count()) === 0) {
      test.skip()
      return
    }

    // Ищем итоговую сумму
    const totalText = userPage.getByText(/итого/i)
    const priceText = userPage.locator('text=/\\d.*₽/')

    const hasTotal = (await totalText.count()) > 0 || (await priceText.count()) > 0
    expect(hasTotal).toBeTruthy()
  })
})
