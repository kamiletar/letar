/**
 * Page Object для страницы управления пользователями /admin/users
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для /admin/users
 */
export class AdminUsersPage {
  readonly page: Page
  readonly url = localePath('/admin/users')

  // Заголовок и навигация
  readonly heading: Locator
  readonly backLink: Locator
  readonly totalUsersText: Locator

  // Таблица пользователей
  readonly usersTable: Locator
  readonly tableRows: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок и навигация
    this.heading = page.locator('h1, h2', { hasText: 'Пользователи' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к панели администратора' })
    this.totalUsersText = page.locator('text=/Всего зарегистрированных пользователей:/')

    // Таблица пользователей
    this.usersTable = page.locator('[data-testid="users-table"]')
    this.tableRows = this.usersTable.locator('tbody tr')
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить количество пользователей из заголовка
   */
  async getTotalUsersCount(): Promise<number> {
    const text = await this.totalUsersText.textContent()
    const match = text?.match(/Всего зарегистрированных пользователей: (\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Получить количество строк в таблице
   */
  async getTableRowsCount(): Promise<number> {
    return this.tableRows.count()
  }

  /**
   * Получить строку пользователя по email
   */
  getUserRow(email: string): Locator {
    return this.tableRows.filter({ hasText: email })
  }

  /**
   * Проверить, что пользователь отображается в таблице
   */
  async hasUser(email: string): Promise<boolean> {
    const row = this.getUserRow(email)
    return (await row.count()) > 0
  }

  /**
   * Получить роль пользователя из таблицы
   */
  async getUserRole(email: string): Promise<string> {
    const row = this.getUserRow(email)
    const roleBadge = row.locator('[class*="badge"]').first()
    return (await roleBadge.textContent()) || ''
  }

  /**
   * Получить имя пользователя из таблицы
   */
  async getUserName(email: string): Promise<string> {
    const row = this.getUserRow(email)
    const nameCell = row.locator('td').first()
    return (await nameCell.textContent()) || ''
  }

  /**
   * Проверить, что пользователь является админом
   */
  async isUserAdmin(email: string): Promise<boolean> {
    const role = await this.getUserRole(email)
    return role === 'Администратор'
  }

  /**
   * Получить список провайдеров пользователя
   */
  async getUserProviders(email: string): Promise<string[]> {
    const row = this.getUserRow(email)
    const badges = row.locator('[class*="badge"]')
    const count = await badges.count()
    const providers: string[] = []

    // Первый badge - роль, остальные - провайдеры
    for (let i = 1; i < count; i++) {
      const text = await badges.nth(i).textContent()
      if (text) {
        providers.push(text)
      }
    }

    return providers
  }
}
