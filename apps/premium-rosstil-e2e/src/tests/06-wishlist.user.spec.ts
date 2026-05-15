/**
 * Тест: Избранное
 *
 * Сценарий: Добавление товара в избранное
 *   Дано я на странице товара
 *   Когда я нажимаю кнопку "В избранное" (сердечко)
 *   Тогда товар добавляется в избранное
 *   И иконка сердечка становится заполненной
 *
 * Сценарий: Просмотр избранного
 *   Дано у меня есть товары в избранном
 *   Когда я перехожу на /profile/wishlist
 *   Тогда я вижу список избранных товаров
 *   И каждый товар показывает: название, цену, изображение
 *
 * Сценарий: Удаление из избранного
 *   Когда я нажимаю кнопку удаления на товаре
 *   Тогда товар исчезает из избранного
 */
import { expect, test } from '@playwright/test'

import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { CatalogPage, ProductDetailPage } from '../pages/catalog'
import { WishlistPage } from '../pages/wishlist'

test.describe.serial('03-user: Избранное', () => {
  test.beforeAll(async () => {
    await ensureTestUser(TEST_USER)
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Доступ к странице избранного ===
  // Тест на неавторизованного пользователя находится в 02-protected-redirects.guest.spec.ts

  test('авторизованный пользователь видит страницу избранного', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    // Проверяем заголовок
    await expect(wishlistPage.heading).toBeVisible()
  })

  // === Добавление в избранное ===

  test('на странице товара есть кнопка добавления в избранное', async ({ page }) => {
    // Переходим в каталог и открываем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    await catalogPage.clickProduct(0)

    // Ждём полную загрузку страницы товара
    await page.waitForLoadState('domcontentloaded')

    // Проверяем наличие кнопки избранного
    const productPage = new ProductDetailPage(page)
    await expect(productPage.wishlistButton).toBeVisible({ timeout: 10000 })
  })

  test('клик на кнопку избранного добавляет товар в избранное', async ({ page }) => {
    // Сначала очистим избранное если есть товары
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    while ((await wishlistPage.getItemCount()) > 0) {
      await wishlistPage.removeItem(0)
      // Ждём обновления страницы
      await page.waitForTimeout(500)
    }

    // Переходим в каталог и открываем товар
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
    await catalogPage.clickProduct(0)

    // Добавляем в избранное
    const productPage = new ProductDetailPage(page)
    await productPage.wishlistButton.click()

    // Ждём успешного добавления - aria-label меняется на "Удалить из избранного"
    await expect(productPage.wishlistButton).toHaveAttribute('aria-label', /удалить из избранного/i, { timeout: 5000 })
  })

  test('после добавления товар отображается в списке избранного', async ({ page }) => {
    // Переходим в избранное
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    // Должен быть хотя бы один товар
    const count = await wishlistPage.getItemCount()
    expect(count).toBeGreaterThan(0)
  })

  // === Просмотр избранного ===

  test('карточка товара в избранном содержит название', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const info = await wishlistPage.getItemInfo(0)

      expect(info.name).toBeTruthy()
    }
  })

  test('карточка товара в избранном содержит цвет', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const info = await wishlistPage.getItemInfo(0)

      expect(info.color).toContain('Цвет')
    }
  })

  test('карточка товара в избранном содержит цену', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const info = await wishlistPage.getItemInfo(0)

      expect(info.price).toBeTruthy()

      expect(info.price).toContain('₽')
    }
  })

  test('карточка товара в избранном содержит изображение или плейсхолдер', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const card = wishlistPage.getItemCard(0)
      const hasImage = (await card.locator('img').count()) > 0
      const hasPlaceholder = (await card.getByText(/нет изображения/i).count()) > 0

      expect(hasImage || hasPlaceholder).toBeTruthy()
    }
  })

  test('клик на карточку товара переходит на страницу товара', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      await wishlistPage.clickItemCard(0)

      // Должны перейти на страницу товара (с или без /ru/ префикса)
      await expect(page).toHaveURL(/\/catalog\//)
    }
  })

  // === Удаление из избранного ===

  test('на карточке товара есть кнопка удаления', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const card = wishlistPage.getItemCard(0)
      const removeButton = card.getByLabel(/удалить из избранного/i)

      await expect(removeButton).toBeVisible()
    }
  })

  test('клик на кнопку удаления удаляет товар из избранного', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    if ((await wishlistPage.getItemCount()) > 0) {
      const countBefore = await wishlistPage.getItemCount()

      // Удаляем первый товар
      await wishlistPage.removeItem(0)

      // Ждём обновления - появится toast "Удалено из избранного"
      await expect(page.getByText(/удалено из избранного/i)).toBeVisible({ timeout: 5000 })

      // Проверяем что количество уменьшилось или список пуст

      await expect(async () => {
        const countAfter = await wishlistPage.getItemCount()
        expect(countAfter).toBeLessThan(countBefore)
      }).toPass({ timeout: 5000 })
    }
  })

  // === Пустое состояние ===

  test('пустое избранное показывает сообщение и ссылку на каталог', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    // Удаляем все товары если есть

    while ((await wishlistPage.getItemCount()) > 0) {
      await wishlistPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Проверяем пустое состояние
    await expect(wishlistPage.emptyStateMessage).toBeVisible()
    await expect(wishlistPage.catalogLink).toBeVisible()
  })

  test('ссылка на каталог из пустого избранного работает', async ({ page }) => {
    const wishlistPage = new WishlistPage(page)
    await wishlistPage.goto()

    // Удаляем все товары если есть

    while ((await wishlistPage.getItemCount()) > 0) {
      await wishlistPage.removeItem(0)
      await page.waitForTimeout(500)
    }

    // Кликаем на ссылку каталога
    await wishlistPage.catalogLink.click()

    // Должны перейти в каталог
    await expect(page).toHaveURL(/\/ru\/catalog/)
  })
})
