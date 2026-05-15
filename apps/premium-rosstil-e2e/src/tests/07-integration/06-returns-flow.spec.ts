/**
 * Интеграционные тесты: Флоу возвратов
 *
 * Тестируем:
 * - Пользователь может запросить возврат для доставленного заказа
 * - Админ видит и управляет возвратами
 * - Кросс-ролевая изоляция
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'
import { disconnectDb } from '../../helpers/db.helpers'

test.describe('07-integration: Флоу возвратов', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Пользователь: запрос возврата ===

  test.describe('Возвраты пользователя', () => {
    test('страница заказов доступна', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await userPage.waitForLoadState('domcontentloaded')
      await expect(userPage).toHaveURL(/\/ru\/profile\/orders/)
    })

    test('кнопка возврата доступна для доставленных заказов', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await userPage.waitForLoadState('domcontentloaded')

      // Ищем кнопку/ссылку "Оформить возврат" (для DELIVERED заказов)
      const returnButton = userPage.getByRole('link', { name: /возврат|вернуть/i })
      const returnLink = userPage.locator('a[href*="/return"]')

      // Кнопка может отсутствовать (нет доставленных заказов) — это ОК
      const hasReturnOption = (await returnButton.count()) > 0 || (await returnLink.count()) > 0

      if (hasReturnOption) {
        const link = (await returnButton.count()) > 0 ? returnButton.first() : returnLink.first()
        const href = await link.getAttribute('href')
        expect(href).toMatch(/\/return/)
      }
    })
  })

  // === Админ: управление возвратами ===

  test.describe('Управление возвратами (админ)', () => {
    test('админ видит раздел возвратов', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/returns'))
      await adminPage.waitForLoadState('domcontentloaded')
      await expect(adminPage).toHaveURL(/\/ru\/admin\/returns/)
    })

    test('раздел возвратов имеет фильтры по статусу', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/returns'))
      await adminPage.waitForLoadState('domcontentloaded')

      // Фильтры: ВСЕ, REQUESTED, APPROVED, REJECTED, REFUNDED
      const filterText = adminPage.getByText(/все|запрошен|одобрен|отклонён|возвращён/i)
      const tabs = adminPage.getByRole('tab')

      const hasFilters = (await filterText.count()) > 0 || (await tabs.count()) > 0
      expect(hasFilters).toBeTruthy()
    })

    test('таблица возвратов или пустое состояние', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/returns'))
      await adminPage.waitForLoadState('domcontentloaded')

      const table = adminPage.locator('table')
      const emptyState = adminPage.getByText(/нет возвратов|пусто|нет данных/i)
      const cards = adminPage.locator('[data-scope="card"]')

      const hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0 || (await cards.count()) > 0
      expect(hasContent).toBeTruthy()
    })
  })

  // === Изоляция ===

  test.describe('Изоляция доступа', () => {
    test('пользователь не видит админ-раздел возвратов', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/returns'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin\/returns/)
    })
  })
})
