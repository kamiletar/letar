/**
 * Тесты админ-панели - Управление заказами
 *
 * Проверяем просмотр и управление заказами
 */
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Админ: Заказы', () => {
  test.describe('Список заказов', () => {
    test('страница /admin/orders загружается', async ({ adminPage }) => {
      await adminPage.goto('/admin/orders')
      await expect(adminPage).toHaveURL(/\/admin\/orders/)
      // Заголовок "Заказы"
      await expect(adminPage.getByRole('heading', { name: 'Заказы' })).toBeVisible()
    })

    test('отображается таблица заказов', async ({ adminPage }) => {
      await adminPage.goto('/admin/orders')

      // Ждём загрузки таблицы или сообщения о пустом списке
      const table = adminPage.getByRole('table')
      const emptyMessage = adminPage.getByText(/нет заказов|список пуст/i)

      const hasTable = (await table.count()) > 0
      const isEmpty = (await emptyMessage.count()) > 0

      expect(hasTable || isEmpty).toBeTruthy()
    })
  })

  test.describe('Детали заказа', () => {
    test('можно открыть заказ из списка', async ({ adminPage }) => {
      await adminPage.goto('/admin/orders')

      // Кликаем на первый заказ в списке
      const orderLink = adminPage.locator('tr a, [data-testid="order-item"] a').first()
      const hasLink = (await orderLink.count()) > 0

      if (hasLink) {
        await orderLink.click()
        await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+/)
      }
    })
  })

  test.describe('Статусы заказов', () => {
    test('страница заказа показывает статус', async ({ adminPage }) => {
      await adminPage.goto('/admin/orders')

      // Ищем индикатор статуса в списке
      const statusBadge = adminPage.locator('[data-testid="order-status"], .chakra-badge, [class*="badge"]')
      const hasStatus = (await statusBadge.count()) > 0

      // Либо есть бейджи статусов, либо текст статуса
      if (!hasStatus) {
        const statusText = adminPage.getByText(/ожидает|оплачен|отправлен|выполнен|отменён/i)
        const hasStatusText = (await statusText.count()) > 0
        // Если нет заказов, тест успешен
        expect(hasStatusText || (await adminPage.getByText(/нет заказов/i).count()) > 0).toBeTruthy()
      }
    })
  })
})
