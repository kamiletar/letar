/**
 * Page Objects для админки категорий
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для страницы списка категорий /admin/categories
 */
export class AdminCategoriesListPage {
  readonly page: Page
  readonly url = localePath('/admin/categories')

  // Основные элементы
  readonly heading: Locator
  readonly createButton: Locator
  readonly categoryTable: Locator
  readonly categoryRows: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /категории/i })

    // Кнопка создания категории - либо "Создать" (когда есть категории), либо "Создать первую категорию" (пустое состояние)
    // Используем .first() так как в пустом состоянии может быть оба варианта
    this.createButton = page.getByRole('link', { name: /^Создать/ }).first()

    // Таблица/список категорий
    this.categoryTable = page.locator('[data-testid="categories-list"]')
    this.categoryRows = page.locator('[data-testid="category-row"]')

    // Пустое состояние
    this.emptyState = page.getByText(/нет категорий|категории не найдены/i)
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить количество категорий в списке
   */
  async getCategoriesCount(): Promise<number> {
    return await this.categoryRows.count()
  }

  /**
   * Найти строку категории по имени
   */
  getCategoryRow(name: string): Locator {
    return this.categoryRows.filter({ hasText: name })
  }

  /**
   * Кликнуть на кнопку редактирования категории
   */
  async clickEditCategory(name: string) {
    const row = this.getCategoryRow(name)
    await row.getByRole('link', { name: /редактировать/i }).click()
  }

  /**
   * Кликнуть на кнопку удаления категории
   */
  async clickDeleteCategory(name: string) {
    const row = this.getCategoryRow(name)
    await row.getByRole('button', { name: /удалить/i }).click()
  }

  /**
   * Проверить наличие категории в списке
   */
  async hasCategory(name: string): Promise<boolean> {
    const row = this.getCategoryRow(name)
    return (await row.count()) > 0
  }
}

/**
 * Page Object для страницы создания категории /admin/categories/new
 */
export class AdminCategoryNewPage {
  readonly page: Page
  readonly url = localePath('/admin/categories/new')

  // Элементы формы
  readonly heading: Locator
  readonly nameInput: Locator
  readonly slugInput: Locator
  readonly sortOrderInput: Locator
  readonly submitButton: Locator
  readonly cancelLink: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок
    this.heading = page.getByRole('heading', { name: /создать категорию|новая категория/i })

    // Поля формы
    this.nameInput = page.locator('input[name="name"]')
    this.slugInput = page.locator('input[name="slug"]')
    this.sortOrderInput = page.locator('input[name="sortOrder"]')

    // Кнопки
    this.submitButton = page.getByRole('button', { name: /создать/i })
    this.cancelLink = page.getByRole('link', { name: /отмена|назад/i })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Создать категорию
   */
  async createCategory(data: { name: string; slug?: string; sortOrder?: number }) {
    // Заполняем название
    await this.nameInput.click()
    await this.nameInput.fill(data.name)

    // Slug автогенерируется из названия, но можем переопределить
    if (data.slug) {
      await this.slugInput.click()
      await this.slugInput.clear()
      await this.slugInput.fill(data.slug)
    }

    // Порядок сортировки
    if (data.sortOrder !== undefined) {
      await this.sortOrderInput.click()
      await this.sortOrderInput.clear()
      await this.sortOrderInput.fill(String(data.sortOrder))
    }

    // Отправляем форму
    await this.submitButton.click()

    // Ждём навигации
    await this.page.waitForURL(/\/admin\/categories\/?$/)
  }
}

/**
 * Page Object для страницы редактирования категории /admin/categories/[id]/edit
 */
export class AdminCategoryEditPage {
  readonly page: Page

  // Элементы формы
  readonly heading: Locator
  readonly nameInput: Locator
  readonly slugInput: Locator
  readonly sortOrderInput: Locator
  readonly submitButton: Locator
  readonly deleteButton: Locator
  readonly cancelLink: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок
    this.heading = page.getByRole('heading', { name: /редактировать категорию|редактирование/i })

    // Поля формы
    this.nameInput = page.locator('input[name="name"]')
    this.slugInput = page.locator('input[name="slug"]')
    this.sortOrderInput = page.locator('input[name="sortOrder"]')

    // Кнопки
    this.submitButton = page.getByRole('button', { name: /сохранить/i })
    this.deleteButton = page.getByRole('button', { name: /удалить/i })
    this.cancelLink = page.getByRole('link', { name: /отмена|назад/i })
  }

  async goto(categoryId: string) {
    await this.page.goto(localePath(`/admin/categories/${categoryId}/edit`))
  }

  /**
   * Обновить категорию
   */
  async updateCategory(data: { name?: string; slug?: string; sortOrder?: number }) {
    if (data.name) {
      await this.nameInput.click()
      await this.nameInput.clear()
      await this.nameInput.fill(data.name)
    }

    if (data.slug) {
      await this.slugInput.click()
      await this.slugInput.clear()
      await this.slugInput.fill(data.slug)
    }

    if (data.sortOrder !== undefined) {
      await this.sortOrderInput.click()
      await this.sortOrderInput.clear()
      await this.sortOrderInput.fill(String(data.sortOrder))
    }

    await this.submitButton.click()
    await this.page.waitForURL(/\/admin\/categories\/?$/)
  }
}
