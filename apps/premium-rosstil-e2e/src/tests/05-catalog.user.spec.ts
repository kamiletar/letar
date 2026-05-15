/**
 * Тест: Каталог товаров
 *
 * Сценарий: Просмотр каталога
 *   Дано в БД есть товары
 *   Когда я перехожу на /catalog
 *   Тогда я вижу карточки товаров
 *   И каждая карточка показывает название, цену, изображение
 *
 * Сценарий: Просмотр детальной страницы товара
 *   Когда я кликаю на карточку товара
 *   Тогда открывается страница /catalog/[id]
 *   И я вижу галерею изображений
 *   И я вижу селектор цвета
 *   И я вижу селектор размера
 *   И я вижу кнопку "В корзину"
 */
import { expect, test } from '@playwright/test'
import { disconnectDb } from '../helpers/db.helpers'
import { CatalogPage, ProductDetailPage } from '../pages/catalog'

test.describe.serial('03-user: Каталог товаров', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Страница каталога ===

  test('страница каталога открывается', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    // Ждём загрузки страницы
    await page.waitForLoadState('domcontentloaded')

    // Проверяем заголовок с увеличенным таймаутом
    await expect(catalogPage.heading).toBeVisible({ timeout: 15000 })
  })

  test('на странице каталога отображаются карточки товаров', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    // Ждём загрузки товаров (они могут загружаться асинхронно)
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Проверяем что есть хотя бы один товар
    const count = await catalogPage.getProductCount()
    expect(count).toBeGreaterThan(0)
  })

  test('карточка товара содержит название', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Проверяем первую карточку
    const info = await catalogPage.getProductInfo(0)
    expect(info.name).toBeTruthy()
  })

  test('карточка товара содержит цену', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Проверяем первую карточку
    const info = await catalogPage.getProductInfo(0)
    expect(info.price).toBeTruthy()
    expect(info.price).toContain('₽')
  })

  test('карточка товара содержит изображение или плейсхолдер', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Проверяем первую карточку - должно быть либо изображение, либо плейсхолдер "Нет изображения"
    const firstCard = catalogPage.productCards.first()
    const hasImage = (await firstCard.locator('img').count()) > 0
    const hasPlaceholder = (await firstCard.getByText(/нет изображения/i).count()) > 0

    // Должно быть одно из двух
    expect(hasImage || hasPlaceholder).toBeTruthy()
  })

  // === Страница детального просмотра товара ===

  test('клик на карточку товара открывает детальную страницу', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем что URL изменился на /catalog/[id]
    await expect(page).toHaveURL(/\/catalog\/[^/]+/)
  })

  test('детальная страница товара отображает название', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Получаем название товара из каталога
    const info = await catalogPage.getProductInfo(0)
    const expectedName = info.name

    // Кликаем на товар
    await catalogPage.clickProduct(0)

    // Проверяем название на детальной странице
    const productPage = new ProductDetailPage(page)
    await expect(productPage.productTitle).toBeVisible()

    const actualName = await productPage.getProductName()
    expect(actualName).toBeTruthy()

    if (expectedName) {
      expect(actualName).toBe(expectedName)
    }
  })

  test('детальная страница товара отображает секцию изображений', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие секции изображений (может быть плейсхолдер "Нет изображений")
    const productPage = new ProductDetailPage(page)
    await expect(productPage.productImages).toBeVisible()

    // Проверяем что есть либо изображения, либо плейсхолдер
    const hasImages = await productPage.hasImages()
    const hasPlaceholder = (await productPage.productImages.getByText(/нет изображений/i).count()) > 0

    expect(hasImages || hasPlaceholder).toBeTruthy()
  })

  test('детальная страница товара отображает цену', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем отображение цены
    const productPage = new ProductDetailPage(page)
    await expect(productPage.productPrice).toBeVisible()

    const price = await productPage.getProductPrice()
    expect(price).toContain('₽')
  })

  test('детальная страница товара содержит ссылку для возврата в каталог', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем ссылку на каталог
    const productPage = new ProductDetailPage(page)
    await expect(productPage.backToCatalogLink).toBeVisible()
    await expect(productPage.backToCatalogLink).toHaveAttribute('href', /\/catalog\/?$/)
  })

  test('ссылка "Вернуться к каталогу" работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Кликаем на ссылку возврата
    const productPage = new ProductDetailPage(page)
    await productPage.backToCatalogLink.click()

    // Проверяем что вернулись в каталог
    await expect(page).toHaveURL(/\/catalog\/?$/)
    await expect(catalogPage.heading).toBeVisible()
  })

  test('на странице товара отображается секция цвета/варианта', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие секции "Цвет"
    await expect(page.getByText(/цвет/i).first()).toBeVisible()
  })

  test('на странице товара отображается секция размера', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие секции "Размер"
    await expect(page.getByText('Размер').first()).toBeVisible()
  })

  test('на странице товара отображается секция состава', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие секции "Состав"
    await expect(page.getByText(/состав/i).first()).toBeVisible()
  })

  test('на странице товара отображается кнопка размерной сетки', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие кнопки размерной сетки
    const productPage = new ProductDetailPage(page)
    await expect(productPage.sizeChartButton).toBeVisible()
  })

  test('кнопка размерной сетки открывает диалог', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Кликаем на кнопку размерной сетки
    const productPage = new ProductDetailPage(page)
    await productPage.sizeChartButton.click()

    // Проверяем что диалог открылся - заголовок "Женские размеры" или "Мужские размеры"
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/женские размеры|мужские размеры/i)).toBeVisible()
  })

  test('на странице товара есть кнопка избранного', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    // Проверяем наличие кнопки избранного
    const productPage = new ProductDetailPage(page)
    await expect(productPage.wishlistButton).toBeVisible()
  })

  // === Галерея изображений - навигация ===

  test('галерея с несколькими изображениями имеет стрелки навигации', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    const productPage = new ProductDetailPage(page)

    // Ждём загрузки изображений
    await expect(productPage.productImages).toBeVisible()

    // Проверяем есть ли миниатюры (= несколько изображений)
    const thumbnailsCount = await productPage.getThumbnailsCount()

    if (thumbnailsCount > 1) {
      // Если несколько изображений - должны быть стрелки
      const hasNavigation = await productPage.hasGalleryNavigation()
      expect(hasNavigation).toBeTruthy()
    } else {
      // Если только одно изображение - стрелок быть не должно
      const hasNavigation = await productPage.hasGalleryNavigation()
      expect(hasNavigation).toBeFalsy()
    }
  })

  test('клик на правую стрелку меняет изображение в галерее', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    const productPage = new ProductDetailPage(page)

    // Ждём загрузки изображений
    await expect(productPage.productImages).toBeVisible()

    // Проверяем есть ли несколько изображений
    const thumbnailsCount = await productPage.getThumbnailsCount()

    if (thumbnailsCount > 1) {
      // Запоминаем src первого изображения
      const initialSrc = await productPage.getMainImageSrc()

      // Кликаем на стрелку "Следующее фото"
      await productPage.clickNextImage()

      // Ждём изменения изображения
      await page.waitForTimeout(500) // Даём время на смену изображения

      // Получаем новый src
      const newSrc = await productPage.getMainImageSrc()

      // src должен измениться
      expect(newSrc).not.toBe(initialSrc)
    }
  })

  test('клик на левую стрелку меняет изображение в галерее', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    const productPage = new ProductDetailPage(page)

    // Ждём загрузки изображений
    await expect(productPage.productImages).toBeVisible()

    // Проверяем есть ли несколько изображений
    const thumbnailsCount = await productPage.getThumbnailsCount()

    if (thumbnailsCount > 1) {
      // Запоминаем src первого изображения
      const initialSrc = await productPage.getMainImageSrc()

      // Кликаем на стрелку "Предыдущее фото" (должно перейти к последнему изображению - циклически)
      await productPage.clickPrevImage()

      // Ждём изменения изображения
      await page.waitForTimeout(500)

      // Получаем новый src
      const newSrc = await productPage.getMainImageSrc()

      // src должен измениться
      expect(newSrc).not.toBe(initialSrc)
    }
  })

  test('галерея работает циклически: после последнего идёт первое изображение', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Кликаем на первый товар
    await catalogPage.clickProduct(0)

    const productPage = new ProductDetailPage(page)

    // Ждём загрузки изображений
    await expect(productPage.productImages).toBeVisible()

    // Проверяем есть ли несколько изображений
    const thumbnailsCount = await productPage.getThumbnailsCount()

    if (thumbnailsCount > 1) {
      // Запоминаем src первого изображения
      const initialSrc = await productPage.getMainImageSrc()

      // Кликаем на стрелку "Следующее фото" столько раз, сколько есть изображений
      for (let i = 0; i < thumbnailsCount; i++) {
        await productPage.clickNextImage()
        await page.waitForTimeout(300)
      }

      // После полного круга должны вернуться к первому изображению
      const finalSrc = await productPage.getMainImageSrc()
      expect(finalSrc).toBe(initialSrc)
    }
  })
})
