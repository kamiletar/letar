/**
 * Page Object для Import Wizard.
 *
 * Методы для работы со всеми шагами wizard:
 * 1. FolderSelectStep — выбор папки/файла
 * 2. ShikimoriSearchStep — поиск в Shikimori
 * 3. FileScanStep — таблица файлов
 * 4. PreviewStep — предпросмотр и добавление в очередь
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class ImportWizardPage extends BasePage {
  /** Диалог wizard */
  readonly dialog: Locator

  /** Заголовок "Импорт видео" */
  readonly title: Locator

  /** Кнопка "Выбрать папку" */
  readonly selectFolderButton: Locator

  /** Кнопка "Выбрать файл" */
  readonly selectFileButton: Locator

  /** Кнопка "Далее" */
  readonly nextButton: Locator

  /** Кнопка "Назад" */
  readonly backButton: Locator

  /** Кнопка "Отмена" */
  readonly cancelButton: Locator

  constructor(page: Page) {
    super(page)
    this.dialog = page.getByRole('dialog')
    this.title = this.dialog.getByText('Импорт видео', { exact: true })
    this.selectFolderButton = page.getByRole('button', { name: /выбрать папку/i })
    this.selectFileButton = page.getByRole('button', { name: /выбрать файл/i })
    this.nextButton = page.getByRole('button', { name: /далее/i })
    this.backButton = page.getByRole('button', { name: /назад/i })
    this.cancelButton = page.getByRole('button', { name: 'Отмена' })
  }

  /**
   * Проверить открыт ли wizard
   */
  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible().catch(() => false)
  }

  /**
   * Закрыть wizard
   */
  async close(): Promise<void> {
    await this.cancelButton.click()
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 })
  }

  /**
   * Кликнуть "Выбрать папку"
   */
  async clickSelectFolder(): Promise<void> {
    await this.selectFolderButton.click()
  }

  /**
   * Кликнуть "Выбрать файл"
   */
  async clickSelectFile(): Promise<void> {
    await this.selectFileButton.click()
  }

  /**
   * Кликнуть "Далее"
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Кликнуть "Назад"
   */
  async clickBack(): Promise<void> {
    await this.backButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Проверить активна ли кнопка "Далее"
   */
  async isNextEnabled(): Promise<boolean> {
    return this.nextButton.isEnabled().catch(() => false)
  }

  // ==================== Step 1: Folder Select ====================

  /**
   * Получить распознанное название
   */
  async getRecognizedName(): Promise<string | null> {
    const label = this.page.getByText(/распознанное название/i)
    const isVisible = await label.isVisible().catch(() => false)
    if (!isVisible) {
      return null
    }

    // Название обычно рядом с лейблом
    const nameElement = label.locator('..').locator('input, span').first()
    return nameElement.textContent().catch(() => null)
  }

  /**
   * Проверить что папка выбрана (появился "Распознанное название")
   */
  async isFolderSelected(): Promise<boolean> {
    const label = this.page.getByText(/распознанное название/i)
    return label.isVisible().catch(() => false)
  }

  // ==================== Step 2: Shikimori Search ====================

  /**
   * Поле поиска Shikimori
   */
  get shikimoriSearchInput(): Locator {
    return this.page.getByPlaceholder(/поиск|shikimori|аниме/i)
  }

  /**
   * Искать в Shikimori
   */
  async searchShikimori(query: string): Promise<void> {
    await this.shikimoriSearchInput.fill(query)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(2000) // Ждём результатов
  }

  /**
   * Выбрать первый результат Shikimori
   */
  async selectFirstShikimoriResult(): Promise<boolean> {
    // Результаты обычно в списке
    const results = this.page.locator('[data-testid="shikimori-result"], .shikimori-result')
    const count = await results.count()
    if (count === 0) {
      return false
    }

    await results.first().click()
    return true
  }

  // ==================== Step 3: File Scan ====================

  /**
   * Получить количество файлов в таблице
   */
  async getFileCount(): Promise<number> {
    const rows = this.page.locator('table tbody tr, [data-testid="file-row"]')
    return rows.count()
  }

  /**
   * Выбрать все файлы
   */
  async selectAllFiles(): Promise<void> {
    const selectAll = this.page.getByRole('checkbox', { name: /выбрать все/i })
    const isVisible = await selectAll.isVisible().catch(() => false)
    if (isVisible) {
      await selectAll.check()
    }
  }

  // ==================== Step 4: Preview ====================

  /**
   * Кнопка "Добавить в очередь"
   */
  get addToQueueButton(): Locator {
    return this.page.getByRole('button', { name: /добавить в очередь/i })
  }

  /**
   * Добавить в очередь
   */
  async addToQueue(): Promise<void> {
    await this.addToQueueButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * Проверить активна ли кнопка "Добавить в очередь"
   */
  async isAddToQueueEnabled(): Promise<boolean> {
    return this.addToQueueButton.isEnabled().catch(() => false)
  }
}
