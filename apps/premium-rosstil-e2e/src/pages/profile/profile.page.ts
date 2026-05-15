/**
 * Page Objects для страниц профиля пользователя
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы просмотра профиля /profile
 */
export class ProfilePage {
  readonly page: Page
  readonly url = localePath('/profile')

  // Основные элементы
  readonly profileCard: Locator
  readonly profileName: Locator
  readonly statusBadge: Locator

  // Информация пользователя
  readonly infoSection: Locator
  readonly nameValue: Locator
  readonly emailValue: Locator
  readonly phoneValue: Locator
  readonly genderValue: Locator
  readonly birthdateValue: Locator

  // Прогресс заполнения
  readonly completenessSection: Locator

  constructor(page: Page) {
    this.page = page

    // Основные элементы
    this.profileCard = page.locator('[data-testid="profile-form"]')
    this.profileName = page.locator('[data-testid="profile-name"]')
    this.statusBadge = page.locator('[data-part="badge"]', { hasText: /активный/i })

    // Информация - используем DataList
    this.infoSection = page.locator('h2, h3, h4', { hasText: 'Информация' }).locator('..')
    this.nameValue = page
      .locator('[data-part="item-label"]', { hasText: 'Имя' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.emailValue = page
      .locator('[data-part="item-label"]', { hasText: 'Email' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.phoneValue = page
      .locator('[data-part="item-label"]', { hasText: 'Телефон' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.genderValue = page
      .locator('[data-part="item-label"]', { hasText: 'Пол' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.birthdateValue = page
      .locator('[data-part="item-label"]', { hasText: 'Дата рождения' })
      .locator('..')
      .locator('[data-part="item-value"]')

    // Прогресс заполнения
    this.completenessSection = page.getByText(/заполнение профиля|прогресс/i)
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить отображаемое имя пользователя
   */
  async getUserName(): Promise<string> {
    const text = await this.profileName.textContent()
    return text?.trim() || ''
  }
}

/**
 * Page Object для страницы редактирования профиля /profile/edit
 */
export class ProfileEditPage {
  readonly page: Page
  readonly url = localePath('/profile/edit')

  // Аватар
  readonly avatarSection: Locator
  readonly avatarImage: Locator

  // Поля формы
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly genderSelect: Locator
  readonly birthdateInput: Locator

  // Кнопка сохранения
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page

    // Аватар
    this.avatarSection = page.locator('[data-part="root"]', { has: page.locator('[data-part="fallback"]') })
    this.avatarImage = page.locator('[data-part="image"]')

    // Поля формы
    this.nameInput = page.getByLabel(/имя/i)
    this.emailInput = page.getByLabel(/email/i)
    this.phoneInput = page.getByLabel(/телефон/i)
    this.genderSelect = page.getByRole('combobox', { name: /пол/i })
    this.birthdateInput = page.getByLabel(/дата рождения/i)

    // Кнопка сохранения
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Сохранить изменения' })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Заполнить форму профиля
   * ВАЖНО: В WebKit нужен click() перед fill() для корректной работы
   */
  async fillForm(data: {
    name?: string
    email?: string
    phone?: string
    gender?: 'MALE' | 'FEMALE'
    birthdate?: string
  }) {
    if (data.name !== undefined) {
      await this.nameInput.click()
      await this.nameInput.fill(data.name)
    }
    if (data.email !== undefined) {
      await this.emailInput.click()
      await this.emailInput.fill(data.email)
    }
    if (data.phone !== undefined) {
      await this.phoneInput.click()
      await this.phoneInput.fill(data.phone)
    }
    if (data.gender !== undefined) {
      await this.genderSelect.selectOption(data.gender)
    }
    if (data.birthdate !== undefined) {
      await this.birthdateInput.click()
      await this.birthdateInput.fill(data.birthdate)
    }
  }

  /**
   * Отправить форму
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Ожидать редирект после сохранения
   */
  async waitForSaveSuccess(timeout = 10000) {
    await this.page.waitForURL(/\/ru\/profile$/, { timeout })
  }
}
