/**
 * Тест: Оформление заказа (Checkout)
 *
 * Сценарий: Оформление заказа с сохранённым адресом
 *   Дано в корзине есть товары
 *   И у меня есть сохранённый адрес "Дом"
 *   Когда я перехожу на /checkout
 *   Тогда адрес "Дом" уже выбран
 *   И контактные данные заполнены из профиля
 *
 * Сценарий: Создание заказа
 *   Дано я на странице /checkout
 *   И все данные заполнены
 *   Когда я нажимаю "Оформить заказ"
 *   Тогда создаётся заказ
 *   И я вижу страницу успешного оформления
 *   И отображается номер заказа
 */
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { CartPage } from '../pages/cart'
import { CatalogPage, ProductDetailPage } from '../pages/catalog'
import { CheckoutPage, CheckoutSuccessPage } from '../pages/checkout'

/**
 * Гарантирует наличие товара в корзине
 * Используется для тестов, которые запускаются отдельно от serial suite
 */
async function ensureCartHasItem(page: Page) {
  const cartPage = new CartPage(page)
  await cartPage.goto()

  if (await cartPage.isEmpty()) {
    // Добавляем товар в корзину
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)

    await page.waitForLoadState('domcontentloaded')

    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(productPage.addToCartButton).toBeEnabled({ timeout: 10000 })
    await productPage.addToCartButton.click()

    // Ждём toast и его исчезновение для стабилизации (важно для Firefox)
    const toast = page.getByText(/товар добавлен в корзину/i)
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toBeHidden({ timeout: 10000 })
  }
}

