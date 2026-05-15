/**
 * Page Objects для страниц настроек
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для главной страницы настроек /profile/settings
 */
export class SettingsPage {
  readonly page: Page
  readonly url = localePath('/profile/settings')

  // Заголовок
  readonly heading: Locator

  // Секция уведомлений
  readonly notificationsSection: Locator
  readonly notificationsLink: Locator

  // Секция опасной зоны
  readonly dangerZoneSection: Locator
  readonly deleteAccountButton: Locator

  // Диалог удаления аккаунта
  readonly deleteDialog: Locator
  readonly deleteDialogTitle: Locator
  readonly deleteDialogWarning: Locator
  readonly deleteDialogCancelButton: Locator
  readonly deleteDialogConfirmButton: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /настройки/i, level: 1 })

    // Секция уведомлений
    this.notificationsSection = page
      .getByText(/уведомления/i)
      .first()
      .locator('..')
    this.notificationsLink = page.getByRole('link', { name: /настроить уведомления/i })

    // Секция опасной зоны
    this.dangerZoneSection = page.getByText(/опасная зона/i).locator('..')
    this.deleteAccountButton = page.getByRole('button', { name: /удалить аккаунт/i }).first()

    // Диалог удаления
    this.deleteDialog = page.locator('[data-scope="dialog"]')
    this.deleteDialogTitle = page.locator('[data-part="title"]')
    this.deleteDialogWarning = page.getByText(/это действие нельзя отменить/i)
    this.deleteDialogCancelButton = page.getByRole('button', { name: /отмена/i })
    this.deleteDialogConfirmButton = page.getByRole('button', { name: /удалить аккаунт навсегда/i })
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Перейти к настройкам уведомлений
   */
  async goToNotifications() {
    await this.notificationsLink.click()
  }

  /**
   * Открыть диалог удаления аккаунта
   */
  async openDeleteDialog() {
    await this.deleteAccountButton.click()
  }

  /**
   * Закрыть диалог удаления кнопкой "Отмена"
   * (webkit не всегда обрабатывает Escape для Chakra UI диалогов)
   */
  async closeDeleteDialog() {
    await this.deleteDialogCancelButton.click()
    // Ждём закрытия анимации диалога
    await this.page.waitForTimeout(300)
  }
}

/**
 * Page Object для страницы настроек уведомлений /profile/settings/notifications
 */
export class NotificationSettingsPage {
  readonly page: Page
  readonly url = localePath('/profile/settings/notifications')

  // Заголовок
  readonly heading: Locator

  // Метки переключателей
  readonly emailOrderStatusLabel: Locator
  readonly emailPromotionsLabel: Locator
  readonly emailNewsletterLabel: Locator
  readonly smsOrderStatusLabel: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /настройки уведомлений/i, level: 1 })

    // Метки переключателей
    this.emailOrderStatusLabel = page.getByText(/email уведомления о заказах/i)
    this.emailPromotionsLabel = page.getByText(/email рекламные предложения/i)
    this.emailNewsletterLabel = page.getByText(/email рассылка новостей/i)
    this.smsOrderStatusLabel = page.getByText(/sms уведомления о заказах/i)
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Переключить switch кликом на Switch.Control
   * Chakra UI Switch: используем keyboard для активации checkbox
   */
  private async toggleSwitch(labelPattern: RegExp) {
    // Находим checkbox по роли и имени
    const checkbox = this.page.getByRole('checkbox', { name: labelPattern })
    // Фокусируемся и нажимаем Space для переключения
    await checkbox.focus()
    await this.page.keyboard.press('Space')
  }

  /**
   * Переключить настройку email уведомлений о заказах
   */
  async toggleEmailOrderStatus() {
    await this.toggleSwitch(/email уведомления о заказах/i)
  }

  /**
   * Переключить настройку email рекламных предложений
   */
  async toggleEmailPromotions() {
    await this.toggleSwitch(/email рекламные предложения/i)
  }

  /**
   * Переключить настройку email рассылки новостей
   */
  async toggleEmailNewsletter() {
    await this.toggleSwitch(/email рассылка новостей/i)
  }

  /**
   * Переключить настройку SMS уведомлений
   */
  async toggleSmsOrderStatus() {
    await this.toggleSwitch(/sms уведомления о заказах/i)
  }

  /**
   * Проверить состояние переключателя email заказов
   */
  async isEmailOrderStatusEnabled(): Promise<boolean> {
    const checkbox = this.page.getByRole('checkbox', { name: /email уведомления о заказах/i })
    return await checkbox.isChecked()
  }
}
