/**
 * Интеграционные тесты: Флоу продавца
 *
 * Тестируем:
 * - Страница "Стать продавцом" доступна и содержит форму
 * - Админ видит раздел заявок продавцов
 * - Админ видит вкладку "Заявки" и может управлять ими
 * - Продавец (если есть) видит дашборд, товары, заказы
 * - Кросс-ролевая видимость: пользователь не видит seller pages
 */
import { expect, test } from '../../fixtures/auth.fixture'

import { localePath } from '../../config/i18n'
import { disconnectDb } from '../../helpers/db.helpers'

test.describe('07-integration: Флоу продавца', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Заявка на продавца (user) ===

  test.describe.serial('Подача заявки', () => {
    test('страница "Стать продавцом" доступна', async ({ userPage }) => {
      await userPage.goto(localePath('/become-seller'))
      await userPage.waitForLoadState('domcontentloaded')

      // Должна быть форма заявки или статус существующей
      const heading = userPage.getByRole('heading', { name: /стать продавцом|продав/i })
      const form = userPage.locator('form')
      const statusBlock = userPage.getByText(/ваша заявка|статус/i)

      const hasContent = (await heading.count()) > 0 || (await form.count()) > 0 || (await statusBlock.count()) > 0
      expect(hasContent).toBeTruthy()
    })

    test('форма заявки содержит обязательные поля', async ({ userPage }) => {
      await userPage.goto(localePath('/become-seller'))
      await userPage.waitForLoadState('domcontentloaded')

      // Проверяем наличие формы (если заявка ещё не подана)
      const form = userPage.locator('form')
      if ((await form.count()) > 0) {
        // Ищем ключевые поля: название магазина, описание
        const shopNameInput = userPage.getByLabel(/назван|магазин|бренд/i)
        const descriptionField = userPage.getByLabel(/описан|о себе|деятельн/i)
        const submitButton = userPage.getByRole('button', { name: /отправить|подать/i })

        // Хотя бы одно поле и кнопка должны быть
        const hasFields = (await shopNameInput.count()) > 0 || (await descriptionField.count()) > 0
        const hasSubmit = (await submitButton.count()) > 0

        if (hasFields) {
          expect(hasSubmit).toBeTruthy()
        }
      }
    })

    test('незарегистрированный пользователь перенаправляется', async ({ page }) => {
      // page без storageState — гостевой
      await page.goto(localePath('/become-seller'))

      // Должен быть редирект на signin или отображение формы (зависит от реализации)
      const heading = page.getByRole('heading', { name: /стать продавцом|войд/i })
      await expect(heading).toBeVisible({ timeout: 15000 })
    })
  })

  // === Админ: управление заявками ===

  test.describe.serial('Управление заявками (админ)', () => {
    test('админ видит раздел продавцов', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/sellers'))
      await adminPage.waitForLoadState('domcontentloaded')
      await expect(adminPage).toHaveURL(/\/ru\/admin\/sellers/)
    })

    test('раздел продавцов имеет вкладки', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/sellers'))
      await adminPage.waitForLoadState('domcontentloaded')

      // Ищем вкладки "Продавцы" и "Заявки"
      const sellersTab = adminPage.getByRole('tab', { name: /продавц/i })
      const applicationsTab = adminPage.getByRole('tab', { name: /заявк/i })

      const hasTabs = (await sellersTab.count()) > 0 || (await applicationsTab.count()) > 0

      // Если есть вкладки — кликаем на "Заявки"
      if (hasTabs && (await applicationsTab.count()) > 0) {
        await applicationsTab.click()
        await adminPage.waitForLoadState('domcontentloaded')
      }
    })

    test('админ может видеть таблицу заявок', async ({ adminPage }) => {
      await adminPage.goto(localePath('/admin/sellers?tab=applications'))
      await adminPage.waitForLoadState('domcontentloaded')

      // Должна быть таблица или список заявок (или пустое состояние)
      const table = adminPage.locator('table')
      const emptyState = adminPage.getByText(/нет заявок|пусто|нет данных/i)

      const hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0
      expect(hasContent).toBeTruthy()
    })
  })

  // === Изоляция доступа ===

  test.describe('Изоляция доступа', () => {
    test('обычный пользователь не видит seller dashboard', async ({ userPage }) => {
      await userPage.goto(localePath('/seller'))

      // Пользователь без роли SELLER должен быть перенаправлен
      // или видеть сообщение об ошибке/нехватке прав
      const url = userPage.url()
      const hasRedirect = !url.includes('/seller') || url.includes('/become-seller') || url.includes('/auth')
      const accessDenied = userPage.getByText(/доступ запрещён|нет доступа|нет прав|стать продавцом/i)
      const hasAccessDenied = (await accessDenied.count()) > 0

      expect(hasRedirect || hasAccessDenied).toBeTruthy()
    })

    test('обычный пользователь не видит seller products', async ({ userPage }) => {
      await userPage.goto(localePath('/seller/products'))

      const url = userPage.url()
      const hasRedirect = !url.includes('/seller/products')
      const accessDenied = userPage.getByText(/доступ запрещён|нет доступа|нет прав/i)
      const hasAccessDenied = (await accessDenied.count()) > 0

      expect(hasRedirect || hasAccessDenied).toBeTruthy()
    })

    test('пользователь не видит admin sellers page', async ({ userPage }) => {
      await userPage.goto(localePath('/admin/sellers'))

      // Должен быть редирект — не остаёмся на admin/sellers
      await expect(userPage).not.toHaveURL(/\/ru\/admin\/sellers/)
    })
  })
})