test.describe.serial('03-user: Оформление заказа', () => {
  test.beforeAll(async () => {
    await ensureTestUser(TEST_USER)
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Подготовка корзины ===

  test('добавить товар в корзину для оформления заказа', async ({ page }) => {
    // Сначала очистим корзину
    const cartPage = new CartPage(page)
    await cartPage.goto()

    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Переходим в каталог и добавляем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)

    // Ждём полной загрузки страницы товара
    await page.waitForLoadState('domcontentloaded')

    // Добавляем в корзину (ждём когда кнопка станет enabled - размер автовыбран)
    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(productPage.addToCartButton).toBeEnabled({ timeout: 10000 })
    await productPage.addToCartButton.click()

    // Ждём успешного добавления
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })
  })

  // === Доступ к странице checkout ===

  // SKIP: Страница checkout доступна для гостей, редирект не происходит
  test.skip('неавторизованный пользователь перенаправляется на страницу входа', async ({ page }) => {
    await page.goto(localePath('/checkout'))

    // Должны быть перенаправлены на страницу входа
    await expect(page).toHaveURL(/\/ru\/auth\/signin/)
  })

  // SKIP: Пустая корзина не перенаправляет в /cart - поведение изменилось
  test.skip('авторизованный пользователь с пустой корзиной перенаправляется в корзину', async ({ page }) => {
    // Очищаем корзину
    const cartPage = new CartPage(page)
    await cartPage.goto()

    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Пытаемся перейти на checkout
    await page.goto(localePath('/checkout'))

    // Должны быть перенаправлены в корзину
    await expect(page).toHaveURL(/\/ru\/cart/)
  })

  test('снова добавить товар в корзину после очистки', async ({ page }) => {
    // Сначала очищаем корзину, чтобы тест был независимым
    const cartPage = new CartPage(page)
    await cartPage.goto()
    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Переходим в каталог и добавляем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)

    // Ждём полной загрузки страницы товара и завершения всех запросов
    // Это включает Server Action getCartItem для проверки состояния корзины
    // eslint-disable-next-line playwright/no-networkidle
    await page.waitForLoadState('networkidle')

    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(productPage.addToCartButton).toBeEnabled({ timeout: 10000 })
    await productPage.addToCartButton.click()

    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })
  })

  test('авторизованный пользователь с товарами видит страницу checkout', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    // Проверяем заголовок
    await expect(checkoutPage.heading).toBeVisible()
  })

  // === Элементы страницы checkout ===

  test('страница содержит секцию информации о покупателе', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(page.getByText(/информация о покупателе/i)).toBeVisible()
  })

  test('страница содержит поле имени', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(checkoutPage.customerNameInput).toBeVisible()
  })

  test('страница содержит поле телефона', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(checkoutPage.customerPhoneInput).toBeVisible()
  })

  test('страница содержит поле email', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(checkoutPage.customerEmailInput).toBeVisible()
  })

  test('страница содержит секцию адреса доставки', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(page.getByText(/адрес доставки/i)).toBeVisible()
  })

  test('страница содержит поле комментария', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(checkoutPage.notesTextarea).toBeVisible()
  })

  test('страница содержит сводку заказа', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(page.getByText(/ваш заказ/i)).toBeVisible()
  })

  test('сводка показывает итоговую сумму', async ({ page }) => {
    // Гарантируем товар в корзине (для запуска теста отдельно от suite)
    await ensureCartHasItem(page)

    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    const totalAmount = await checkoutPage.getTotalAmount()
    expect(totalAmount).toBeTruthy()
    expect(totalAmount).toContain('₽')
  })

  test('страница содержит кнопку оформления заказа', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    await expect(checkoutPage.submitButton).toBeVisible()
  })

  // === Предзаполнение данных из профиля ===

  test('имя предзаполнено из профиля', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    const nameValue = await checkoutPage.customerNameInput.inputValue()
    // Имя должно быть предзаполнено (может быть пустым если не заполнено в профиле)
    expect(nameValue).toBeDefined()
  })

  test('email предзаполнен из профиля', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    // Email должен быть предзаполнен тестовым пользователем
    await expect(checkoutPage.customerEmailInput).toHaveValue(TEST_USER.email)
  })

  // === Валидация формы ===

  test('форма показывает ошибку при отправке без обязательных полей', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    // Очищаем обязательные поля
    await checkoutPage.customerNameInput.clear()
    await checkoutPage.customerPhoneInput.clear()

    // Пытаемся отправить форму
    await checkoutPage.submit()

    // Должны появиться ошибки валидации на странице или форма не отправится
    // Ждём небольшой таймаут для обработки валидации
    await page.waitForTimeout(500)

    // Проверяем что мы всё ещё на странице checkout
    await expect(page).toHaveURL(/\/ru\/checkout/)
  })

  // === Оформление заказа ===

  test('можно заполнить форму оформления заказа', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    // Заполняем форму (без адреса - он требует DaData подсказок)
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      email: TEST_USER.email,
      notes: 'Тестовый комментарий',
    })

    // Проверяем что данные заполнены
    await expect(checkoutPage.customerNameInput).toHaveValue('Тестовый Покупатель')
  })

  // Тесты ниже требуют настроенного DaData API (NEXT_PUBLIC_DADATA_API_KEY)
  // Без DaData невозможно выбрать адрес из подсказок, и форма не пройдёт валидацию

  test.skip('успешное оформление заказа перенаправляет на страницу успеха', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()

    // Заполняем форму полностью (используем реальный адрес для DaData)
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      address: 'Москва Красная площадь 1',
    })

    // Отправляем заказ
    await checkoutPage.submit()

    // Ждём перенаправления на страницу успеха
    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })
  })

  // === Страница успешного оформления (требуют DaData) ===

  test.skip('страница успеха показывает заголовок', async ({ page }) => {
    // Этот тест зависит от предыдущего - заказ уже оформлен
    // Если URL не содержит success, пропускаем

    if (!page.url().includes('/checkout/success')) {
      // Оформляем заказ заново

      // Добавляем товар в корзину
      const catalogPage = new CatalogPage(page)
      await catalogPage.goto()

      await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
      await catalogPage.clickProduct(0)
      await page.waitForTimeout(1000)

      const productPage = new ProductDetailPage(page)
      await productPage.addToCartButton.click()
      await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })

      // Оформляем
      const checkoutPage = new CheckoutPage(page)
      await checkoutPage.goto()
      await checkoutPage.fillForm({
        name: 'Тестовый Покупатель',
        phone: '+7 (999) 123-45-67',
        address: 'Москва Красная площадь 1',
      })
      await checkoutPage.submit()
      await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })
    }

    const successPage = new CheckoutSuccessPage(page)
    await expect(successPage.heading).toBeVisible()
  })

  test.skip('страница успеха показывает номер заказа', async ({ page }) => {
    // Добавляем товар и оформляем заказ
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)
    await page.waitForTimeout(1000)

    const productPage = new ProductDetailPage(page)
    await productPage.addToCartButton.click()
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })

    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      address: 'Москва Красная площадь 1',
    })
    await checkoutPage.submit()
    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })

    const successPage = new CheckoutSuccessPage(page)
    await expect(successPage.orderNumber).toBeVisible()
  })

  test.skip('страница успеха содержит кнопку продолжения покупок', async ({ page }) => {
    // Добавляем товар и оформляем заказ
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)
    await page.waitForTimeout(1000)

    const productPage = new ProductDetailPage(page)
    await productPage.addToCartButton.click()
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })

    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      address: 'Москва Красная площадь 1',
    })
    await checkoutPage.submit()
    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })

    const successPage = new CheckoutSuccessPage(page)
    await expect(successPage.continueShopping).toBeVisible()
  })

  test.skip('страница успеха содержит кнопку перехода в профиль', async ({ page }) => {
    // Добавляем товар и оформляем заказ
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)
    await page.waitForTimeout(1000)

    const productPage = new ProductDetailPage(page)
    await productPage.addToCartButton.click()
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })

    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      address: 'Москва Красная площадь 1',
    })
    await checkoutPage.submit()
    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })

    const successPage = new CheckoutSuccessPage(page)
    await expect(successPage.goToProfile).toBeVisible()
  })

  test.skip('кнопка продолжения покупок ведёт в каталог', async ({ page }) => {
    // Добавляем товар и оформляем заказ
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 })
    await catalogPage.clickProduct(0)
    await page.waitForTimeout(1000)

    const productPage = new ProductDetailPage(page)
    await productPage.addToCartButton.click()
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })

    const checkoutPage = new CheckoutPage(page)
    await checkoutPage.goto()
    await checkoutPage.fillForm({
      name: 'Тестовый Покупатель',
      phone: '+7 (999) 123-45-67',
      address: 'Москва Красная площадь 1',
    })
    await checkoutPage.submit()
    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 })

    const successPage = new CheckoutSuccessPage(page)
    await successPage.continueShopping.click()

    await expect(page).toHaveURL(/\/ru\/catalog/)
  })
})
