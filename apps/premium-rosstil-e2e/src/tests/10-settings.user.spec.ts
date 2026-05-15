/**
 * Тесты настроек пользователя (Settings)
 *
 * Тестируем:
 * - Главная страница настроек
 * - Настройки уведомлений
 * - Диалог удаления аккаунта (без фактического удаления)
 */
import { expect, test } from '@playwright/test'

import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { NotificationSettingsPage, SettingsPage } from '../pages/settings'

test.describe.serial('03-user: Настройки', () => {
  test.beforeAll(async () => {
    await ensureTestUser(TEST_USER)
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Доступ без авторизации ===
  // Тесты на неавторизованного пользователя находятся в 02-protected-redirects.guest.spec.ts

  // === Главная страница настроек ===
  test.describe('Главная страница настроек /profile/settings', () => {
    test('страница загружается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(page).toHaveURL(/\/ru\/profile\/settings/i)
    })

    test('заголовок "Настройки" отображается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(settingsPage.heading).toBeVisible()
    })

    test('секция уведомлений отображается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(page.getByText(/уведомления/i).first()).toBeVisible()
    })

    test('кнопка "Настроить уведомления" отображается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(settingsPage.notificationsLink).toBeVisible()
    })

    test('клик на "Настроить уведомления" ведёт на страницу настроек уведомлений', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await settingsPage.goToNotifications()

      await expect(page).toHaveURL(/\/ru\/profile\/settings\/notifications/i)
    })

    test('секция "Опасная зона" отображается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(page.getByText(/опасная зона/i)).toBeVisible()
    })

    test('кнопка "Удалить аккаунт" отображается', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await expect(settingsPage.deleteAccountButton).toBeVisible()
    })
  })

  // === Диалог удаления аккаунта ===
  test.describe('Диалог удаления аккаунта', () => {
    test('клик на "Удалить аккаунт" открывает диалог', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()

      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogTitle).toBeVisible()
    })

    test('диалог содержит предупреждение', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()
      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogWarning).toBeVisible()
    })

    test('диалог содержит кнопку "Отмена"', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()
      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogCancelButton).toBeVisible()
    })

    test('диалог содержит кнопку подтверждения удаления', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()
      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogConfirmButton).toBeVisible()
    })

    test('кнопка "Отмена" закрывает диалог', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()
      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogTitle).toBeVisible()

      await settingsPage.deleteDialogCancelButton.click()

      await expect(settingsPage.deleteDialogTitle).toBeHidden()
    })

    test('Escape закрывает диалог', async ({ page }) => {
      const settingsPage = new SettingsPage(page)
      await settingsPage.goto()
      await settingsPage.openDeleteDialog()

      await expect(settingsPage.deleteDialogTitle).toBeVisible()

      await settingsPage.closeDeleteDialog()

      await expect(settingsPage.deleteDialogTitle).toBeHidden()
    })
  })

  // === Настройки уведомлений ===
  test.describe('Настройки уведомлений /profile/settings/notifications', () => {
    test('страница загружается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(page).toHaveURL(/\/ru\/profile\/settings\/notifications/i)
    })

    test('заголовок "Настройки уведомлений" отображается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(notificationsPage.heading).toBeVisible()
    })

    test('метка "Email уведомления о заказах" отображается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(notificationsPage.emailOrderStatusLabel).toBeVisible()
    })

    test('метка "Email рекламные предложения" отображается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(notificationsPage.emailPromotionsLabel).toBeVisible()
    })

    test('метка "Email рассылка новостей" отображается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(notificationsPage.emailNewsletterLabel).toBeVisible()
    })

    test('метка "SMS уведомления о заказах" отображается', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      await expect(notificationsPage.smsOrderStatusLabel).toBeVisible()
    })

    test('переключатели уведомлений отображаются', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      // Проверяем, что есть минимум 4 переключателя (может быть больше из-за push-уведомлений)
      const switches = page.locator('[data-scope="switch"]')
      const count = await switches.count()
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('переключение настройки показывает toast "Настройки сохранены"', async ({ page }) => {
      const notificationsPage = new NotificationSettingsPage(page)
      await notificationsPage.goto()

      // Переключаем одну из настроек
      await notificationsPage.toggleEmailNewsletter()

      // Ожидаем toast об успехе
      await expect(page.getByText(/настройки сохранены/i)).toBeVisible({ timeout: 5000 })

      // Возвращаем обратно
      await notificationsPage.toggleEmailNewsletter()
      await expect(page.getByText(/настройки сохранены/i)).toBeVisible({ timeout: 5000 })
    })
  })
})
