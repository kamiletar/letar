/**
 * Page Objects для страницы корзины
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы корзины /cart
 */
export class CartPage {
  readonly page: Page
  readonly url = localePath('/cart')

  // Основные элементы
  readonly heading: Locator
  readonly itemCards: Locator
  readonly emptyStateMessage: Locator
  readonly catalogLink: Locator

  // Итоговая секция
  readonly summarySection: Locator
  readonly totalItemsCount: Locator
  readonly totalAmount: Locator
  readonly checkoutButton: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /корзина/i })

    // Карточки товаров в корзине
    this.itemCards = page.locator('[data-testid="cart-item-card"]')

    // Пустое состояние
    this.emptyStateMessage = page.getByText(/ваша корзина пуста/i)

    // Ссылка на каталог из пустого состояния
    // Учитываем trailing slash
    this.catalogLink = page
      .locator(`a[href^="${localePath('/catalog')}"]`)
      .filter({ hasText: /каталог/i })
      .last()

    // Итоговая секция (по тексту "Итого")
    this.summarySection = page.getByText(/^итого$/i).locator('..')

    // Количество товаров (текст "X товар/а/ов")
    this.totalItemsCount = page.getByText(/товар/)

    // Общая сумма
    this.totalAmount = page
      .getByText(/общая сумма/i)
      .locator('..')
      .locator('text=/₽/')

    // Кнопка оформления заказа
    this.checkoutButton = page.getByRole('link', { name: /оформить заказ/i })
  }

  async goto() {
    await this.page.goto(this.url)
    // Ждём загрузки DOM
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Получить количество карточек товаров в корзине
   */
  async getItemCardCount(): Promise<number> {
    // Количество кнопок удаления = количество товаров
    const removeButtons = this.page.getByLabel(/удалить из корзины/i)
    return await removeButtons.count()
  }

  /**
   * Получить информацию о товаре в корзине по индексу
   * Находим карточку через ссылку на товар
   */
  async getItemInfo(_index: number): Promise<{
    name: string | null
    size: string | null
    color: string | null
    quantity: string | null
    price: string | null
  }> {
    // Ждём загрузки контента

    await this.page.waitForSelector('[aria-label="Удалить из корзины"]', { timeout: 5000 })

    // Название - ссылка внутри Link компонента
    // В cart-item-card название находится после изображения
    const nameLinks = this.page.locator('.chakra-link').filter({ hasText: /.+/ })
    const nameText = await nameLinks.first().textContent()

    // Размер - текст "Размер: ..."
    const sizeText = this.page.getByText(/размер:/i).first()
    const size = (await sizeText.count()) > 0 ? await sizeText.textContent() : null

    // Цвет - текст "Цвет: ..."
    const colorText = this.page.getByText(/цвет:/i).first()
    const color = (await colorText.count()) > 0 ? await colorText.textContent() : null

    // Количество - Input компонент
    const quantityInput = this.page.locator('input').first()
    const quantity = (await quantityInput.count()) > 0 ? await quantityInput.inputValue() : null

    // Цена - текст "12 000,00 ₽"
    const priceText = this.page.locator('text=/\\d.*₽/').first()
    const price = (await priceText.count()) > 0 ? await priceText.textContent() : null

    return { name: nameText?.trim() || null, size, color, quantity, price }
  }

  /**
   * Увеличить количество товара
   */
  async incrementItemQuantity(index: number) {
    const incrementButtons = this.page.locator('[data-part="increment-trigger"]')
    await incrementButtons.nth(index).click()
  }

  /**
   * Уменьшить количество товара
   */
  async decrementItemQuantity(index: number) {
    const decrementButtons = this.page.locator('[data-part="decrement-trigger"]')
    await decrementButtons.nth(index).click()
  }

  /**
   * Удалить товар из корзины
   */
  async removeItem(index: number) {
    const removeButtons = this.page.getByLabel(/удалить из корзины/i)
    await removeButtons.nth(index).click()
  }

  /**
   * Проверить, пуста ли корзина
   */
  async isEmpty(): Promise<boolean> {
    return (await this.emptyStateMessage.count()) > 0
  }

  /**
   * Получить общую сумму заказа
   */
  async getTotalAmount(): Promise<string | null> {
    const amountText = this.page
      .getByText(/общая сумма/i)
      .locator('..')
      .locator('text=/₽/')
    return (await amountText.count()) > 0 ? await amountText.textContent() : null
  }
}
