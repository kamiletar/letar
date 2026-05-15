/**
 * Page Objects для страниц каталога
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы каталога /catalog
 */
export class CatalogPage {
  readonly page: Page
  readonly url = localePath('/catalog')

  // Основные элементы
  readonly heading: Locator
  readonly productsList: Locator
  readonly productCards: Locator

  // Фильтры
  readonly filtersSection: Locator
  readonly categoryFilter: Locator
  readonly genderFilter: Locator
  readonly newCollectionFilter: Locator
  readonly sortFilter: Locator

  // Пагинация
  readonly pagination: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок каталога
    this.heading = page.getByRole('heading', { name: /каталог/i })

    // Список товаров
    this.productsList = page.locator('[data-testid="product-card"]').locator('..')
    this.productCards = page.locator('[data-testid="product-card"]')

    // Фильтры
    this.filtersSection = page.locator('[data-testid="catalog-filters"]')
    this.categoryFilter = page.locator('[data-testid="filter-category"]')
    this.genderFilter = page.locator('[data-testid="filter-gender"]')
    this.newCollectionFilter = page.locator('[data-testid="filter-new-collection"]')
    this.sortFilter = page.locator('[data-testid="filter-sort"]')

    // Пагинация
    this.pagination = page.locator('[data-testid="catalog-pagination"]')
    this.prevPageButton = page.locator('[data-testid="pagination-prev"]')
    this.nextPageButton = page.locator('[data-testid="pagination-next"]')
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Перейти на каталог с параметрами фильтра
   */
  async gotoWithFilters(params: {
    category?: string
    gender?: string
    newCollection?: boolean
    sort?: string
    page?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params.category) {
      searchParams.set('category', params.category)
    }
    if (params.gender) {
      searchParams.set('gender', params.gender)
    }
    if (params.newCollection !== undefined) {
      searchParams.set('newCollection', params.newCollection ? 'true' : 'false')
    }
    if (params.sort) {
      searchParams.set('sort', params.sort)
    }
    if (params.page) {
      searchParams.set('page', String(params.page))
    }

    const query = searchParams.toString()
    await this.page.goto(query ? `${this.url}?${query}` : this.url)
  }

  /**
   * Получить количество товаров на странице
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count()
  }

  /**
   * Кликнуть на карточку товара по индексу
   * Ожидает завершения навигации на страницу товара
   * ВАЖНО: Кликаем на заголовок внутри карточки, чтобы не попасть на кнопку "Добавить в избранное"
   */
  async clickProduct(index: number) {
    const card = this.productCards.nth(index)
    // Кликаем на заголовок товара, чтобы не попасть на кнопку избранного
    const heading = card.getByRole('heading')
    await heading.click()
    // Ждём загрузки страницы товара
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Кликнуть на карточку товара по имени
   */
  async clickProductByName(name: string | RegExp) {
    const card = this.productCards.filter({ has: this.page.getByRole('heading', { name }) })
    await card.click()
  }

  /**
   * Получить информацию о карточке товара
   */
  async getProductInfo(index: number): Promise<{ name: string | null; price: string | null; hasImage: boolean }> {
    const card = this.productCards.nth(index)
    const heading = card.getByRole('heading')
    const name = await heading.textContent()

    // Цена может быть диапазоном или одним значением
    const priceText = card.locator('text=/₽/')
    const price = (await priceText.count()) > 0 ? await priceText.first().textContent() : null

    // Проверяем наличие изображения
    const image = card.locator('img')
    const hasImage = (await image.count()) > 0

    return { name, price, hasImage }
  }
}

/**
 * Page Object для страницы детального просмотра товара /catalog/[id]
 */
export class ProductDetailPage {
  readonly page: Page

  // Навигация
  readonly backToCatalogLink: Locator

  // Основные элементы
  readonly productTitle: Locator
  readonly productDescription: Locator
  readonly productPrice: Locator
  readonly productImages: Locator

  // Селекторы
  readonly variantSelector: Locator
  readonly sizeSelector: Locator

  // Кнопки действий
  readonly addToCartButton: Locator
  readonly wishlistButton: Locator
  readonly sizeChartButton: Locator
  readonly customOrderButton: Locator

  // Состав
  readonly compositionSection: Locator

