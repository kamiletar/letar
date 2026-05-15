/**
 * Базовый Page Object для всех страниц.
 *
 * Содержит общую логику: навигация, ожидания, скриншоты.
 */

import type { Page } from 'playwright'

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Ожидание загрузки навигации (sidebar)
   */
  async waitForNavigation(timeout = 10000): Promise<void> {
    await this.page.getByRole('navigation').waitFor({ state: 'visible', timeout })
  }

  /**
   * Навигация через сайдбар
   */
  protected get nav() {
    return this.page.getByRole('navigation')
  }

  /**
   * Перейти в библиотеку
   */
  async goToLibrary(): Promise<void> {
    const link = this.nav.getByRole('link', { name: /библиотека/i })
    await link.click()
    await this.page.waitForTimeout(1500)
  }

  /**
   * Перейти на страницу плеера
   */
  async goToPlayer(): Promise<boolean> {
    const link = this.nav.getByRole('link', { name: /плеер/i })
    const isVisible = await link.isVisible().catch(() => false)
    if (!isVisible) {
      return false
    }

    await link.click()
    await this.page.waitForTimeout(1500)
    return true
  }

  /**
   * Перейти в настройки
   */
  async goToSettings(): Promise<boolean> {
    const link = this.nav.getByRole('link', { name: /настройки/i })
    const isVisible = await link.isVisible().catch(() => false)
    if (!isVisible) {
      return false
    }

    await link.click()
    await this.page.waitForTimeout(1500)
    return true
  }

  /**
   * Перейти на страницу транскодирования
   */
  async goToTranscode(): Promise<boolean> {
    const link = this.nav.getByRole('link', { name: /транскод|очередь|queue/i })
    const isVisible = await link.isVisible().catch(() => false)
    if (!isVisible) {
      return false
    }

    await link.click()
    await this.page.waitForTimeout(1500)
    return true
  }

  /**
   * Проверить видимость навигации
   */
  async isNavigationVisible(): Promise<boolean> {
    return this.nav.isVisible().catch(() => false)
  }

  /**
   * Получить текущий URL
   */
  getUrl(): string {
    return this.page.url()
  }
}
