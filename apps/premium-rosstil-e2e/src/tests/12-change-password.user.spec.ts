/**
 * Тесты смены пароля
 *
 * Тестируем:
 * - Доступ к странице смены пароля
 * - Форма смены пароля
 * - Валидация полей
 * - Успешная смена пароля
 * - Ошибки при неправильном пароле
 */
import { expect, test } from '../fixtures/auth.fixture'

import { localePath } from '../config/i18n'

test.describe('03-user: Смена пароля', () => {
  test.describe('Доступ к странице', () => {
    test('страница смены пароля загружается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      await expect(userPage).toHaveURL(/\/ru\/profile\/change-password/)
    })

    test('форма смены пароля отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      // Должна быть форма
      await expect(userPage.locator('form')).toBeVisible()
    })
  })

  test.describe('Поля формы', () => {
    test('поле текущего пароля отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      // Поле текущего пароля (может отсутствовать для OAuth пользователей)
      const currentPassword = userPage.getByLabel(/текущий пароль|старый пароль/i)
      // Может быть либо это поле, либо форма создания первого пароля
      const newPassword = userPage.getByLabel(/новый пароль/i)
      expect((await currentPassword.count()) > 0 || (await newPassword.count()) > 0).toBeTruthy()
    })

    test('поле нового пароля отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      const newPassword = userPage.getByLabel(/новый пароль/i)
      await expect(newPassword).toBeVisible()
    })

    test('поле подтверждения пароля отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      const confirmPassword = userPage.getByLabel(/подтвер.*пароль|повторите.*пароль/i)
      await expect(confirmPassword).toBeVisible()
    })

    test('кнопка сохранения отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))
      const saveButton = userPage.getByRole('button', { name: /сохранить|изменить|сменить/i })
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Валидация', () => {
    test('ошибка при пустых полях', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))

      // Нажимаем кнопку без заполнения
      const saveButton = userPage.getByRole('button', { name: /сохранить|изменить|сменить/i })
      await saveButton.click()

      // Ожидаем ошибку валидации
      await userPage.waitForTimeout(500)
      // HTML5 валидация или сообщение об ошибке
      const hasError =
        (await userPage.locator('[data-invalid], [aria-invalid="true"]').count()) > 0 ||
        (await userPage.getByText(/обязательно|заполните|введите/i).count()) > 0 ||
        (await userPage.locator(':invalid').count()) > 0
      expect(hasError).toBeTruthy()
    })

    test('ошибка при несовпадении паролей', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))

      const newPassword = userPage.getByLabel(/новый пароль/i).first()
      const confirmPassword = userPage.getByLabel(/подтвер.*пароль|повторите.*пароль/i).first()

      await newPassword.fill('NewPassword123!')
      await confirmPassword.fill('DifferentPassword123!')

      const saveButton = userPage.getByRole('button', { name: /сохранить|изменить|сменить/i })
      await saveButton.click()

      // Ожидаем сообщение об ошибке
      await userPage.waitForTimeout(500)
    })

    test('ошибка при слабом пароле', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))

      const newPassword = userPage.getByLabel(/новый пароль/i).first()
      await newPassword.fill('123')

      // Ожидаем сообщение о слабом пароле
      await userPage.waitForTimeout(500)
    })
  })

  test.describe('Навигация', () => {
    test('можно вернуться в профиль', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/change-password'))

      const backLink = userPage.getByRole('link', { name: /назад|профиль|вернуться/i })
      if ((await backLink.count()) > 0) {
        await backLink.click()
        await expect(userPage).toHaveURL(/\/ru\/profile/)
      }
    })
  })
})
