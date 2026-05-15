/**
 * Page Objects для страницы избранного
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы избранного /profile/wishlist
 */
export class WishlistPage {
  readonly page: Page
  readonly url = localePath('/profile/wishlist')

  // Основные элементы
  readonly heading: Locator
  readonly itemCards: Locator
  readonly emptyStateMessage: Locator
  readonly catalogLink: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /избранное/i })

    // Карточки товаров в избранном
    this.itemCards = page.locator('[data-testid="wishlist-item-card"]')

    // Пустое состояние
    this.emptyStateMessage = page.getByText(/у вас пока нет избранных товаров/i)

    // Ссылка на каталог из пустого состояния (не из навигации)
    // Учитываем trailing slash
    this.catalogLink = page
      .locator(`a[href^="${localePath('/catalog')}"]`)
      .filter({ hasText: /каталог/i })
      .last()
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить количество товаров в избранном
   */
  async getItemCount(): Promise<number> {
    return await this.itemCards.count()
  }

  /**
   * Получить карточку товара по индексу
   */
  getItemCard(index: number): Locator {
    return this.itemCards.nth(index)
  }

  /**
   * Получить информацию о товаре в избранном
   */
  async getItemInfo(index: number): Promise<{
    name: string | null
    color: string | null
    price: string | null
    hasImage: boolean
  }> {
    const card = this.itemCards.nth(index)

    // Название товара
    const heading = card.getByRole('heading')
    const name = await heading.textContent()

    // Цвет
    const colorText = card.getByText(/цвет:/i)
    const color = (await colorText.count()) > 0 ? await colorText.textContent() : null

    // Цена
    const priceText = card.locator('text=/₽/')
    const price = (await priceText.count()) > 0 ? await priceText.first().textContent() : null

    // Изображение
    const image = card.locator('img')
    const hasImage = (await image.count()) > 0

    return { name: name?.trim() || null, color, price, hasImage }
  }

  /**
   * Кликнуть на карточку товара для перехода в каталог
   */
  async clickItemCard(index: number) {
    const card = this.itemCards.nth(index)
    // Кликаем на заголовок внутри ссылки
    await card.getByRole('heading').click()
  }

  /**
   * Удалить товар из избранного по индексу
   */
  async removeItem(index: number) {
    const card = this.itemCards.nth(index)
    const removeButton = card.getByLabel(/удалить из избранного/i)
    await removeButton.click()
  }

  /**
   * Проверить, пуст ли список избранного
   */
  async isEmpty(): Promise<boolean> {
    return (await this.emptyStateMessage.count()) > 0
  }
}
