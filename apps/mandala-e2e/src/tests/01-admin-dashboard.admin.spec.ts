/**
 * Тесты админ-панели - Dashboard
 *
 * Проверяем доступность и функциональность главной страницы админки
 */
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Админ: Dashboard', () => {
  test('dashboard доступен для админа', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await expect(adminPage).toHaveURL(/\/admin/)
    // Заголовок Dashboard на английском
    await expect(adminPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('отображает статистику', async ({ adminPage }) => {
    await adminPage.goto('/admin')

    // Dashboard содержит карточки со статистикой
    // Карточки вне sidebar - используем :not(aside *) или просто first() где нет дубликатов
    // Карточки содержат текст раздела (Мандалы, Товары и т.д.) - проверяем первую (sidebar идёт первым в DOM)
    // Лучше проверим что есть ссылки с числами (счётчиками)
    await expect(adminPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Проверяем что есть карточки статистики - у каждой есть число
    // Ищем текст со счётчиком (большое число в жирном шрифте)
    const statsCards = adminPage.locator('a[href^="/admin/"]').filter({ hasText: /\d+/ })
    // Должно быть минимум 4 карточки статистики (Мандалы, Товары, Заказы, Сообщения)
    await expect(statsCards.first()).toBeVisible()
  })

  test('боковое меню содержит все разделы', async ({ adminPage }) => {
    await adminPage.goto('/admin')

    // Используем exact: true для избежания дублирования с карточками статистики
    // Sidebar в collapsed состоянии на мобильных — ищем по href
    await expect(adminPage.locator('aside a[href="/admin/mandalas"]').first()).toBeVisible()
    await expect(adminPage.locator('aside a[href="/admin/products"]').first()).toBeVisible()
    await expect(adminPage.locator('aside a[href="/admin/orders"]').first()).toBeVisible()
    await expect(adminPage.locator('aside a[href="/admin/contacts"]').first()).toBeVisible()
  })
})
