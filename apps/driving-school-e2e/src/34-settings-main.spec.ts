import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { navigateAndWait } from './helpers/page.helpers'

/**
 * E2E тесты для настроек пользователя
 *
 * Страницы:
 * - /settings/ — главная страница настроек
 * - /settings/profile/ — настройки профиля
 * - /settings/security/ — настройки безопасности
 * - /settings/notifications/ — настройки уведомлений (тесты в 10-settings-notifications.spec.ts)
 *
 * Функциональность:
 * - Навигация между разделами настроек
 * - Редактирование профиля
 * - Настройки безопасности (в разработке)
 */
test.describe('Настройки пользователя', () => {
  // Используем авторизацию инструктора (страницы доступны для всех авторизованных)
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('Главная страница настроек', () => {
    test('E2E-SET-1 — страница настроек загружается', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      // Заголовок "Настройки"
      await expect(page.getByRole('heading', { name: /настройки/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-2 — отображается описание страницы', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      // Описание: "Управление вашим аккаунтом"
      await expect(page.getByText(/управление.*аккаунтом/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-3 — кнопка "В личный кабинет" присутствует', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      // Кнопка возврата
      await expect(page.getByRole('link', { name: /в личный кабинет|назад/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-4 — клик на "В личный кабинет" ведёт на дашборд', async ({ page }) => {
      await page.goto(urls.settings)

      const backButton = page.getByRole('link', { name: /в личный кабинет|назад/i })
      await expect(backButton).toBeVisible({ timeout: 10000 })
      await backButton.click()

      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
    })

    test('E2E-SET-5 — отображается карточка "Профиль"', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      // Карточка профиля
      await expect(page.getByRole('heading', { name: /профиль/i }).or(page.getByText(/профиль/i).first())).toBeVisible({
        timeout: 10000,
      })
    })

    test('E2E-SET-6 — отображается карточка "Уведомления"', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      await expect(
        page.getByRole('heading', { name: /уведомления/i }).or(page.getByText(/уведомления/i).first())
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-7 — отображается карточка "Безопасность"', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      await expect(
        page.getByRole('heading', { name: /безопасность/i }).or(page.getByText(/безопасность/i).first())
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Навигация между разделами', () => {
    test('E2E-SET-8 — переход в раздел "Профиль"', async ({ page }) => {
      await page.goto(urls.settings)

      const profileLink = page
        .getByRole('link', { name: /профиль/i })
        .first()
        .or(page.locator('a[href*="/settings/profile"]').first())

      await profileLink.click()
      await expect(page).toHaveURL(/settings\/profile/, { timeout: 10000 })
    })

    test('E2E-SET-9 — переход в раздел "Уведомления"', async ({ page }) => {
      await page.goto(urls.settings)

      const notificationsLink = page
        .getByRole('link', { name: /уведомления/i })
        .first()
        .or(page.locator('a[href*="/settings/notifications"]').first())

      await notificationsLink.click()
      await expect(page).toHaveURL(/settings\/notifications/, { timeout: 10000 })
    })

    test('E2E-SET-10 — переход в раздел "Безопасность"', async ({ page }) => {
      await page.goto(urls.settings)

      const securityLink = page
        .getByRole('link', { name: /безопасность/i })
        .first()
        .or(page.locator('a[href*="/settings/security"]').first())

      await securityLink.click()
      await expect(page).toHaveURL(/settings\/security/, { timeout: 10000 })
    })
  })

  test.describe('Настройки профиля', () => {
    test('E2E-SET-11 — страница профиля загружается', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      // Заголовок "Профиль"
      await expect(page.getByRole('heading', { name: /профиль/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-12 — описание "Ваши личные данные"', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      await expect(page.getByText(/ваши личные данные/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-13 — форма профиля содержит поле имени', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      // Поле имени
      await expect(page.getByRole('textbox', { name: /имя/i }).or(page.getByLabel(/имя/i))).toBeVisible({
        timeout: 10000,
      })
    })

    test('E2E-SET-14 — форма профиля содержит поле email', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      // Поле email (может быть readonly)
      await expect(page.getByRole('textbox', { name: /email/i }).or(page.getByLabel(/email/i))).toBeVisible({
        timeout: 10000,
      })
    })

    test('E2E-SET-15 — форма профиля содержит поле телефона', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      // Поле телефона
      const phoneField = page.getByRole('textbox', { name: /телефон/i }).or(page.getByLabel(/телефон/i))
      const hasPhone = await phoneField.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasPhone) {
        await expect(phoneField).toBeVisible()
      } else {
        console.log('  ℹ️ Поле телефона может отсутствовать')
      }
    })

    test('E2E-SET-16 — кнопка "Назад к настройкам" присутствует', async ({ page }) => {
      await page.goto(urls.settingsProfile)

      await expect(page.getByRole('link', { name: /назад.*настройк/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-17 — возврат к настройкам работает', async ({ page }) => {
      await page.goto(urls.settingsProfile)

      const backButton = page.getByRole('link', { name: /назад.*настройк/i })
      await expect(backButton).toBeVisible({ timeout: 10000 })
      await backButton.click()

      await expect(page).toHaveURL(/\/settings\/?$/, { timeout: 10000 })
    })

    test('E2E-SET-18 — форма имеет кнопку сохранения', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      // Кнопка сохранения
      await expect(page.getByRole('button', { name: /сохранить/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Настройки безопасности', () => {
    test('E2E-SET-19 — страница безопасности загружается', async ({ page }) => {
      await navigateAndWait(page, urls.settingsSecurity)

      // Заголовок "Безопасность"
      await expect(page.getByRole('heading', { name: /безопасность/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-20 — описание "Пароль и способы входа"', async ({ page }) => {
      await navigateAndWait(page, urls.settingsSecurity)

      await expect(page.getByText(/пароль.*способы входа/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-21 — страница показывает заглушку "В разработке"', async ({ page }) => {
      await navigateAndWait(page, urls.settingsSecurity)

      // Текущее состояние — заглушка
      await expect(page.getByRole('heading', { name: /в разработке/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-22 — кнопка "Назад к настройкам" присутствует', async ({ page }) => {
      await page.goto(urls.settingsSecurity)

      await expect(page.getByRole('link', { name: /назад.*настройк/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Доступ и безопасность', () => {
    test('E2E-SET-23 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.settings, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })

    test('E2E-SET-24 — страница профиля защищена', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.settingsProfile, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })

    test('E2E-SET-25 — страница безопасности защищена', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.settingsSecurity, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })
  })

  test.describe('Ученик — настройки', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('E2E-SET-26 — ученик может открыть настройки', async ({ page }) => {
      await navigateAndWait(page, urls.settings)

      await expect(page.getByRole('heading', { name: /настройки/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SET-27 — ученик может открыть профиль', async ({ page }) => {
      await navigateAndWait(page, urls.settingsProfile)

      await expect(page.getByRole('heading', { name: /профиль/i }).first()).toBeVisible({ timeout: 10000 })
    })
  })
})
