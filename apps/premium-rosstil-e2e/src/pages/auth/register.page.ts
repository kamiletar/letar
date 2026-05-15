/**
 * Page Object для страницы регистрации
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

export class RegisterPage {
  readonly page: Page
  readonly url = localePath('/auth/register')

  // Элементы формы
  readonly heading: Locator
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator

  // Сообщения
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Ссылки
  readonly signInLink: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок (может быть h1 или h2 в зависимости от страницы)
    this.heading = page.getByRole('heading', { name: 'Регистрация' })

    // Поля формы
    this.nameInput = page.locator('input[placeholder="Ваше имя"]')
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[placeholder="Минимум 8 символов"]')
    this.confirmPasswordInput = page.locator('input[placeholder="Повторите пароль"]')

    // Кнопка отправки
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Зарегистрироваться' })

    // Сообщения
    this.successMessage = page.locator('text=green.500')
    this.errorMessage = page.locator('text=red.500')

    // Ссылка на вход (текст "Войти", href может быть /auth/signin или /ru/auth/signin)
    this.signInLink = page.locator('a', { hasText: 'Войти' })
  }

  /**
   * Переход на страницу регистрации
   */
  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Заполнение формы регистрации
   * ВАЖНО: В WebKit нужен click() перед fill() для корректной работы
   */
  async fillForm(data: { name: string; email: string; password: string; confirmPassword?: string }) {
    // Ждём загрузки формы
    await this.nameInput.waitFor({ state: 'visible' })

    // WebKit требует click перед fill
    await this.nameInput.click()
    await this.nameInput.fill(data.name)

    await this.emailInput.click()
    await this.emailInput.fill(data.email)

    await this.passwordInput.click()
    await this.passwordInput.fill(data.password)

    await this.confirmPasswordInput.click()
    await this.confirmPasswordInput.fill(data.confirmPassword ?? data.password)
  }

  /**
   * Отправка формы
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Полный процесс регистрации
   */
  async register(data: { name: string; email: string; password: string }) {
    await this.goto()
    await this.fillForm(data)
    await this.submit()
  }

  /**
   * Ожидание сообщения об успехе
   */
  async waitForSuccess(timeout = 5000) {
    // Ждём появления зелёного текста с сообщением об успехе
    await this.page.locator('[class*="green"]').first().waitFor({ timeout })
  }

  /**
   * Получение текста ошибки
   */
  async getErrorText(): Promise<string | null> {
    const errorEl = this.page.locator('[class*="red"]').first()
    if (await errorEl.isVisible()) {
      return errorEl.textContent()
    }
    return null
  }

  /**
   * Получение ошибки конкретного поля
   */
  async getFieldError(fieldName: string): Promise<string | null> {
    // Ищем Field.ErrorText рядом с полем
    const fieldRoot = this.page.locator(`input[name="${fieldName}"]`).locator('..')
    const errorText = fieldRoot.locator('[class*="error"]')
    if (await errorText.isVisible()) {
      return errorText.textContent()
    }
    return null
  }
}
