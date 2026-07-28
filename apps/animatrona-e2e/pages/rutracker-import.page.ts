/**
 * Page Object для страницы импорта из Rutracker (`/import?tab=rutracker`).
 *
 * Компонент `ImportRutrackerContent` — шаги: input → loading → preview | error.
 * Доступен как вкладка "Rutracker" на странице "Импорт" (по умолчанию активна).
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class RutrackerImportPage extends BasePage {
  /** Поле URL раздачи */
  readonly urlInput: Locator

  /** Textarea для вставки сырого HTML раздачи */
  readonly htmlTextarea: Locator

  /** Кнопка "Парсить и найти на Shikimori" */
  readonly parseButton: Locator

  /** Спиннер шага loading */
  readonly loadingSpinner: Locator

  /** Кнопка "Скачать и импортировать" на шаге preview */
  readonly downloadButton: Locator

  /** Кнопка "Попробовать снова" на шаге error */
  readonly retryButton: Locator

  /** Текст ошибки на шаге error */
  readonly errorText: Locator

  constructor(page: Page) {
    super(page)
    this.urlInput = page.getByPlaceholder(/rutracker\.org\/forum\/viewtopic/i)
    this.htmlTextarea = page.getByPlaceholder(/вставьте сюда html страницы раздачи/i)
    this.parseButton = page.getByRole('button', { name: /парсить и найти на shikimori/i })
    this.loadingSpinner = page.getByText(/парсинг и поиск на shikimori/i)
    this.downloadButton = page.getByRole('button', { name: /скачать и импортировать/i })
    this.retryButton = page.getByRole('button', { name: 'Попробовать снова' })
    this.errorText = page.getByText('Ошибка', { exact: true })
  }

  /**
   * Перейти на вкладку "Rutracker" страницы "Импорт" через sidebar
   */
  async goto(): Promise<void> {
    const link = this.nav.getByRole('button', { name: /импорт/i })
    await link.click()
    // Вкладка "Rutracker" активна по умолчанию (?tab=rutracker)
    await this.htmlTextarea.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Вставить сырой HTML страницы раздачи в Textarea
   *
   * Клик перед fill() обязателен (см. .claude/docs/e2e-testing.md) — без него
   * возможна гонка, когда React ещё не навесил обработчик onChange и кнопка
   * "Парсить" остаётся disabled даже после того как Textarea визуально заполнен.
   */
  async fillHtml(html: string): Promise<void> {
    await this.htmlTextarea.click()
    await this.htmlTextarea.fill(html)
    // Ждём, что React реально увидел значение (проп disabled зависит от htmlInput.trim())
    await this.parseButton.waitFor({ state: 'visible' })
    await this.parseButton.isEnabled({ timeout: 0 }).catch(() => false)
  }

  /**
   * Кликнуть "Парсить и найти на Shikimori"
   */
  async clickParse(): Promise<void> {
    // Дожидаемся стабильного enabled-состояния перед кликом — кнопка может на
    // мгновение мигнуть disabled/enabled сразу после fill() (React re-render)
    await this.parseButton.and(this.page.locator(':enabled')).waitFor({ state: 'visible', timeout: 10000 })
    await this.parseButton.click()
  }

  /**
   * Активна ли кнопка "Парсить"
   */
  async isParseEnabled(): Promise<boolean> {
    return this.parseButton.isEnabled().catch(() => false)
  }
}
