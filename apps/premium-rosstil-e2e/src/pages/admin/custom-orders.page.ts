/**
 * Page Objects для страниц управления индивидуальными заказами /admin/custom-orders
 */
import type { Locator, Page } from '@playwright/test'

/**
 * Page Object для списка индивидуальных заказов /admin/custom-orders
 */
export class AdminCustomOrdersListPage {
  readonly page: Page
  readonly url = '/admin/custom-orders'

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator
  readonly statsButton: Locator

  // Поиск
  readonly searchInput: Locator

  // Фильтры по типу
  readonly typeFilterAll: Locator
  readonly typeFilterMadeToOrder: Locator
  readonly typeFilterCustomDesign: Locator
  readonly typeFilterB2B: Locator

  // Фильтры по статусу
  readonly statusFilterAll: Locator
  readonly statusFilterNew: Locator
  readonly statusFilterConfirmed: Locator
  readonly statusFilterInProduction: Locator
  readonly statusFilterCompleted: Locator
  readonly statusFilterCancelled: Locator

  // Фильтры по дате
  readonly datePresetToday: Locator
  readonly datePresetWeek: Locator
  readonly datePresetMonth: Locator

  // Таблица заказов
  readonly ordersTable: Locator
  readonly tableRows: Locator
  readonly emptyState: Locator

