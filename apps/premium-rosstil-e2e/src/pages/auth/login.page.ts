/**
 * Page Object для страницы входа
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

export class LoginPage {
  readonly page: Page
  readonly url = localePath('/auth/signin')

  // Элементы формы
  readonly heading: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  // Сообщения
  readonly errorMessage: Locator
  readonly resendVerificationButton: Locator
  readonly resendSuccessMessage: Locator

  // Ссылки
  readonly forgotPasswordLink: Locator
  readonly registerLink: Locator

  // OAuth кнопки
  readonly yandexButton: Locator
  readonly telegramButton: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок
    this.heading = page.locator('h1', { hasText: 'Вход' })

    // Поля формы
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[type="password"]')

    // Кнопка отправки формы (исключаем OAuth кнопки)
    this.submitButton = page.locator('form button[type="submit"]:not([data-testid="oauth-button"])', {
      hasText: 'Войти',
    })

    // Сообщения
    this.errorMessage = page.locator('[class*="red"]').first()
    this.resendVerificationButton = page.locator('button', { hasText: 'Отправить письмо повторно' })
    this.resendSuccessMessage = page.locator('[class*="green"]', { hasText: 'Письмо отправлено' })

    // Ссылки (ищем по тексту, т.к. href может быть без /ru/ prefix)
    this.forgotPasswordLink = page.locator('a', { hasText: 'Забыли пароль?' })
    this.registerLink = page.locator('a', { hasText: 'Зарегистрироваться' })

    // OAuth кнопки (если есть)
    this.yandexButton = page.locator('[data-testid="yandex-login"]')
    this.telegramButton = page.locator('[data-testid="telegram-login"]')
  }

  /**
   * Переход на страницу входа
   */
  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Заполнение формы входа
   * ВАЖНО: В WebKit нужен click() перед fill() для корректной работы
   */
  async fillForm(email: string, password: string) {
    await this.emailInput.waitFor({ state: 'visible' })

    await this.emailInput.click()
    await this.emailInput.fill(email)

    await this.passwordInput.click()
    await this.passwordInput.fill(password)
  }

  /**
   * Отправка формы
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Полный процесс входа
   */
  async login(email: string, password: string) {
    await this.goto()
    await this.fillForm(email, password)
    await this.submit()
  }

  /**
   * Ожидание успешного входа (редирект)
   */
  async waitForLoginSuccess(timeout = 10000) {
    // Матчит /ru/, /ru/profile/, /ru/admin/, /ru/catalog/ (с trailingSlash: true)
    await this.page.waitForURL(/\/ru\/(?:profile|admin|catalog)?(?:\/)?$/, { timeout })
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

  /**
   * Проверка отображения кнопки повторной отправки верификации
   */
  async isResendVerificationVisible(): Promise<boolean> {
    return this.resendVerificationButton.isVisible()
  }

  /**
   * Повторная отправка письма верификации
   */
  async resendVerification() {
    await this.resendVerificationButton.click()
  }
}
