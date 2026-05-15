/**
 * Page Object для страницы управления размерами в админке
 */
import type { Locator, Page } from '@playwright/test'

export class AdminSizesPage {
  readonly page: Page
  readonly url = '/admin/sizes'

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator

  // Кнопки создания
  readonly createFromPresetButton: Locator
  readonly createButton: Locator

  // Таблица размеров
  readonly sizesTable: Locator
  readonly emptyStateMessage: Locator

  // Модальное окно пресетов
  readonly presetModal: Locator
  readonly presetModalTitle: Locator
  readonly presetModalCloseButton: Locator

  // Пресеты в модальном окне
  readonly femaleStandardPreset: Locator
  readonly maleStandardPreset: Locator
  readonly femalePlusSizePreset: Locator
  readonly malePlusSizePreset: Locator
  readonly femalePetitePreset: Locator
  readonly femaleTallPreset: Locator

  // Результат создания
  readonly resultMessage: Locator
  readonly resultStats: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация (Chakra Heading size="2xl" рендерится как h2 по умолчанию)
    this.heading = page.locator('h2, h1', { hasText: 'Размеры' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к панели администратора' })

    // Кнопки создания (используем точное совпадение текста)
    this.createFromPresetButton = page.locator('button', { hasText: 'Создать из шаблона' })
    this.createButton = page.getByRole('link', { name: 'Создать', exact: true })

    // Таблица размеров
    this.sizesTable = page.locator('table')
    this.emptyStateMessage = page.locator('text=Нет размеров для отображения')

    // Модальное окно пресетов (внутри Portal)
    this.presetModal = page.locator('[role="dialog"]')
    this.presetModalTitle = this.presetModal.locator('text=Создать размеры из шаблона')
    this.presetModalCloseButton = this.presetModal.locator('button', { hasText: /Закрыть|Отмена/ })

    // Пресеты в модальном окне - ищем по заголовку пресета
    this.femaleStandardPreset = this.presetModal.locator('h3', { hasText: 'Женские размеры (стандарт)' }).locator('..')
    this.maleStandardPreset = this.presetModal.locator('h3', { hasText: 'Мужские размеры (стандарт)' }).locator('..')
    this.femalePlusSizePreset = this.presetModal.locator('h3', { hasText: 'Женские размеры (Plus Size)' }).locator('..')
    this.malePlusSizePreset = this.presetModal.locator('h3', { hasText: 'Мужские размеры (Plus Size)' }).locator('..')
    this.femalePetitePreset = this.presetModal.locator('h3', { hasText: 'Женские размеры (Petite)' }).locator('..')
    this.femaleTallPreset = this.presetModal.locator('h3', { hasText: 'Женские размеры (Tall)' }).locator('..')

    // Результат создания
    this.resultMessage = this.presetModal.locator('[class*="green"], [class*="red"]').locator('text=/Создано|Ошибка/')
    this.resultStats = this.presetModal.locator('text=/Создано: \\d+, пропущено: \\d+/')
  }

  /**
   * Переход на страницу размеров
   */
  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Открыть модальное окно создания из пресета
   */
  async openPresetModal() {
    await this.createFromPresetButton.click()
    await this.presetModal.waitFor({ state: 'visible' })
  }

  /**
   * Закрыть модальное окно
   */
  async closePresetModal() {
    await this.presetModalCloseButton.click()
    await this.presetModal.waitFor({ state: 'hidden' })
  }

  /**
   * Создать размеры из пресета по ID
   */
  async createFromPreset(presetId: string): Promise<{ created: number; skipped: number }> {
    const presetNames: Record<string, string> = {
      'female-standard': 'Женские размеры (стандарт)',
      'male-standard': 'Мужские размеры (стандарт)',
      'female-plus-size': 'Женские размеры (Plus Size)',
      'male-plus-size': 'Мужские размеры (Plus Size)',
      'female-petite': 'Женские размеры (Petite)',
      'female-tall': 'Женские размеры (Tall)',
    }

    const presetName = presetNames[presetId]
    if (!presetName) {
      throw new Error(`Unknown preset ID: ${presetId}`)
    }

    // Находим все кнопки "Создать" в модальном окне
    // Каждый пресет имеет свою кнопку в том же порядке как пресеты
    const presetOrder = [
      'female-standard',
      'male-standard',
      'female-plus-size',
      'male-plus-size',
      'female-petite',
      'female-tall',
    ]
    const presetIndex = presetOrder.indexOf(presetId)
    if (presetIndex === -1) {
      throw new Error(`Unknown preset ID: ${presetId}`)
    }

    // Кликаем на кнопку по индексу
    const createButtons = this.presetModal.getByRole('button', { name: 'Создать' })
    await createButtons.nth(presetIndex).click()

    // Ждём результат (используем waitForSelector для regex паттерна)

    await this.page.waitForSelector('text=/Создано|Ошибка/', { timeout: 10000 })

    // Парсим статистику
    const statsText = await this.presetModal.locator('text=/Создано: \\d+, пропущено: \\d+/').textContent()
    const match = statsText?.match(/Создано: (\d+), пропущено: (\d+)/)

    return {
      created: match ? parseInt(match[1], 10) : 0,
      skipped: match ? parseInt(match[2], 10) : 0,
    }
  }

  /**
   * Получить количество размеров в таблице
   */
  async getSizesCount(): Promise<number> {
    // Считаем строки в таблице (исключая заголовок и группировочные строки)
    const rows = this.sizesTable.locator('tbody tr').filter({
      hasNot: this.page.locator('td[colspan]'), // Исключаем строки-группы
    })
    return rows.count()
  }

  /**
   * Получить количество размеров по полу
   */
  async getSizesCountByGender(gender: 'Женский' | 'Мужской'): Promise<number> {
    // Ищем строки с нужным полом
    const rows = this.sizesTable.locator('tbody tr', {
      has: this.page.locator(`td:has-text("${gender}")`),
    })
    return rows.count()
  }

  /**
   * Проверить, что размер существует в таблице
   */
  async hasSizeInTable(ruSize: string, gender?: string): Promise<boolean> {
    let row = this.sizesTable.locator('tbody tr', {
      has: this.page.locator(`td:has-text("${ruSize}")`),
    })

    if (gender) {
      row = row.filter({
        has: this.page.locator(`td:has-text("${gender}")`),
      })
    }

    return (await row.count()) > 0
  }

  /**
   * Ожидание обновления таблицы после создания
   */
  async waitForTableUpdate(minCount: number, timeout = 10000) {
    await this.page.waitForFunction(
      ({ selector, minCount }) => {
        const table = document.querySelector(selector)
        if (!table) {
          return false
        }
        const rows = table.querySelectorAll('tbody tr:not(:has(td[colspan]))')
        return rows.length >= minCount
      },
      { selector: 'table', minCount },
      { timeout }
    )
  }

  /**
   * Проверить наличие группы размеров по полу
   */
  async hasGenderGroup(gender: 'Женский' | 'Мужской'): Promise<boolean> {
    const groupHeader = this.sizesTable.locator('tbody tr', {
      has: this.page.locator(`td[colspan] text="${gender.toUpperCase()}"`),
    })
    return (await groupHeader.count()) > 0
  }
}
