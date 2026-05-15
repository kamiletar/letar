/**
 * Page Objects для страниц специальных заказов
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для диалога специального заказа на странице товара
 */
export class CustomOrderDialog {
  readonly page: Page

  // Триггер
  readonly orderButton: Locator

  // Диалог
  readonly dialog: Locator
  readonly dialogTitle: Locator
  readonly closeButton: Locator
  readonly cancelButton: Locator

  // Кнопки выбора типа заказа
  readonly madeToOrderButton: Locator
  readonly customDesignButton: Locator
  readonly b2bPartnershipButton: Locator

  // Кнопка назад (в формах)
  readonly backButton: Locator

  constructor(page: Page) {
    this.page = page

    // Триггер диалога
    this.orderButton = page.getByRole('button', { name: /заказать/i })

    // Диалог
    this.dialog = page.locator('[data-scope="dialog"]')
    this.dialogTitle = page.locator('[data-part="title"]')
    this.closeButton = page.locator('[data-part="close-trigger"]')
    this.cancelButton = page.getByRole('button', { name: /отмена/i })

    // Кнопки выбора типа заказа
    this.madeToOrderButton = page.getByRole('button', { name: /на заказ/i }).first()
    this.customDesignButton = page.getByRole('button', { name: /индивидуальный заказ/i })
    this.b2bPartnershipButton = page.getByRole('button', { name: /сотрудничество/i })

    // Кнопка назад
    this.backButton = page.getByRole('button', { name: /назад/i })
  }

  /**
   * Открыть диалог специального заказа
   */
  async open() {
    await this.orderButton.click()
  }

  /**
   * Закрыть диалог кнопкой закрытия или отмены
   * (webkit не всегда обрабатывает Escape для Chakra UI диалогов)
   */
  async close() {
    // Пробуем кнопку "Отмена" сначала (всегда видна в нашем диалоге)
    if (await this.cancelButton.isVisible()) {
      await this.cancelButton.click()
    } else if (await this.closeButton.isVisible()) {
      await this.closeButton.click()
    } else {
      // Fallback на Escape
      await this.page.keyboard.press('Escape')
    }
    // Ждём закрытия анимации диалога
    await this.page.waitForTimeout(300)
  }

  /**
   * Проверить, открыт ли диалог
   */
  async isOpen(): Promise<boolean> {
    return await this.dialogTitle.isVisible()
  }

  /**
   * Выбрать тип заказа "На заказ"
   */
  async selectMadeToOrder() {
    await this.madeToOrderButton.click()
  }

  /**
   * Выбрать тип заказа "Индивидуальный заказ"
   */
  async selectCustomDesign() {
    await this.customDesignButton.click()
  }

  /**
   * Выбрать тип заказа "Сотрудничество"
   */
  async selectB2BPartnership() {
    await this.b2bPartnershipButton.click()
  }

  /**
   * Вернуться к выбору типа заказа
   */
  async goBack() {
    await this.backButton.click()
  }

  /**
   * Получить заголовок диалога
   */
  async getTitle(): Promise<string | null> {
    return await this.dialogTitle.textContent()
  }
}

/**
 * Page Object для страницы списка специальных заказов /profile/custom-orders
 */
export class CustomOrdersListPage {
  readonly page: Page
  readonly url = localePath('/profile/custom-orders')

  // Заголовок
  readonly heading: Locator

  // Карточки заказов
  readonly orderCards: Locator

  // Пустое состояние
  readonly emptyStateMessage: Locator
  readonly catalogLink: Locator

  // Уведомление об успешном создании
  readonly successAlert: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /специальные заказы/i })

    // Карточки заказов (каждая карточка - ссылка на /profile/custom-orders/[id])
    this.orderCards = page.locator(`a[href^="${localePath('/profile/custom-orders/')}"]`).filter({
      has: page.locator('.chakra-card'),
    })

    // Пустое состояние
    this.emptyStateMessage = page.getByText(/у вас пока нет специальных заказов/i)

    // Ссылка на каталог (из текста "странице товара") - внутри пустого состояния
    this.catalogLink = page.getByRole('link', { name: /странице товара/i })

    // Уведомление об успехе (появляется после создания заказа)
    this.successAlert = page.locator('[data-status="success"]')
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Получить количество карточек заказов
   */
  async getOrderCount(): Promise<number> {
    return await this.orderCards.count()
  }

  /**
   * Кликнуть на карточку заказа по индексу
   */
  async clickOrderCard(index: number) {
    await this.orderCards.nth(index).click()
  }

  /**
   * Проверить, пуст ли список заказов
   */
  async isEmpty(): Promise<boolean> {
    return (await this.emptyStateMessage.count()) > 0
  }

  /**
   * Получить информацию о заказе из карточки
   */
  async getOrderCardInfo(index: number): Promise<{
    orderNumber: string | null
    hasStatusBadge: boolean
    hasTypeBadge: boolean
  }> {
    const card = this.orderCards.nth(index)

    // Номер заказа (текст "Заказ CO-...")
    const orderText = card.getByText(/заказ\s+CO-/i)
    const orderNumber = await orderText.textContent()

    // Проверяем наличие бейджей статуса и типа
    const badges = card.locator('.chakra-badge')
    const badgeCount = await badges.count()

    return {
      orderNumber: orderNumber?.replace(/заказ\s+/i, '').trim() || null,
      hasStatusBadge: badgeCount >= 1,
      hasTypeBadge: badgeCount >= 2,
    }
  }
}