  // Кнопки сброса и экспорта
  readonly resetFiltersButton: Locator
  readonly exportButton: Locator
  readonly resultsCounter: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация
    this.heading = page.locator('h1, h2', { hasText: 'Специальные заказы' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к панели администратора' })
    this.statsButton = page.locator('a', { hasText: 'Статистика' })

    // Поиск
    this.searchInput = page.locator('input[placeholder*="Поиск по номеру заказа"]')

    // Фильтры по типу (кнопки в строке "Тип:")
    const typeRow = page.locator('text=Тип:').locator('..')
    this.typeFilterAll = typeRow.locator('button', { hasText: 'Все' })
    this.typeFilterMadeToOrder = typeRow.locator('button', { hasText: 'На заказ' })
    this.typeFilterCustomDesign = typeRow.locator('button', { hasText: 'Индивидуальный дизайн' })
    this.typeFilterB2B = typeRow.locator('button', { hasText: 'Сотрудничество B2B' })

    // Фильтры по статусу (кнопки в строке "Статус:")
    const statusRow = page.locator('text=Статус:').locator('..')
    this.statusFilterAll = statusRow.locator('button', { hasText: 'Все' })
    this.statusFilterNew = statusRow.locator('button', { hasText: 'Новый' })
    this.statusFilterConfirmed = statusRow.locator('button', { hasText: 'Подтверждён' })
    this.statusFilterInProduction = statusRow.locator('button', { hasText: 'В производстве' })
    this.statusFilterCompleted = statusRow.locator('button', { hasText: 'Выполнен' })
    this.statusFilterCancelled = statusRow.locator('button', { hasText: 'Отменён' })

    // Фильтры по дате (кнопки в строке "Период:")
    const dateRow = page.locator('text=Период:').locator('..')
    this.datePresetToday = dateRow.locator('button', { hasText: 'Сегодня' })
    this.datePresetWeek = dateRow.locator('button', { hasText: 'Неделя' })
    this.datePresetMonth = dateRow.locator('button', { hasText: 'Месяц' })

    // Таблица заказов
    this.ordersTable = page.locator('table')
    this.tableRows = this.ordersTable.locator('tbody tr')
    this.emptyState = page.locator('text=Нет заказов для отображения')

    // Кнопки сброса и экспорта
    this.resetFiltersButton = page.locator('button', { hasText: 'Сбросить фильтры' })
    this.exportButton = page.locator('a', { hasText: 'Экспорт в Excel' })
    this.resultsCounter = page.locator('text=/Показано: \\d+ из \\d+/')
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить количество строк в таблице
   */
  async getTableRowsCount(): Promise<number> {
    if (await this.emptyState.isVisible()) {
      return 0
    }
    return this.tableRows.count()
  }

  /**
   * Фильтровать по типу заказа
   */
  async filterByType(type: 'all' | 'made_to_order' | 'custom_design' | 'b2b') {
    const filterMap = {
      all: this.typeFilterAll,
      made_to_order: this.typeFilterMadeToOrder,
      custom_design: this.typeFilterCustomDesign,
      b2b: this.typeFilterB2B,
    }
    await filterMap[type].click()

    await this.page.waitForTimeout(500)
  }

  /**
   * Фильтровать по статусу заказа
   */
  async filterByStatus(status: 'all' | 'new' | 'confirmed' | 'in_production' | 'completed' | 'cancelled') {
    const filterMap = {
      all: this.statusFilterAll,
      new: this.statusFilterNew,
      confirmed: this.statusFilterConfirmed,
      in_production: this.statusFilterInProduction,
      completed: this.statusFilterCompleted,
      cancelled: this.statusFilterCancelled,
    }
    await filterMap[status].click()

    await this.page.waitForTimeout(500)
  }

  /**
   * Выполнить поиск
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    // Поиск с debounce 300ms

    await this.page.waitForTimeout(500)
  }

  /**
   * Сбросить все фильтры
   */
  async resetFilters() {
    if (await this.resetFiltersButton.isVisible()) {
      await this.resetFiltersButton.click()

      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Получить строку заказа по номеру
   */
  getOrderRow(orderNumber: string): Locator {
    return this.tableRows.filter({ hasText: orderNumber })
  }

  /**
   * Проверить, что заказ отображается в таблице
   */
  async hasOrder(orderNumber: string): Promise<boolean> {
    const row = this.getOrderRow(orderNumber)
    return (await row.count()) > 0
  }

  /**
   * Перейти к деталям заказа
   */
  async goToOrderDetails(orderNumber: string) {
    const row = this.getOrderRow(orderNumber)
    await row.locator('a', { hasText: 'Подробнее' }).click()
  }

  /**
   * Перейти на страницу статистики
   */
  async goToStats() {
    await this.statsButton.click()
  }

  /**
   * Получить отображаемое количество заказов из счётчика
   */
  async getDisplayedCount(): Promise<{ shown: number; total: number }> {
    const text = await this.resultsCounter.textContent()
    const match = text?.match(/Показано: (\d+) из (\d+)/)
    if (match) {
      return { shown: parseInt(match[1], 10), total: parseInt(match[2], 10) }
    }
    return { shown: 0, total: 0 }
  }
}

/**
 * Page Object для страницы деталей заказа /admin/custom-orders/[id]
 */
export class AdminCustomOrderDetailPage {
  readonly page: Page

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator
  readonly orderNumber: Locator
  readonly typeBadge: Locator
  readonly statusBadge: Locator

  // Карточки информации
  readonly contactCard: Locator
  readonly productCard: Locator

  // Форма редактирования
  readonly statusSelect: Locator
  readonly adminNotesTextarea: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация
    this.heading = page.locator('h1, h2', { hasText: /Заказ #/ }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к списку заказов' })
    this.orderNumber = page.locator('[class*="heading"]', { hasText: /Заказ #/ })
    this.typeBadge = page.locator('[class*="badge"]').first()
    this.statusBadge = page.locator('[class*="badge"]').nth(1)

    // Карточки информации
    this.contactCard = page.locator('[class*="card"]', { hasText: 'Контактные данные' })
    this.productCard = page.locator('[class*="card"]', { hasText: 'Информация о товаре' })

    // Форма редактирования (в сайдбаре "Управление заказом")
    this.statusSelect = page.locator('select[name="status"]')
    this.adminNotesTextarea = page.locator('textarea[name="adminNotes"]')
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Сохранить изменения' })
  }

  async goto(orderId: string) {
    await this.page.goto(`/admin/custom-orders/${orderId}`)
  }

  /**
   * Получить номер заказа из заголовка
   */
  async getOrderNumber(): Promise<string> {
    const text = await this.heading.textContent()
    const match = text?.match(/Заказ #(\S+)/)
    return match ? match[1] : ''
  }

  /**
   * Изменить статус заказа
   */
  async changeStatus(status: 'NEW' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED') {
    await this.statusSelect.selectOption(status)
  }

  /**
   * Добавить заметку администратора
   */
  async setAdminNotes(notes: string) {
    await this.adminNotesTextarea.fill(notes)
  }

  /**
   * Сохранить изменения
   */
  async save() {
    await this.submitButton.click()

    await this.page.waitForTimeout(1000)
  }

  /**
   * Вернуться к списку заказов
   */
  async goBack() {
    await this.backLink.click()
  }
}

/**
 * Page Object для страницы статистики /admin/custom-orders/stats
 */
export class AdminCustomOrdersStatsPage {
  readonly page: Page
  readonly url = '/admin/custom-orders/stats'

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator

  // Карточки статистики
  readonly totalOrdersCard: Locator
  readonly thisMonthCard: Locator
  readonly averageCheckCard: Locator
  readonly completionRateCard: Locator

  // Карточки по типам и статусам
  readonly typeStatsCard: Locator
  readonly statusStatsCard: Locator

  // Таблица помесячной статистики
  readonly monthlyTable: Locator

  // Таблица последних заказов
  readonly recentOrdersCard: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация
    this.heading = page.locator('h1, h2', { hasText: 'Статистика заказов' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к списку заказов' })

    // Карточки статистики (в SimpleGrid) - используем только card__root
    this.totalOrdersCard = page.locator('.chakra-card__root', { hasText: 'Всего заказов' })
    this.thisMonthCard = page.locator('.chakra-card__root', { hasText: 'В этом месяце' })
    this.averageCheckCard = page.locator('.chakra-card__root', { hasText: 'Средний чек B2B' })
    this.completionRateCard = page.locator('.chakra-card__root', { hasText: 'Выполнение' })

    // Карточки по типам и статусам
    this.typeStatsCard = page.locator('.chakra-card__root', { hasText: 'По типам заказов' })
    this.statusStatsCard = page.locator('.chakra-card__root', { hasText: 'По статусам' })

    // Таблица помесячной статистики
    this.monthlyTable = page.locator('.chakra-card__root', { hasText: 'Детализация по месяцам' })

    // Таблица последних заказов
    this.recentOrdersCard = page.locator('.chakra-card__root', { hasText: 'Последние заказы' })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить значение всего заказов из карточки
   */
  async getTotalOrdersCount(): Promise<number> {
    const valueText = await this.totalOrdersCard.locator('[class*="valueText"]').first().textContent()
    return parseInt(valueText || '0', 10)
  }

  /**
   * Вернуться к списку заказов
   */
  async goBack() {
    await this.backLink.click()
  }
}
