/**
 * Page Object для страницы восстановления пароля
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

export class ForgotPasswordPage {
  readonly page: Page
  readonly url = localePath('/auth/forgot-password')

  // Элементы формы
  readonly heading: Locator
  readonly description: Locator
  readonly emailInput: Locator
  readonly emailHelperText: Locator
  readonly submitButton: Locator

  // Сообщения
  readonly successAlert: Locator
  readonly successTitle: Locator
  readonly successDescription: Locator
  readonly errorMessage: Locator

  // Ссылки
  readonly backToSignInLink: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок (может быть h1 или h2 в зависимости от страницы)
    this.heading = page.getByRole('heading', { name: 'Восстановление пароля' })
    this.description = page.getByText('Введите email, использованный при регистрации')

    // Поля формы
    this.emailInput = page.locator('input[type="email"]')
    this.emailHelperText = page.getByText('Мы отправим инструкции по восстановлению пароля')

    // Кнопка отправки
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Отправить инструкции' })

    // Сообщения (Alert.Root с status="success")
    this.successAlert = page.locator('[data-status="success"]')
    this.successTitle = page.getByText('Письмо отправлено')
    this.successDescription = page.getByText(/Если указанный email существует в нашей системе/i)
    this.errorMessage = page.locator('[data-part="error-text"]')

    // Ссылка назад (текст "Войти", href может быть /auth/signin или /ru/auth/signin)
    this.backToSignInLink = page.locator('a', { hasText: 'Войти' })
  }

  /**
   * Переход на страницу восстановления пароля
   */
  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Запрос сброса пароля
   * ВАЖНО: В WebKit нужен click() перед fill() для корректной работы
   */
  async requestReset(email: string) {
    await this.goto()
    await this.emailInput.waitFor({ state: 'visible' })
    await this.emailInput.click()
    await this.emailInput.fill(email)
    await this.submitButton.click()
  }

  /**
   * Ожидание сообщения об успехе
   */
  async waitForSuccess(timeout = 10000) {
    await this.successTitle.waitFor({ timeout })
  }

  /**
   * Проверка успешной отправки
   */
  async isSuccessVisible(): Promise<boolean> {
    return this.successTitle.isVisible()
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
