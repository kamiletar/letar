/**
 * Тест: Управление индивидуальными заказами
 *
 * Сценарий: Просмотр списка индивидуальных заказов
 *   Дано я залогинен как admin@test.local
 *   Когда я перехожу на /admin/custom-orders
 *   Тогда я вижу таблицу заказов
 *   И каждая строка показывает: номер, тип, клиент, статус, дату
 *
 * Сценарий: Фильтрация по статусу и типу
 * Сценарий: Просмотр статистики
 *
 * Примечание: Тесты изменения статуса заказа требуют наличия заказов в БД.
 * Создание индивидуальных заказов тестируется в пользовательских тестах (Фаза 3).
 */
import { expect, test } from '@playwright/test'
import { disconnectDb, getCustomOrdersCount } from '../helpers/db.helpers'
import { AdminCustomOrdersListPage, AdminCustomOrdersStatsPage } from '../pages/admin'

test.describe.serial('02-admin: Управление индивидуальными заказами', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница списка индивидуальных заказов', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем заголовок
    await expect(ordersPage.heading).toBeVisible()
    await expect(ordersPage.heading).toHaveText('Специальные заказы')
  })

  test('должна отображаться кнопка перехода к статистике', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем наличие кнопки статистики
    await expect(ordersPage.statsButton).toBeVisible()
    await expect(ordersPage.statsButton).toHaveText(/Статистика/)
  })

  test('должны отображаться фильтры по типу заказа', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем наличие фильтров по типу
    await expect(ordersPage.typeFilterAll).toBeVisible()
    await expect(ordersPage.typeFilterMadeToOrder).toBeVisible()
    await expect(ordersPage.typeFilterCustomDesign).toBeVisible()
    await expect(ordersPage.typeFilterB2B).toBeVisible()
  })

  test('должны отображаться фильтры по статусу заказа', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем наличие фильтров по статусу
    await expect(ordersPage.statusFilterAll).toBeVisible()
    await expect(ordersPage.statusFilterNew).toBeVisible()
    await expect(ordersPage.statusFilterConfirmed).toBeVisible()
    await expect(ordersPage.statusFilterInProduction).toBeVisible()
    await expect(ordersPage.statusFilterCompleted).toBeVisible()
    await expect(ordersPage.statusFilterCancelled).toBeVisible()
  })

  test('должно отображаться поле поиска', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем наличие поля поиска
    await expect(ordersPage.searchInput).toBeVisible()
    await expect(ordersPage.searchInput).toHaveAttribute('placeholder', /Поиск по номеру заказа/)
  })

  test('должна отображаться кнопка экспорта в Excel', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем наличие кнопки экспорта
    await expect(ordersPage.exportButton).toBeVisible()
    await expect(ordersPage.exportButton).toHaveText(/Экспорт в Excel/)
  })

  test('счётчик результатов должен соответствовать БД', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Получаем количество заказов из БД
    const dbCount = await getCustomOrdersCount()

    // Получаем количество из UI
    const { total } = await ordersPage.getDisplayedCount()
    expect(total).toBe(dbCount)
  })

  test('таблица должна содержать корректные заголовки колонок', async ({ page }) => {
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()

    // Проверяем заголовки колонок таблицы
    const headerRow = ordersPage.ordersTable.locator('thead tr')
    await expect(headerRow.locator('th', { hasText: 'Номер' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Тип' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Статус' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Клиент' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Товар' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Создано' })).toBeVisible()
    await expect(headerRow.locator('th', { hasText: 'Действия' })).toBeVisible()
  })

  // ============================================================
  // Тесты страницы статистики
  // ============================================================

  test('должна открываться страница статистики заказов', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем заголовок
    await expect(statsPage.heading).toBeVisible()
    await expect(statsPage.heading).toHaveText('Статистика заказов')
  })

  test('на странице статистики должны отображаться карточки метрик', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем наличие карточек
    await expect(statsPage.totalOrdersCard).toBeVisible()
    await expect(statsPage.thisMonthCard).toBeVisible()
    await expect(statsPage.averageCheckCard).toBeVisible()
    await expect(statsPage.completionRateCard).toBeVisible()
  })

  test('на странице статистики должны отображаться статистики по типам', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем наличие карточки по типам
    await expect(statsPage.typeStatsCard).toBeVisible()
  })

  test('на странице статистики должны отображаться статистики по статусам', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем наличие карточки по статусам
    await expect(statsPage.statusStatsCard).toBeVisible()
  })

  test('на странице статистики должна отображаться таблица помесячной статистики', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем наличие таблицы по месяцам
    await expect(statsPage.monthlyTable).toBeVisible()
  })

  test('на странице статистики должна отображаться карточка последних заказов', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Проверяем наличие карточки последних заказов
    await expect(statsPage.recentOrdersCard).toBeVisible()
  })

  test('количество заказов в статистике должно соответствовать БД', async ({ page }) => {
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await statsPage.goto()

    // Получаем количество заказов из БД
    const dbCount = await getCustomOrdersCount()

    // Получаем количество из UI
    const uiCount = await statsPage.getTotalOrdersCount()
    expect(uiCount).toBe(dbCount)
  })

  test('переход между страницами списка и статистики', async ({ page }) => {
    // Переходим на страницу списка
    const ordersPage = new AdminCustomOrdersListPage(page)
    await ordersPage.goto()
    await expect(ordersPage.heading).toBeVisible()

    // Переходим на статистику
    await ordersPage.goToStats()
    const statsPage = new AdminCustomOrdersStatsPage(page)
    await expect(statsPage.heading).toBeVisible()

    // Возвращаемся к списку (ждём навигацию)
    await statsPage.goBack()
    await page.waitForLoadState('domcontentloaded')
    await expect(ordersPage.heading).toBeVisible({ timeout: 10000 })
  })
})
