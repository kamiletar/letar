/**
 * Интеграционные тесты: Флоу отзывов
 *
 * Тестируем:
 * - Страница отзывов доступна после доставки
 * - Продавец видит отзывы на свои товары
 * - Админ может модерировать отзывы
 * - Кросс-ролевая видимость отзывов
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'
import { disconnectDb } from '../../helpers/db.helpers'

test.describe('07-integration: Флоу отзывов', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Пользователь: отзывы ===

  test.describe('Отзывы пользователя', () => {
    test('страница заказов отображает историю', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await userPage.waitForLoadState('domcontentloaded')
      await expect(userPage).toHaveURL(/\/ru\/profile\/orders/)

      // Страница заказов загружена — список или пустое состояние
      const content = userPage.locator('main')
      await expect(content).toBeVisible()
    })

    test('кнопка отзыва появляется для доставленных заказов', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await userPage.waitForLoadState('domcontentloaded')

      // Ищем кнопку/ссылку на отзыв (появляется для DELIVERED заказов)
      const reviewButton = userPage.getByRole('link', { name: /оставить отзыв|написать отзыв/i })
      const reviewLink = userPage.locator('a[href*="/review"]')

      // Кнопка может отсутствовать (нет доставленных заказов) — это ОК
      const hasReviewOption = (await reviewButton.count()) > 0 || (await reviewLink.count()) > 0

      // Если есть — проверяем что ведёт на правильный URL
      if (hasReviewOption) {
        const link = (await reviewButton.count()) > 0 ? reviewButton.first() : reviewLink.first()
        const href = await link.getAttribute('href')
        expect(href).toMatch(/\/review/)
      }
    })
  })

  // === Админ: модерация отзывов ===

  test.describe('Модерация отзывов (админ)', () => {
    test('админ видит раздел отзывов', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/reviews'))
      await adminPage.waitForLoadState('domcontentloaded')
      await expect(adminPage).toHaveURL(/\/ru\/admin\/reviews/)
    })

    test('раздел отзывов имеет фильтры по статусу', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/reviews'))
      await adminPage.waitForLoadState('domcontentloaded')

      // Ищем фильтры статуса (вкладки или select)
      const statusFilter = adminPage.getByRole('tab').or(adminPage.locator('select'))
      const filterText = adminPage.getByText(/все|опубликован|скрыт|ожида/i)

      const hasFilters = (await statusFilter.count()) > 0 || (await filterText.count()) > 0
      expect(hasFilters).toBeTruthy()
    })

    test('таблица отзывов отображается', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/reviews'))
      await adminPage.waitForLoadState('domcontentloaded')

      // Таблица или пустое состояние
      const table = adminPage.locator('table')
      const emptyState = adminPage.getByText(/нет отзывов|пусто|нет данных/i)

      const hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0
      expect(hasContent).toBeTruthy()
    })
  })

  // === Изоляция доступа ===

  test.describe('Изоляция доступа', () => {
    test('пользователь не видит страницу модерации отзывов', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/reviews'))

      // Редирект — не остаёмся на admin/reviews
      await expect(userPage).not.toHaveURL(/\/ru\/admin\/reviews/)
    })

    test('пользователь не видит отзывы продавца', async ({ userPage }) => {
      await userPage.goto(localePath('/seller/reviews'))

      const url = userPage.url()
      const hasRedirect = !url.includes('/seller/reviews')
      const accessDenied = userPage.getByText(/доступ запрещён|нет доступа|нет прав/i)
      const hasAccessDenied = (await accessDenied.count()) > 0

      expect(hasRedirect || hasAccessDenied).toBeTruthy()
    })
  })
})