/**
 * Page Object для страницы детали специального заказа /profile/custom-orders/[id]
 */
export class CustomOrderDetailPage {
  readonly page: Page

  // Навигация
  readonly backLink: Locator

  // Заголовок и метаданные
  readonly orderNumber: Locator
  readonly typeBadge: Locator
  readonly statusBadge: Locator
  readonly createdDate: Locator

  // Прогресс статуса
  readonly statusProgress: Locator

  // Секция информации о товаре
  readonly productInfoCard: Locator

  // Секция мерок (для MADE_TO_ORDER и CUSTOM_DESIGN)
  readonly measurementsCard: Locator

  // Секция дизайна (для CUSTOM_DESIGN)
  readonly designCard: Locator

  // Секция компании (для B2B)
  readonly companyCard: Locator

  // Секция контактов
  readonly contactsCard: Locator

  // Секция комментария
  readonly notesCard: Locator

  // Кнопка отмены заказа
  readonly cancelButton: Locator

  // Кнопка повторного заказа
  readonly reorderButton: Locator

  // Секция помощи
  readonly helpCard: Locator

  constructor(page: Page) {
    this.page = page

    // Навигация
    this.backLink = page.getByRole('link', { name: /назад к списку заказов/i })

    // Заголовок с номером заказа
    this.orderNumber = page.getByRole('heading', { name: /заказ\s*#/i })

    // Бейджи (по типу компонента Badge)
    this.typeBadge = page.locator('.chakra-badge').first()
    this.statusBadge = page.locator('.chakra-badge').nth(1)

    // Дата создания
    this.createdDate = page.getByText(/создан:/i)

    // Прогресс статуса
    this.statusProgress = page.getByText(/статус заказа/i).locator('..')

    // Информация о товаре
    this.productInfoCard = page.getByText(/информация о товаре/i).locator('..')

    // Мерки
    this.measurementsCard = page.getByText(/ваши мерки/i).locator('..')

    // Дизайн
    this.designCard = page.getByText(/ваш дизайн/i).locator('..')

    // Компания
    this.companyCard = page.getByText(/реквизиты компании/i).locator('..')

    // Контакты
    this.contactsCard = page.getByText(/контактные данные/i).locator('..')

    // Комментарий
    this.notesCard = page.getByText(/ваш комментарий/i).locator('..')

    // Кнопка отмены
    this.cancelButton = page.getByRole('button', { name: /отменить заказ/i })

    // Кнопка повторного заказа
    this.reorderButton = page.getByRole('link', { name: /повторить заказ/i })

    // Секция помощи
    this.helpCard = page.getByText(/есть вопросы по заказу/i).locator('..')
  }

  /**
   * Перейти на страницу заказа по ID
   */
  async goto(orderId: string) {
    await this.page.goto(localePath(`/profile/custom-orders/${orderId}`))
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Получить номер заказа из заголовка
   */
  async getOrderNumber(): Promise<string | null> {
    const text = await this.orderNumber.textContent()
    if (!text) {
      return null
    }
    // Извлекаем номер заказа "Заказ #CO-..."
    const match = text.match(/CO-[\w-]+/i)
    return match ? match[0] : null
  }

  /**
   * Вернуться к списку заказов
   */
  async goBack() {
    await this.backLink.click()
  }

  /**
   * Проверить наличие карточки с информацией о товаре
   */
  async hasProductInfo(): Promise<boolean> {
    return (await this.productInfoCard.count()) > 0
  }

  /**
   * Проверить наличие карточки с мерками
   */
  async hasMeasurements(): Promise<boolean> {
    return (await this.measurementsCard.count()) > 0
  }

  /**
   * Проверить наличие карточки дизайна
   */
  async hasDesignInfo(): Promise<boolean> {
    return (await this.designCard.count()) > 0
  }

  /**
   * Проверить наличие карточки компании
   */
  async hasCompanyInfo(): Promise<boolean> {
    return (await this.companyCard.count()) > 0
  }

  /**
   * Проверить наличие кнопки отмены (доступна только для NEW статуса)
   */
  async hasCancelButton(): Promise<boolean> {
    return (await this.cancelButton.count()) > 0
  }

  /**
   * Проверить наличие кнопки повторного заказа (для COMPLETED статуса)
   */
  async hasReorderButton(): Promise<boolean> {
    return (await this.reorderButton.count()) > 0
  }
}
