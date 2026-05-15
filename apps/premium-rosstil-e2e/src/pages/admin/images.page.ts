/**
 * Page Object для страницы управления изображениями /admin/images
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для /admin/images
 */
export class AdminImagesPage {
  readonly page: Page
  readonly url = localePath('/admin/images')

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator

  // Кнопка очистки неиспользуемых
  readonly cleanupButton: Locator

  // Статистика
  readonly statsSection: Locator
  readonly totalImagesCard: Locator
  readonly unusedImagesCard: Locator

  // Панель синхронизации
  readonly syncPanel: Locator
  readonly syncButton: Locator
  readonly syncResultBadges: Locator
  readonly orphanFilesHeading: Locator
  readonly brokenRecordsHeading: Locator
  readonly deleteAllOrphansButton: Locator
  readonly deleteAllBrokenButton: Locator

  // Фильтры
  readonly filtersSection: Locator
  readonly searchInput: Locator
  readonly searchButton: Locator
  readonly categorySelect: Locator
  readonly unusedFilterButton: Locator
  readonly clearFiltersButton: Locator

  // Таблица изображений
  readonly imagesTable: Locator
  readonly emptyState: Locator
  readonly tableRows: Locator

  // Пагинация
  readonly pagination: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация
    this.heading = page.locator('h1, h2', { hasText: 'Изображения' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к панели администратора' })

    // Кнопка очистки неиспользуемых (появляется только если есть неиспользуемые)
    this.cleanupButton = page.locator('button', { hasText: /Удалить неиспользуемые/ })

    // Статистика - карточки SimpleGrid
    this.statsSection = page.locator('[class*="grid"]').first()
    this.totalImagesCard = page.locator('text=Всего изображений').locator('..').locator('..')
    this.unusedImagesCard = page.locator('text=Неиспользуемые').locator('..').locator('..')

    // Панель синхронизации
    this.syncPanel = page.locator('text=Синхронизация файлов').locator('..').locator('..')
    this.syncButton = page.locator('button', { hasText: 'Сканировать' })
    this.syncResultBadges = this.syncPanel.locator('[class*="badge"]')
    this.orphanFilesHeading = page.locator('text=/Файлы без записей в БД/')
    this.brokenRecordsHeading = page.locator('text=/Записи без файлов на диске/')
    this.deleteAllOrphansButton = this.syncPanel.locator('button', { hasText: 'Удалить все' }).first()
    this.deleteAllBrokenButton = this.syncPanel.locator('button', { hasText: 'Удалить все' }).last()

    // Фильтры
    this.filtersSection = page.locator('input[placeholder*="Поиск"]').locator('..').locator('..')
    this.searchInput = page.locator('input[placeholder*="Поиск по имени файла"]')
    this.searchButton = page.locator('button[type="submit"]').filter({ has: page.locator('svg') })
    this.categorySelect = page.locator('select').first()
    this.unusedFilterButton = page.locator('button', { hasText: 'Неиспользуемые' }).first()
    this.clearFiltersButton = page.locator('button', { hasText: 'Сбросить' })

    // Таблица изображений
    this.imagesTable = page.locator('table')
    this.emptyState = page.locator('text=Изображения не найдены')
    this.tableRows = this.imagesTable.locator('tbody tr')

    // Пагинация
    this.pagination = page.locator('text=/Показано .* из .*/')
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить количество изображений из статистики "Всего изображений"
   */
  async getTotalImagesCount(): Promise<number> {
    const headingElement = await this.totalImagesCard.locator('h2, h3, [class*="heading"]').textContent()
    return parseInt(headingElement || '0', 10)
  }

  /**
   * Получить количество неиспользуемых изображений из статистики
   * Карточка "Неиспользуемые" отображается только если unused > 0
   */
  async getUnusedImagesCount(): Promise<number> {
    // Карточка появляется только если есть неиспользуемые изображения
    // Даём немного времени для рендеринга
    await this.page.waitForTimeout(500)

    // Ищем карточку с текстом "Можно удалить" - это уникальный текст для карточки unused
    const canDeleteText = this.page.locator('text=Можно удалить')
    const isVisible = await canDeleteText.isVisible().catch(() => false)

    if (!isVisible) {
      return 0
    }

    // Находим карточку и извлекаем число из заголовка (идём вверх по DOM)
    const card = canDeleteText.locator('..').locator('..')
    const headingElement = await card.locator('h2, h3, [class*="heading"]').first().textContent()
    return parseInt(headingElement || '0', 10)
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
   * Запустить синхронизацию
   */
  async runSync() {
    await this.syncButton.click()
    // Ждём завершения синхронизации (кнопка перестаёт быть в loading состоянии)
    await this.page.waitForTimeout(2000)
  }

  /**
   * Проверить, что синхронизация прошла успешно (нет проблем)
   */
  async isSyncSuccessful(): Promise<boolean> {
    const allSyncedBadge = this.syncPanel.locator('text=Всё синхронизировано')
    return allSyncedBadge.isVisible()
  }

  /**
   * Получить количество сиротских файлов
   */
  async getOrphanFilesCount(): Promise<number> {
    if (!(await this.orphanFilesHeading.isVisible())) {
      return 0
    }
    const text = await this.orphanFilesHeading.textContent()
    const match = text?.match(/\((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Получить количество битых записей
   */
  async getBrokenRecordsCount(): Promise<number> {
    if (!(await this.brokenRecordsHeading.isVisible())) {
      return 0
    }
    const text = await this.brokenRecordsHeading.textContent()
    const match = text?.match(/\((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Применить фильтр по категории
   */
  async filterByCategory(category: 'PRODUCT' | 'AVATAR' | 'REFERENCE' | 'NOTIFICATION' | '') {
    await this.categorySelect.selectOption(category)
    // Ждём обновления страницы
    await this.page.waitForTimeout(500)
  }

  /**
   * Включить/выключить фильтр неиспользуемых
   */
  async toggleUnusedFilter() {
    await this.unusedFilterButton.click()
    // Ждём обновления страницы
    await this.page.waitForTimeout(500)
  }

  /**
   * Выполнить поиск по имени файла
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.searchButton.click()
    // Ждём обновления страницы
    await this.page.waitForTimeout(500)
  }

  /**
   * Сбросить фильтры
   */
  async clearFilters() {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Получить строку таблицы по имени файла
   */
  getImageRow(filename: string): Locator {
    return this.tableRows.filter({ hasText: filename })
  }

  /**
   * Проверить, что изображение отображается в таблице
   */
  async hasImage(filename: string): Promise<boolean> {
    const row = this.getImageRow(filename)
    return (await row.count()) > 0
  }

  /**
   * Получить бейдж категории для изображения
   */
  async getImageCategory(filename: string): Promise<string> {
    const row = this.getImageRow(filename)
    const badge = row.locator('[class*="badge"]').first()
    return (await badge.textContent()) || ''
  }

  /**
   * Проверить, является ли изображение неиспользуемым
   */
  async isImageUnused(filename: string): Promise<boolean> {
    const row = this.getImageRow(filename)
    const unusedBadge = row.locator('text=Не используется')
    return unusedBadge.isVisible()
  }

  /**
   * Удалить изображение (только для неиспользуемых)
   */
  async deleteImage(filename: string) {
    const row = this.getImageRow(filename)
    const deleteButton = row
      .locator('button[colorpalette="red"], button')
      .filter({ has: this.page.locator('svg') })
      .last()
    await deleteButton.click()

    // Подтверждаем в confirm диалоге
    this.page.on('dialog', (dialog) => dialog.accept())
    await this.page.waitForTimeout(1000)
  }

  /**
   * Удалить все неиспользуемые изображения через CleanupButton
   */
  async deleteAllUnused() {
    // Устанавливаем обработчик диалога заранее
    this.page.once('dialog', (dialog) => dialog.accept())

    await this.cleanupButton.click()
    await this.page.waitForTimeout(2000)
  }

  /**
   * Открыть изображение в новой вкладке
   */
  async openImageInNewTab(filename: string): Promise<Page> {
    const row = this.getImageRow(filename)
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      row.locator('a[target="_blank"]').click(),
    ])
    return newPage
  }
}