  // Галерея изображений - навигация
  readonly galleryPrevButton: Locator
  readonly galleryNextButton: Locator
  readonly galleryMainImage: Locator
  readonly galleryThumbnails: Locator
  readonly galleryLoadingSpinner: Locator

  constructor(page: Page) {
    this.page = page

    // Навигация
    this.backToCatalogLink = page.locator('a', { hasText: /вернуться к каталогу/i })

    // Основные элементы
    this.productTitle = page.locator('[data-testid="product-title"]')
    this.productDescription = page.locator('[data-testid="product-description"]')
    this.productPrice = page.locator('[data-testid="product-price"]')
    this.productImages = page.locator('[data-testid="product-images"]')

    // Селекторы вариантов и размеров
    this.variantSelector = page.getByText(/цвет/i).locator('..').locator('[data-part="item"]')
    this.sizeSelector = page
      .getByText(/размер/i, { exact: false })
      .locator('..')
      .locator('button')

    // Кнопки действий
    // Корзина - IconButton с aria-label "Добавить в корзину"
    this.addToCartButton = page.getByLabel(/добавить в корзину/i)
    this.wishlistButton = page.locator('[data-testid="wishlist-button"]')
    this.sizeChartButton = page.getByRole('button', { name: /таблица размеров/i })
    this.customOrderButton = page.getByRole('button', { name: /индивидуальный заказ/i })

    // Состав
    this.compositionSection = page.locator('[data-testid="product-description"]')

    // Галерея изображений - навигация
    this.galleryPrevButton = page.getByLabel(/предыдущее фото/i)
    this.galleryNextButton = page.getByLabel(/следующее фото/i)
    this.galleryMainImage = this.productImages.locator('img').first()
    this.galleryThumbnails = this.productImages.locator('[style*="aspect-ratio"]').locator('img')
    this.galleryLoadingSpinner = this.productImages.locator('[data-part="spinner"]')
  }

  /**
   * Перейти на страницу товара по ID
   */
  async goto(productId: string) {
    await this.page.goto(localePath(`/catalog/${productId}`))
  }

  /**
   * Получить название товара
   */
  async getProductName(): Promise<string> {
    const text = await this.productTitle.textContent()
    return text?.trim() || ''
  }

  /**
   * Получить цену товара
   */
  async getProductPrice(): Promise<string> {
    const priceElement = this.productPrice.locator('text=/₽/')
    const text = await priceElement.first().textContent()
    return text?.trim() || ''
  }

  /**
   * Выбрать вариант (цвет) по индексу
   */
  async selectVariant(index: number) {
    const variants = this.page.locator('[data-part="item"]').filter({ has: this.page.locator('img') })
    await variants.nth(index).click()
  }

  /**
   * Выбрать размер по тексту
   */
  async selectSize(size: string) {
    // Размеры - это кнопки внутри секции "Размер"
    const sizeButton = this.page.locator('button', { hasText: new RegExp(`^${size}$`, 'i') })
    await sizeButton.click()
  }

  /**
   * Кликнуть на изображение в галерее
   */
  async clickImage(index: number) {
    const images = this.productImages.locator('img')
    await images.nth(index).click()
  }

  /**
   * Проверить, есть ли изображения
   */
  async hasImages(): Promise<boolean> {
    const images = this.productImages.locator('img')
    return (await images.count()) > 0
  }

  /**
   * Получить количество миниатюр (= количество изображений)
   */
  async getThumbnailsCount(): Promise<number> {
    return await this.galleryThumbnails.count()
  }

  /**
   * Получить src основного изображения
   */
  async getMainImageSrc(): Promise<string | null> {
    return await this.galleryMainImage.getAttribute('src')
  }

  /**
   * Кликнуть на стрелку "Следующее фото"
   */
  async clickNextImage() {
    await this.galleryNextButton.click()
  }

  /**
   * Кликнуть на стрелку "Предыдущее фото"
   */
  async clickPrevImage() {
    await this.galleryPrevButton.click()
  }

  /**
   * Кликнуть на миниатюру по индексу
   */
  async clickThumbnail(index: number) {
    await this.galleryThumbnails.nth(index).click()
  }

  /**
   * Проверить, есть ли стрелки навигации
   */
  async hasGalleryNavigation(): Promise<boolean> {
    const prevCount = await this.galleryPrevButton.count()
    const nextCount = await this.galleryNextButton.count()
    return prevCount > 0 && nextCount > 0
  }
}
