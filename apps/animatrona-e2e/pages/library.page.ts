/**
 * Page Object для страницы библиотеки.
 *
 * Методы:
 * - Проверка пустого состояния
 * - Открытие Import Wizard
 * - Поиск и фильтрация
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class LibraryPage extends BasePage {
  /** Кнопка "Импорт видео" */
  readonly importButton: Locator

  /** Заголовок библиотеки */
  readonly heading: Locator

  /** Счётчик тайтлов */
  readonly titleCount: Locator

  /** Поле поиска */
  readonly searchInput: Locator

  constructor(page: Page) {
    super(page)
    this.importButton = page.getByRole('button', { name: 'Импорт видео' })
    this.heading = page.getByRole('heading', { name: 'Библиотека аниме' })
    this.titleCount = page.getByText(/\d+ тайтлов? в коллекции/)
    this.searchInput = page.getByPlaceholder(/поиск/i)
  }

  /**
   * Проверить пустое состояние библиотеки
   */
  async isEmptyState(): Promise<boolean> {
    const zeroText = this.page.getByText('0 тайтлов в коллекции')
    return zeroText.isVisible().catch(() => false)
  }

  /**
   * Открыть Import Wizard
   */
  async openImportWizard(): Promise<void> {
    await this.importButton.click()
    // Ждём появления диалога
    await this.page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Проверить видимость кнопки импорта
   */
  async isImportButtonVisible(): Promise<boolean> {
    return this.importButton.isVisible().catch(() => false)
  }

  /**
   * Поиск по библиотеке
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
  }

  /**
   * Очистить поиск
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear()
  }

  /**
   * Получить количество тайтлов
   */
  async getTitleCount(): Promise<number> {
    const text = await this.titleCount.textContent().catch(() => '0 тайтлов')
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Проверить загрузку страницы
   */
  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible().catch(() => false)
  }
}
