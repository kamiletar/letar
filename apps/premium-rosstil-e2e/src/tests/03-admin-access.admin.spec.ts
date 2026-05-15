/**
 * Тесты доступа к админ-панели
 *
 * Проверяем, что обычный пользователь (role=USER) не имеет доступа к админке
 */
import { expect, test } from '../fixtures/auth.fixture'

import { localePath } from '../config/i18n'

test.describe('06-guest: Доступ к админке', () => {
  test.describe('Обычный пользователь', () => {
    test('на /admin → redirect на главную', async ({ userPage }) => {
      await userPage.goto(localePath('/admin'))
      // Пользователь с role=USER не имеет доступа - перенаправляется на главную или signin
      // URL должен НЕ содержать /admin
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('на /admin/products → redirect', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/products'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('на /admin/sizes → redirect', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/sizes'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('на /admin/images → redirect', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/images'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('на /admin/users → redirect', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/users'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('на /admin/custom-orders → redirect', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/custom-orders'))
      await expect(userPage).not.toHaveURL(/\/ru\/admin/)
    })

    test('ссылка на админку не отображается для пользователя', async ({ userPage }) => {
      await userPage.goto(localePath('/'))
      // Должен быть виден пользовательский профиль
      const adminLink = userPage.getByRole('link', { name: /админ|admin/i })
      await expect(adminLink).toBeHidden()
    })
  })

  test.describe('Админ', () => {
    test('имеет доступ к /admin', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin'))
      // Админ должен остаться на странице админки
      await expect(adminPage).toHaveURL(/\/ru\/admin/)
    })

    test('имеет доступ к /admin/products', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/products'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/products/)
    })

    test('имеет доступ к /admin/sizes', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/sizes'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/sizes/)
    })

    test('имеет доступ к /admin/images', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/images'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/images/)
    })

    test('имеет доступ к /admin/users', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/users'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/users/)
    })

    test('имеет доступ к /admin/custom-orders', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/custom-orders'))
      await expect(adminPage).toHaveURL(/\/ru\/admin\/custom-orders/)
    })
  })
})
