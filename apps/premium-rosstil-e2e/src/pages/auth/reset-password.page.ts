/**
 * Page Object для страницы сброса пароля
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

export class ResetPasswordPage {
  readonly page: Page
  readonly urlPattern = /\/ru\/auth\/reset-password/

  // Элементы формы
  readonly heading: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator

  // Сообщения
  readonly successMessage: Locator
  readonly errorMessage: Locator
  readonly invalidTokenMessage: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок (может быть h1 или h2 в зависимости от страницы)
    this.heading = page.getByRole('heading', { name: 'Сброс пароля' })

    // Поля формы
    this.passwordInput = page.locator('input').filter({ hasText: '' }).nth(0) // первый input
    this.confirmPasswordInput = page.locator('input').filter({ hasText: '' }).nth(1) // второй input

    // Используем getByLabel для более надёжного поиска
    this.passwordInput = page.getByLabel(/новый пароль/i)
    this.confirmPasswordInput = page.getByLabel(/подтвердите пароль/i)

    // Кнопка отправки
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Сбросить пароль' })

    // Сообщения
    this.successMessage = page.locator('[data-status="success"]')
    this.errorMessage = page.locator('[data-status="error"]')
    this.invalidTokenMessage = page.getByText(/недействительн|истёк|invalid|expired|не найден|not found/i)
  }

  /**
   * Переход на страницу сброса пароля с токеном
   */
  async goto(token: string) {
    await this.page.goto(localePath(`/auth/reset-password?token=${token}`))
  }

  /**
   * Сброс пароля
   * ВАЖНО: В WebKit нужен click() перед fill() для корректной работы
   */
  async resetPassword(newPassword: string, confirmPassword?: string) {
    await this.passwordInput.waitFor({ state: 'visible' })

    await this.passwordInput.click()
    await this.passwordInput.fill(newPassword)

    await this.confirmPasswordInput.click()
    await this.confirmPasswordInput.fill(confirmPassword ?? newPassword)

    await this.submitButton.click()
  }

  /**
   * Ожидание сообщения об успехе
   */
  async waitForSuccess(timeout = 5000) {
    await this.successMessage.waitFor({ timeout })
  }

  /**
   * Проверка недействительности токена
   */
  async isTokenInvalid(): Promise<boolean> {
    return this.invalidTokenMessage.isVisible()
  }

  /**
   * Получение текста ошибки
   */
  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent()
    }
    return null
  }
}
