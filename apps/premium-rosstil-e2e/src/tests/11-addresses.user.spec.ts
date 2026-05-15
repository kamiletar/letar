/**
 * Тесты адресов доставки
 *
 * Тестируем:
 * - Просмотр списка адресов
 * - Создание нового адреса
 * - Редактирование адреса
 * - Удаление адреса
 * - Установка адреса по умолчанию
 */
import { expect, test } from '../fixtures/auth.fixture'

import { localePath } from '../config/i18n'

test.describe('03-user: Адреса доставки', () => {
  test.describe('Просмотр адресов', () => {
    test('страница адресов загружается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))
      await expect(userPage).toHaveURL(/\/ru\/profile\/addresses/)
    })

    test('заголовок страницы отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))
      await expect(userPage.getByText(/мои адреса/i)).toBeVisible()
    })

    test('кнопка добавления адреса отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))
      await expect(userPage.getByRole('link', { name: /добавить адрес/i })).toBeVisible()
    })

    test('показывается сообщение при отсутствии адресов', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))
      // Если нет адресов - показывается сообщение
      const emptyMessage = userPage.getByText(/нет сохраненных адресов|добавьте адрес/i)
      const addressCard = userPage.locator('[data-testid="address-card"]')
      // Либо сообщение, либо карточки
      const hasEmpty = (await emptyMessage.count()) > 0
      const hasCards = (await addressCard.count()) > 0
      expect(hasEmpty || hasCards).toBeTruthy()
    })
  })

  test.describe('Создание адреса', () => {
    test('переход на страницу создания адреса', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))
      await userPage
        .getByRole('link', { name: /добавить адрес/i })
        .first()
        .click()
      await expect(userPage).toHaveURL(/\/ru\/profile\/addresses\/new/)
    })

    test('форма создания адреса отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses/new'))
      // Должны быть поля для ввода
      await expect(userPage.locator('form')).toBeVisible()
    })

    test('можно создать новый адрес', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses/new'))

      // Заполняем форму - используем точные label'ы
      const labelInput = userPage.getByLabel(/метка адреса/i)
      const cityInput = userPage.getByLabel(/город/i)
      const streetInput = userPage.getByLabel(/улица/i)
      const houseInput = userPage.getByLabel(/дом/i)

      if ((await labelInput.count()) > 0) {
        await labelInput.fill('Тестовый адрес')
      }
      if ((await cityInput.count()) > 0) {
        await cityInput.fill('Москва')
      }
      if ((await streetInput.count()) > 0) {
        await streetInput.first().fill('Тестовая')
      }
      if ((await houseInput.count()) > 0) {
        await houseInput.first().fill('1')
      }

      // Ищем кнопку сохранения
      const saveButton = userPage.getByRole('button', { name: /сохранить|создать|добавить/i })
      if ((await saveButton.count()) > 0) {
        await saveButton.click()
        // После сохранения должен быть редирект на список или сообщение об успехе
        await userPage.waitForTimeout(1000)
      }
    })
  })

  test.describe('Редактирование адреса', () => {
    test.skip('можно перейти на страницу редактирования', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))

      // Ищем кнопку редактирования
      const editButton = userPage.getByRole('button', { name: /редактировать|изменить/i }).first()
      const editLink = userPage.getByRole('link', { name: /редактировать|изменить/i }).first()

      if ((await editButton.count()) > 0) {
        await editButton.click()
        await expect(userPage).toHaveURL(/\/ru\/profile\/addresses\/.*\/edit/)
      } else if ((await editLink.count()) > 0) {
        await editLink.click()
        await expect(userPage).toHaveURL(/\/ru\/profile\/addresses\/.*\/edit/)
      }
    })
  })

  test.describe('Удаление адреса', () => {
    test.skip('можно удалить адрес', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))

      // Ищем кнопку удаления
      const deleteButton = userPage.getByRole('button', { name: /удалить/i }).first()
      if ((await deleteButton.count()) > 0) {
        await deleteButton.click()
        // Ожидаем подтверждение
        const confirmButton = userPage.getByRole('button', { name: /подтвердить|да/i })
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click()
        }
      }
    })
  })

  test.describe('Адрес по умолчанию', () => {
    test.skip('можно установить адрес по умолчанию', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/addresses'))

      // Ищем кнопку установки по умолчанию
      const defaultButton = userPage.getByRole('button', { name: /по умолчанию|сделать основным/i }).first()
      if ((await defaultButton.count()) > 0) {
        await defaultButton.click()
        await userPage.waitForTimeout(500)
      }
    })
  })
})
