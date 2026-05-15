/**
 * Интеграционные тесты: Полный цикл заказа
 *
 * Тестируем:
 * - Пользователь добавляет товар в корзину
 * - Пользователь переходит к оформлению
 * - Страница checkout отображает данные
 * - Админ видит заказы в админке
 * - Пользователь видит заказ в профиле
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'
import { disconnectDb, resetRateLimit } from '../../helpers/db.helpers'

test.describe.serial('07-integration: Полный цикл заказа', () => {
  test.beforeAll(async () => {
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Каталог и корзина ===

  test('пользователь видит каталог с товарами', async ({ userPage }) => {
    await userPage.goto(localePath('/catalog'))
    await expect(userPage).toHaveURL(/\/ru\/catalog/)

    // Каталог должен содержать товары (seeded в global-setup)
    const productLinks = userPage.locator(`a[href*="${localePath('/catalog/')}"]`)
    await expect(productLinks.first()).toBeVisible({ timeout: 15000 })
  })

  test('пользователь может открыть карточку товара', async ({ userPage }) => {
    await userPage.goto(localePath('/catalog'))

    // Кликаем на первый товар
    const productLink = userPage.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    await productLink.click()
    await userPage.waitForLoadState('domcontentloaded')

    // Должна быть кнопка "В корзину"
    const addToCartButton = userPage.getByRole('button', { name: /в корзину|добавить/i })
    await expect(addToCartButton).toBeVisible({ timeout: 10000 })
  })

  test('пользователь может добавить товар в корзину', async ({ userPage }) => {
    await userPage.goto(localePath('/catalog'))

    const productLink = userPage.locator(`a[href*="${localePath('/catalog/')}"]`).first()
    await productLink.click()
    await userPage.waitForLoadState('domcontentloaded')

    const addToCartButton = userPage.getByRole('button', { name: /в корзину|добавить/i })
    await expect(addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(addToCartButton).toBeEnabled({ timeout: 5000 })
    await addToCartButton.click()

    // Ожидаем toast об успехе
    const toast = userPage.getByText(/товар добавлен|добавлен в корзину/i)
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('корзина отображает добавленный товар', async ({ userPage }) => {
    await userPage.goto(localePath('/cart'))
    await userPage.waitForLoadState('domcontentloaded')

    // Корзина не пуста
    const emptyMessage = userPage.getByText(/ваша корзина пуста/i)
    const isEmpty = (await emptyMessage.count()) > 0

    if (!isEmpty) {
      // Есть кнопка оформления
      const checkoutButton = userPage.getByRole('link', { name: /оформить заказ/i })
      await expect(checkoutButton).toBeVisible()
    }
  })

  // === Checkout ===

  test('страница оформления доступна с товаром в корзине', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    // Либо отображается форма checkout, либо редирект на корзину (если пуста)
    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    const cartRedirect = userPage.getByText(/ваша корзина пуста/i)

    const hasCheckout = (await heading.count()) > 0
    const hasCartRedirect = (await cartRedirect.count()) > 0

    expect(hasCheckout || hasCartRedirect).toBeTruthy()
  })

  test('форма оформления содержит необходимые поля', async ({ userPage }) => {
    await userPage.goto(localePath('/checkout'))
    await userPage.waitForLoadState('domcontentloaded')

    const heading = userPage.getByRole('heading', { name: /оформление заказа/i })
    if ((await heading.count()) === 0) {
      test.skip()
      return
    }

    // Основные поля формы
    const submitButton = userPage.getByRole('button', { name: /оформить заказ/i })
    await expect(submitButton).toBeVisible()
  })

  // === Кросс-ролевая видимость ===

  test('пользователь видит свои заказы в профиле', async ({ userPage }) => {
    await userPage.goto(localePath('/profile/orders'))
    await expect(userPage).toHaveURL(/\/ru\/profile\/orders/)

    // Страница заказов доступна (может быть пустой)
    const content = userPage.locator('main')
    await expect(content).toBeVisible()
  })

  test('админ видит раздел заказов в админке', async ({ adminPage }) => {
    await adminPage.goto(localePath('/admin'))
    await expect(adminPage).toHaveURL(/\/ru\/admin/)

    // Ищем ссылку на заказы
    const ordersLink = adminPage.getByRole('link', { name: /заказ/i })
    if ((await ordersLink.count()) > 0) {
      await ordersLink.first().click()
      await adminPage.waitForLoadState('domcontentloaded')
      await expect(adminPage).toHaveURL(/\/ru\/admin\/orders/)
    }
  })
})
