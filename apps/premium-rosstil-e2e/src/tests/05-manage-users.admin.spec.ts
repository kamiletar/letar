/**
 * Тест: Управление пользователями
 *
 * Сценарий: Просмотр списка пользователей
 *   Дано я залогинен как admin@test.local
 *   Когда я перехожу на /admin/users
 *   Тогда я вижу таблицу пользователей
 *   И каждая строка показывает: имя, email, роль, дату регистрации
 *
 * Примечание: Функционал изменения ролей и фильтрации пока не реализован.
 * Тесты покрывают только просмотр списка.
 */
import { expect, test } from '@playwright/test'
import { TEST_ADMIN } from '../fixtures/test-data'
import { disconnectDb, getAdminsCount, getUsersCount } from '../helpers/db.helpers'
import { AdminUsersPage } from '../pages/admin'

test.describe.serial('02-admin: Управление пользователями', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница управления пользователями', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем заголовок
    await expect(usersPage.heading).toBeVisible()
    await expect(usersPage.heading).toHaveText('Пользователи')
  })

  test('должно отображаться общее количество пользователей', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем наличие текста с количеством пользователей
    await expect(usersPage.totalUsersText).toBeVisible()

    // Проверяем соответствие количеству в БД
    const dbCount = await getUsersCount()
    const uiCount = await usersPage.getTotalUsersCount()
    expect(uiCount).toBe(dbCount)
  })

  test('должна отображаться таблица пользователей', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем наличие таблицы
    await expect(usersPage.usersTable).toBeVisible()

    // Проверяем что есть строки в таблице
    const rowsCount = await usersPage.getTableRowsCount()
    const dbCount = await getUsersCount()
    expect(rowsCount).toBe(dbCount)
  })

  test('тестовый админ должен отображаться в списке', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем что тестовый админ есть в списке
    const hasAdmin = await usersPage.hasUser(TEST_ADMIN.email)
    expect(hasAdmin).toBe(true)
  })

  test('тестовый админ должен иметь роль "Администратор"', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем роль админа
    const isAdmin = await usersPage.isUserAdmin(TEST_ADMIN.email)
    expect(isAdmin).toBe(true)
  })

  test('таблица должна содержать все необходимые колонки', async ({ page }) => {
    const usersPage = new AdminUsersPage(page)
    await usersPage.goto()

    // Проверяем заголовки колонок
    const headerRow = usersPage.usersTable.locator('thead tr')
    await expect(headerRow.locator('th', { hasText: 'Имя' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Email' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Роль' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Дата регистрации' })).toBeVisible()
  })

  test('количество админов в БД должно быть >= 1', async () => {
    const adminsCount = await getAdminsCount()
    expect(adminsCount).toBeGreaterThanOrEqual(1)
  })
})
