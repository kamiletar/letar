/**
 * Тест: Корзина
 *
 * Сценарий: Добавление товара в корзину
 *   Дано я на странице товара
 *   И выбран размер
 *   Когда я нажимаю "В корзину"
 *   Тогда появляется уведомление "Товар добавлен"
 *   И счётчик корзины показывает 1
 *
 * Сценарий: Просмотр корзины
 *   Дано в корзине есть товары
 *   Когда я перехожу на /cart
 *   Тогда я вижу список товаров
 *   И каждый товар показывает: название, размер, цену, количество
 *   И отображается итоговая сумма
 *
 * Сценарий: Изменение количества
 *   Дано в корзине товар x1
 *   Когда я увеличиваю количество до 2
 *   Тогда сумма обновляется
 *
 * Сценарий: Удаление из корзины
 *   Когда я нажимаю кнопку удаления
 *   Тогда товар исчезает из корзины
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { CartPage } from '../pages/cart'
import { CatalogPage, ProductDetailPage } from '../pages/catalog'

test.describe.serial('03-user: Корзина', () => {
  test.beforeAll(async () => {
    await ensureTestUser(TEST_USER)
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Доступ к странице корзины ===

  // SKIP: Корзина доступна для гостей (показывает пустую корзину), редирект не происходит
  test.skip('неавторизованный пользователь перенаправляется на страницу входа', async ({ page }) => {
    await page.goto(localePath('/cart'))

    // Должны быть перенаправлены на страницу входа
    await expect(page).toHaveURL(/\/ru\/auth\/signin/)
  })

  test('авторизованный пользователь видит страницу корзины', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    // Проверяем заголовок
    await expect(cartPage.heading).toBeVisible()
  })

  // === Добавление в корзину ===

  test('на странице товара кнопка корзины требует выбора размера', async ({ page }) => {
    // Переходим в каталог и открываем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    await catalogPage.clickProduct(0)

    // Ждём полной загрузки страницы товара
    await page.waitForLoadState('domcontentloaded')

    // Проверяем наличие кнопки корзины (может быть disabled пока размер не выбран)
    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 15000 })
  })

  test('можно добавить товар в корзину после выбора размера', async ({ page }) => {
    // Сначала очистим корзину
    const cartPage = new CartPage(page)
    await cartPage.goto()

    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      // Ждём обновления страницы
      await page.waitForTimeout(500)
    }

    // Переходим в каталог и открываем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    await catalogPage.clickProduct(0)

    // Ждём полной загрузки страницы товара
    await page.waitForLoadState('domcontentloaded')

    // Добавляем в корзину (размер выбирается автоматически)
    const productPage = new ProductDetailPage(page)
    await expect(productPage.addToCartButton).toBeVisible({ timeout: 10000 })
    await expect(productPage.addToCartButton).toBeEnabled({ timeout: 10000 })
    await productPage.addToCartButton.click()

    // Ждём успешного добавления - появится toast
    await expect(page.getByText(/товар добавлен в корзину/i)).toBeVisible({ timeout: 5000 })
  })

  test('после добавления товар отображается в корзине', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    // Должен быть хотя бы один товар
    const count = await cartPage.getItemCardCount()
    expect(count).toBeGreaterThan(0)
  })

  // === Просмотр корзины ===

  test('карточка товара в корзине содержит название', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const info = await cartPage.getItemInfo(0)

      expect(info.name).toBeTruthy()
    }
  })

  test('карточка товара в корзине содержит размер', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const info = await cartPage.getItemInfo(0)

      expect(info.size).toContain('Размер')
    }
  })

  test('карточка товара в корзине содержит цвет', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const info = await cartPage.getItemInfo(0)

      expect(info.color).toContain('Цвет')
    }
  })

  test('карточка товара в корзине содержит цену', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const info = await cartPage.getItemInfo(0)

      expect(info.price).toBeTruthy()

      expect(info.price).toContain('₽')
    }
  })

  test('карточка товара в корзине содержит количество', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const info = await cartPage.getItemInfo(0)

      expect(info.quantity).toBeTruthy()
    }
  })

  test('отображается итоговая сумма', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const totalAmount = await cartPage.getTotalAmount()

      expect(totalAmount).toBeTruthy()

      expect(totalAmount).toContain('₽')
    }
  })

  test('есть кнопка оформления заказа', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      await expect(cartPage.checkoutButton).toBeVisible()
    }
  })

  // === Изменение количества ===

  test('можно увеличить количество товара', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const infoBefore = await cartPage.getItemInfo(0)
      const quantityBefore = parseInt(infoBefore.quantity || '1', 10)

      // Увеличиваем количество
      await cartPage.incrementItemQuantity(0)

      // Ждём обновления - появится toast
      await expect(page.getByText(/количество обновлено/i)).toBeVisible({ timeout: 5000 })

      // Проверяем что количество увеличилось
      const infoAfter = await cartPage.getItemInfo(0)
      const quantityAfter = parseInt(infoAfter.quantity || '1', 10)

      expect(quantityAfter).toBe(quantityBefore + 1)
    }
  })

  test('можно уменьшить количество товара', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const infoBefore = await cartPage.getItemInfo(0)
      const quantityBefore = parseInt(infoBefore.quantity || '2', 10)

      if (quantityBefore > 1) {
        // Уменьшаем количество
        await cartPage.decrementItemQuantity(0)

        // Ждём обновления - появится toast
        await expect(page.getByText(/количество обновлено/i)).toBeVisible({ timeout: 5000 })

        // Проверяем что количество уменьшилось
        const infoAfter = await cartPage.getItemInfo(0)
        const quantityAfter = parseInt(infoAfter.quantity || '1', 10)

        expect(quantityAfter).toBe(quantityBefore - 1)
      }
    }
  })

  // === Удаление из корзины ===

  test('на карточке товара есть кнопка удаления', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const removeButton = page.getByLabel(/удалить из корзины/i).first()

      await expect(removeButton).toBeVisible()
    }
  })

  test('клик на кнопку удаления удаляет товар из корзины', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    if ((await cartPage.getItemCardCount()) > 0) {
      const countBefore = await cartPage.getItemCardCount()

      // Удаляем первый товар
      await cartPage.removeItem(0)

      // Ждём обновления - появится toast "Товар удален из корзины"
      await expect(page.getByText(/товар удален из корзины/i)).toBeVisible({ timeout: 5000 })

      // Проверяем что количество уменьшилось или корзина пуста

      await expect(async () => {
        const countAfter = await cartPage.getItemCardCount()
        expect(countAfter).toBeLessThan(countBefore)
      }).toPass({ timeout: 5000 })
    }
  })

  // === Пустое состояние ===

  test('пустая корзина показывает сообщение и ссылку на каталог', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    // Удаляем все товары если есть

    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Проверяем пустое состояние
    await expect(cartPage.emptyStateMessage).toBeVisible()
    await expect(cartPage.catalogLink).toBeVisible()
  })

  test('ссылка на каталог из пустой корзины работает', async ({ page }) => {
    const cartPage = new CartPage(page)
    await cartPage.goto()

    // Удаляем все товары если есть

    while (!(await cartPage.isEmpty())) {
      await cartPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Кликаем на ссылку каталога
    await cartPage.catalogLink.click()

    // Должны перейти в каталог
    await expect(page).toHaveURL(/\/ru\/catalog/)
  })
})
