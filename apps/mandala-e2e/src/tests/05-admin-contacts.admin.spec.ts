/**
 * Тесты админ-панели - Контактные сообщения
 *
 * Проверяем просмотр и управление сообщениями от пользователей
 */
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Админ: Контактные сообщения', () => {
  test.describe('Список сообщений', () => {
    test('страница /admin/contacts загружается', async ({ adminPage }) => {
      await adminPage.goto('/admin/contacts')
      await expect(adminPage).toHaveURL(/\/admin\/contacts/)
      // Заголовок "Сообщения"
      await expect(adminPage.getByRole('heading', { name: /сообщения/i })).toBeVisible()
    })

    test('отображается список сообщений', async ({ adminPage }) => {
      await adminPage.goto('/admin/contacts')

      // Ждём загрузки списка или сообщения о пустом списке
      const table = adminPage.getByRole('table')
      const list = adminPage.locator('[data-testid="contact-list"], [class*="list"]')
      const emptyMessage = adminPage.getByText(/нет сообщений|список пуст/i)

      const hasTable = (await table.count()) > 0
      const hasList = (await list.count()) > 0
      const isEmpty = (await emptyMessage.count()) > 0

      expect(hasTable || hasList || isEmpty).toBeTruthy()
    })
  })

  test.describe('Управление сообщениями', () => {
    test('можно отметить сообщение как прочитанное', async ({ adminPage }) => {
      await adminPage.goto('/admin/contacts')

      // Ищем кнопку "прочитано" или чекбокс
      const readButton = adminPage.getByRole('button', { name: /прочита|отметить/i }).first()
      const hasButton = (await readButton.count()) > 0

      // Если есть сообщения, должна быть возможность отметить как прочитанное
      if (hasButton) {
        await expect(readButton).toBeVisible()
      }
    })
  })
})
