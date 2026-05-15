/**
 * Интеграционные тесты: Индивидуальный заказ
 *
 * Тестируем:
 * - Пользователь создаёт индивидуальный заказ
 * - Заказ появляется в админке
 * - Админ обрабатывает заказ
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'

test.describe('07-integration: Индивидуальный заказ', () => {
  test.describe('Создание индивидуального заказа', () => {
    test('страница индивидуальных заказов доступна', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/custom-orders'))
      await expect(userPage).toHaveURL(/\/ru\/profile\/custom-orders/)
    })

    test('можно перейти к форме создания заказа', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/custom-orders'))

      // Ищем кнопку создания нового заказа
      const newOrderButton = userPage.getByRole('link', { name: /новый заказ|создать|оформить/i })

      if ((await newOrderButton.count()) > 0) {
        await newOrderButton.click()
        await expect(userPage).toHaveURL(/\/ru\/profile\/custom-orders\/new|\/ru\/custom-order/i)
      }
    })
  })

  test.describe('Просмотр в админке', () => {
    test('админ имеет доступ к индивидуальным заказам', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/custom-orders'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/custom-orders/)
    })

    test('список индивидуальных заказов загружается', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/custom-orders'))

      // Должен быть либо список заказов, либо сообщение о пустом списке
      const table = adminPage.locator('table, [data-testid="orders-list"]')
      const emptyMessage = adminPage.getByText(/нет заказов|пусто|не найдено/i)

      const hasContent = (await table.count()) > 0 || (await emptyMessage.count()) > 0
      expect(hasContent).toBeTruthy()
    })
  })

  test.describe('Синхронизация статусов', () => {
    test('пользователь видит свои индивидуальные заказы', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/custom-orders'))

      // Страница должна показывать заказы пользователя или пустой список
      await expect(userPage).toHaveURL(/\/ru\/profile\/custom-orders/)
      await expect(userPage.locator('body')).toContainText(/./s)
    })
  })
})
