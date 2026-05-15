/**
 * Page Object для страницы транскодирования (очередь).
 *
 * Методы для работы с очередью и лог-вьюером.
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class TranscodePage extends BasePage {
  /** Заголовок страницы */
  readonly heading: Locator

  /** Таблица очереди */
  readonly queueTable: Locator

  /** Текст пустого состояния */
  readonly emptyState: Locator

  /** Кнопка "Старт" */
  readonly startButton: Locator

  /** Кнопка "Пауза" */
  readonly pauseButton: Locator

  /** Кнопка "Очистить" */
  readonly clearButton: Locator

  /** Кнопка/таб "Лог" */
  readonly logButton: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: /очередь|транскод|queue/i })
    this.queueTable = page.locator('table, [data-testid="queue-table"]')
    this.emptyState = page.getByText(/очередь пуста|нет задач|no tasks/i)
    this.startButton = page.getByRole('button', { name: /старт|start|запустить/i })
    this.pauseButton = page.getByRole('button', { name: /пауза|pause|остановить/i })
    this.clearButton = page.getByRole('button', { name: /очистить|clear/i })
    this.logButton = page.getByRole('button', { name: /лог|log|консоль/i })
  }

  /**
   * Проверить загружена ли страница
   */
  async isLoaded(): Promise<boolean> {
    // Проверяем наличие контента очереди
    const indicators = [
      this.page.getByText(/очередь|queue|задач/i),
      this.page.getByRole('tab'),
      this.page.getByRole('button'),
    ]

    for (const indicator of indicators) {
      const isVisible = await indicator
        .first()
        .isVisible()
        .catch(() => false)
      if (isVisible) {
        return true
      }
    }
    return false
  }

  /**
   * Проверить пустое состояние очереди
   */
  async isQueueEmpty(): Promise<boolean> {
    return this.emptyState
      .first()
      .isVisible()
      .catch(() => false)
  }

  /**
   * Получить количество задач в очереди
   */
  async getQueueCount(): Promise<number> {
    const rows = this.page.locator('table tbody tr, [data-testid="queue-item"]')
    return rows.count()
  }

  /**
   * Запустить очередь
   */
  async start(): Promise<boolean> {
    const isVisible = await this.startButton
      .first()
      .isVisible()
      .catch(() => false)
    if (!isVisible) {
      return false
    }

    await this.startButton.first().click()
    return true
  }

  /**
   * Приостановить очередь
   */
  async pause(): Promise<boolean> {
    const isVisible = await this.pauseButton
      .first()
      .isVisible()
      .catch(() => false)
    if (!isVisible) {
      return false
    }

    await this.pauseButton.first().click()
    return true
  }

  /**
   * Очистить очередь
   */
  async clear(): Promise<boolean> {
    const isVisible = await this.clearButton
      .first()
      .isVisible()
      .catch(() => false)
    if (!isVisible) {
      return false
    }

    await this.clearButton.first().click()
    return true
  }

  /**
   * Открыть лог-вьюер
   */
  async openLog(): Promise<boolean> {
    const isVisible = await this.logButton
      .first()
      .isVisible()
      .catch(() => false)
    if (!isVisible) {
      // Попробуем таб
      const logTab = this.page.getByRole('tab', { name: /лог|log/i })
      const isTabVisible = await logTab.isVisible().catch(() => false)
      if (isTabVisible) {
        await logTab.click()
        return true
      }
      return false
    }

    await this.logButton.first().click()
    return true
  }

  /**
   * Проверить видимость кнопок управления
   */
  async getVisibleControls(): Promise<string[]> {
    const controls: string[] = []

    if (
      await this.startButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      controls.push('start')
    }
    if (
      await this.pauseButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      controls.push('pause')
    }
    if (
      await this.clearButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      controls.push('clear')
    }

    return controls
  }
}
