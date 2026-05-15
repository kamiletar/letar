/**
 * Page Objects для страниц замеров пользователя
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы просмотра замеров /profile/measurements
 */
export class MeasurementsPage {
  readonly page: Page
  readonly url = localePath('/profile/measurements')

  // Empty state (когда нет замеров)
  readonly emptyState: Locator
  readonly emptyStateIcon: Locator
  readonly emptyStateHeading: Locator
  readonly emptyStateText: Locator
  readonly addMeasurementsButton: Locator

  // Данные замеров (когда есть)
  readonly measurementsCard: Locator
  readonly measurementsHeading: Locator
  readonly genderBadge: Locator
  readonly genderText: Locator

  // Значения замеров
  readonly bustValue: Locator
  readonly waistValue: Locator
  readonly hipsValue: Locator
  readonly heightValue: Locator
  readonly preferredSizeValue: Locator
  readonly notesSection: Locator

  // Кнопка редактирования
  readonly editButton: Locator

  // Секция рекомендации размера
  readonly sizeRecommendationCard: Locator
  readonly sizeRecommendationHeading: Locator

  constructor(page: Page) {
    this.page = page

    // Empty state
    this.emptyState = page.locator('h2, h3, h4', { hasText: 'У вас пока нет сохраненных замеров' }).locator('..')
    this.emptyStateIcon = page.locator('svg')
    this.emptyStateHeading = page.getByRole('heading', { name: /нет сохраненных замеров/i })
    this.emptyStateText = page.getByText(/Добавьте ваши измерения/i)
    // Кнопка добавления замеров в empty state - ссылка на edit (с или без trailing slash)
    this.addMeasurementsButton = page
      .locator('a')
      .filter({ hasText: /добавить|заполнить|внести|замеры/i })
      .first()

    // Данные замеров
    this.measurementsCard = page
      .locator('[data-part="root"]')
      .filter({ has: page.getByRole('heading', { name: /измерения/i }) })
    this.measurementsHeading = page.getByRole('heading', { name: /измерения/i })
    this.genderBadge = page.locator('[data-part="badge"]')
    this.genderText = page.getByText(/мужской|женский/i).first()

    // Значения замеров (DataList)
    this.bustValue = page
      .locator('[data-part="item-label"]', { hasText: 'Обхват груди' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.waistValue = page
      .locator('[data-part="item-label"]', { hasText: 'Обхват талии' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.hipsValue = page
      .locator('[data-part="item-label"]', { hasText: 'Обхват бедер' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.heightValue = page
      .locator('[data-part="item-label"]', { hasText: 'Рост' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.preferredSizeValue = page
      .locator('[data-part="item-label"]', { hasText: 'Предпочтительный размер' })
      .locator('..')
      .locator('[data-part="item-value"]')
    this.notesSection = page.getByRole('heading', { name: /дополнительные заметки/i })

    // Кнопка редактирования (учитываем trailing slash)
    this.editButton = page.locator(`a[href^="${localePath('/profile/measurements/edit')}"]`, {
      hasText: /редактировать замеры/i,
    })

    // Секция рекомендации размера
    this.sizeRecommendationCard = page
      .locator('[data-part="root"]')
      .filter({ has: page.getByRole('heading', { name: /рекомендованный размер/i }) })
    this.sizeRecommendationHeading = page.getByRole('heading', { name: /рекомендованный размер/i })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Проверить, отображается ли empty state
   */
  async isEmptyState(): Promise<boolean> {
    return await this.emptyStateHeading.isVisible().catch(() => false)
  }

  /**
   * Проверить, есть ли сохраненные замеры
   */
  async hasMeasurements(): Promise<boolean> {
    return await this.measurementsHeading.isVisible().catch(() => false)
  }

  /**
   * Получить отображаемое значение пола
   */
  async getGender(): Promise<string> {
    const text = await this.genderBadge.textContent()
    return text?.trim() || ''
  }
}

/**
 * Page Object для страницы редактирования замеров /profile/measurements/edit
 */
export class MeasurementsEditPage {
  readonly page: Page
  readonly url = localePath('/profile/measurements/edit')

  // Поля формы
  readonly genderSelect: Locator
  readonly genderTrigger: Locator
  readonly bustInput: Locator
  readonly waistInput: Locator
  readonly hipsInput: Locator
  readonly heightInput: Locator
  readonly preferredSizeInput: Locator
  readonly notesTextarea: Locator

  // Кнопка сохранения
  readonly submitButton: Locator

  // Секция рекомендации размера
  readonly sizeRecommendationCard: Locator
  readonly sizeRecommendationHeading: Locator

  // Инструкция по измерению
  readonly instructionCard: Locator
  readonly instructionHeading: Locator

  constructor(page: Page) {
    this.page = page

    // Поля формы
    // Пол - Select компонент с trigger (используем data-scope="select" для отличия от других triggers)
    this.genderSelect = page.locator('[data-scope="select"][data-part="root"]').first()
    this.genderTrigger = page.locator('[data-scope="select"][data-part="trigger"]').first()

    // Числовые поля
    this.bustInput = page.getByLabel(/обхват груди/i)
    this.waistInput = page.getByLabel(/обхват талии/i)
    this.hipsInput = page.getByLabel(/обхват бедер/i)
    this.heightInput = page.getByLabel(/рост/i)

    // Текстовые поля
    this.preferredSizeInput = page.getByLabel(/предпочтительный размер/i)
    this.notesTextarea = page.getByLabel(/дополнительные заметки/i)

    // Кнопка сохранения
    this.submitButton = page.getByRole('button', { name: /сохранить замеры/i })

    // Секция рекомендации размера
    this.sizeRecommendationCard = page
      .locator('[data-part="root"]')
      .filter({ has: page.getByRole('heading', { name: /рекомендованный размер/i }) })
    this.sizeRecommendationHeading = page.getByRole('heading', { name: /рекомендованный размер/i })

    // Инструкция
    this.instructionCard = page
      .locator('[data-part="root"]')
      .filter({ has: page.getByRole('heading', { name: /как правильно снять мерки/i }) })
    this.instructionHeading = page.getByRole('heading', { name: /как правильно снять мерки/i })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Выбрать пол в селекте
   */
  async selectGender(gender: 'Мужской' | 'Женский') {
    await this.genderTrigger.click()
    await this.page.getByRole('option', { name: gender }).click()
  }

  /**
   * Заполнить форму замеров
   */
  async fillForm(data: {
    gender?: 'Мужской' | 'Женский'
    bust?: number
    waist?: number
    hips?: number
    height?: number
    preferredSize?: string
    notes?: string
  }) {
    if (data.gender !== undefined) {
      await this.selectGender(data.gender)
    }
    // WebKit требует click() перед fill()
    if (data.bust !== undefined) {
      await this.bustInput.click()
      await this.bustInput.fill(String(data.bust))
    }
    if (data.waist !== undefined) {
      await this.waistInput.click()
      await this.waistInput.fill(String(data.waist))
    }
    if (data.hips !== undefined) {
      await this.hipsInput.click()
      await this.hipsInput.fill(String(data.hips))
    }
    if (data.height !== undefined) {
      await this.heightInput.click()
      await this.heightInput.fill(String(data.height))
    }
    if (data.preferredSize !== undefined) {
      await this.preferredSizeInput.click()
      await this.preferredSizeInput.fill(data.preferredSize)
    }
    if (data.notes !== undefined) {
      await this.notesTextarea.click()
      await this.notesTextarea.fill(data.notes)
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
    // Учитываем trailing slash
    await this.page.waitForURL(/\/ru\/profile\/measurements\/?$/, { timeout })
  }
}
