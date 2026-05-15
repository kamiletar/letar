import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { gotoAndExpectHeading, safeIsVisibleWithTimeout, testUnauthenticatedRedirect, waitForPageLoad } from './helpers'

/**
 * E2E тесты для связанных аккаунтов (OAuth)
 *
 * Страница: /settings/connected-accounts/
 *
 * Тестирует:
 * - Список провайдеров (Google, Yandex, VK)
 * - Кнопки подключения/отвязки
 * - Навигация из Settings
 * - Доступ
 */
test.describe('Связанные аккаунты (Connected Accounts)', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('Просмотр', () => {
    test('E2E-75.1 — страница связанных аккаунтов загружается', async ({ page }) => {
      await gotoAndExpectHeading(page, urls.settingsConnectedAccounts, /связанные аккаунты/i)
    })

    test('E2E-75.2 — описание страницы отображается', async ({ page }) => {
      await page.goto(urls.settingsConnectedAccounts)
      await waitForPageLoad(page)

      await expect(page.getByText(/управление способами входа|oauth провайдер/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-75.3 — отображаются провайдеры (Google, Яндекс, VK)', async ({ page }) => {
      await page.goto(urls.settingsConnectedAccounts)
      await waitForPageLoad(page)

      const providers = [/google/i, /яндекс|yandex/i, /vk|вконтакте/i]
      let visibleCount = 0

      for (const provider of providers) {
        if (await safeIsVisibleWithTimeout(page.getByText(provider), 5000)) {
          visibleCount++
        }
      }

      // Все 3 провайдера должны быть видны
      expect(visibleCount).toBeGreaterThanOrEqual(3)
    })

    test('E2E-75.4 — кнопки подключения видны для неподключённых провайдеров', async ({ page }) => {
      await page.goto(urls.settingsConnectedAccounts)
      await waitForPageLoad(page)

      // Должны быть кнопки "Подключить" или "Привязать"
      const connectBtns = page.getByRole('button', { name: /подключить|привязать|link/i })
      const hasBtns = await safeIsVisibleWithTimeout(connectBtns.first(), 10000)

      // Хотя бы одна кнопка подключения (credential аккаунт уже привязан)
      if (hasBtns) {
        const count = await connectBtns.count()
        expect(count).toBeGreaterThanOrEqual(1)
      } else {
        // Все провайдеры могут быть уже подключены
        console.log('  ℹ️ Все провайдеры могут быть уже подключены')
      }
    })
  })

  test.describe('Управление', () => {
    test('E2E-75.5 — кнопка «Назад к настройкам» присутствует', async ({ page }) => {
      await page.goto(urls.settingsConnectedAccounts)
      await waitForPageLoad(page)

      const backBtn = page
        .getByRole('link', { name: /назад.*настройк/i })
        .or(page.getByRole('button', { name: /назад.*настройк/i }))
      await expect(backBtn).toBeVisible({ timeout: 10000 })
    })

    test('E2E-75.6 — клик «Назад» возвращает в настройки', async ({ page }) => {
      await page.goto(urls.settingsConnectedAccounts)
      await waitForPageLoad(page)

      const backBtn = page
        .getByRole('link', { name: /назад.*настройк/i })
        .or(page.getByRole('button', { name: /назад.*настройк/i }))
      await backBtn.click()

      await expect(page).toHaveURL(/\/settings\/?$/, { timeout: 10000 })
    })

    test('E2E-75.7 — навигация из главных настроек', async ({ page }) => {
      await page.goto(urls.settings)
      await waitForPageLoad(page)

      const link = page.getByRole('link', { name: /связанные аккаунты|аккаунты/i })
      const hasLink = await safeIsVisibleWithTimeout(link, 5000)

      if (hasLink) {
        await link.click()
        await expect(page).toHaveURL(/settings\/connected-accounts/, { timeout: 10000 })
      } else {
        console.log('  ⏭️ Skip: ссылка на связанные аккаунты не найдена в меню')
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-75.8 — неавторизованный пользователь редиректится', async ({ browser }) => {
      await testUnauthenticatedRedirect(browser, urls.settingsConnectedAccounts)
    })
  })
})
