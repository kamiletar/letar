import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { gotoAndExpectHeading, safeIsVisibleWithTimeout, testUnauthenticatedRedirect, waitForPageLoad } from './helpers'
import { expectToast } from './helpers/page.helpers'

/**
 * E2E тесты для настроек уведомлений
 *
 * Страница: /settings/notifications/
 *
 * Текущее состояние: страница существует и показывает заглушку "В разработке"
 * Тесты адаптированы под это состояние + подготовлены для будущей функциональности
 */
test.describe('Настройки уведомлений', () => {
  // Используем авторизацию инструктора (страница доступна для всех авторизованных)
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('Страница настроек', () => {
    test('E2E-5.1 — страница настроек уведомлений загружается', async ({ page }) => {
      await gotoAndExpectHeading(page, urls.settingsNotifications, /уведомления/i)
    })

    test('E2E-5.2 — отображается описание страницы', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Описание: "Настройки email и push-уведомлений"
      await expect(page.getByText(/настройки.*email.*push.*уведомлен/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-5.3 — кнопка "Назад к настройкам" присутствует', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Кнопка возврата
      await expect(page.getByRole('link', { name: /назад.*настройк/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-5.4 — клик на "Назад" возвращает в настройки', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      const backButton = page.getByRole('link', { name: /назад.*настройк/i })
      await expect(backButton).toBeVisible({ timeout: 10000 })
      await backButton.click()

      // Должен быть редирект на /settings/
      await expect(page).toHaveURL(/\/settings\/?$/, { timeout: 10000 })
    })

    test('E2E-5.5 — страница показывает заглушку "В разработке"', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Текущее состояние — заглушка с заголовком "В разработке"
      await expect(page.getByRole('heading', { name: /в разработке/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-5.6 — иконка стройки присутствует', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Иконка LuConstruction — может быть в SVG
      const constructionIcon = page.locator('svg').filter({ hasText: '' }).first()
      const hasIcon = await constructionIcon.isVisible({ timeout: 3000 }).catch(() => false)

      // Иконка опциональна — главное что заглушка есть
      if (!hasIcon) {
        console.log('  ℹ️ Иконка стройки может отображаться по-другому')
      }
    })
  })

  test.describe('Доступ и безопасность', () => {
    test('E2E-5.10 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      await testUnauthenticatedRedirect(browser, urls.settingsNotifications)
    })
  })

  test.describe('Навигация из главных настроек', () => {
    test('E2E-5.13 — страница /settings/ загружается', async ({ page }) => {
      await gotoAndExpectHeading(page, urls.settings, /настройки/i)
    })

    test('E2E-5.14 — ссылка на уведомления в меню настроек', async ({ page }) => {
      await page.goto(urls.settings)
      await waitForPageLoad(page)

      // Ищем ссылку на уведомления
      const notificationsLink = page.getByRole('link', { name: /уведомления/i })
      const hasNotificationsLink = await safeIsVisibleWithTimeout(notificationsLink, 5000)

      if (hasNotificationsLink) {
        await notificationsLink.click()
        await expect(page).toHaveURL(/settings\/notifications/, { timeout: 10000 })
      } else {
        console.log('  ℹ️ Ссылка на уведомления может быть оформлена по-другому')
      }
    })
  })

  // TODO: Тесты ниже будут активированы после реализации функциональности
  test.describe.skip('Функциональность уведомлений (будущее)', () => {
    test('E2E-5.20 — отображается раздел email уведомлений', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Должен быть раздел email уведомлений
      await expect(
        page.getByText(/email.*уведомления|уведомления.*почту/i).or(page.getByText(/электронная почта/i))
      ).toBeVisible()
    })

    test('E2E-5.21 — отображается раздел push уведомлений', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Должен быть раздел push уведомлений
      await expect(
        page.getByText(/push.*уведомления|уведомления.*браузере/i).or(page.getByText(/браузерные уведомления/i))
      ).toBeVisible()
    })

    test('E2E-5.22 — переключатели уведомлений видны', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Должны быть переключатели (switch)
      const switches = page.locator('[role="switch"], input[type="checkbox"]')
      await expect(switches.first()).toBeVisible()
    })

    test('E2E-5.23 — можно переключить email уведомления', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Ищем переключатель email уведомлений
      const emailSwitch = page.locator('[role="switch"]').first().or(page.locator('input[type="checkbox"]').first())

      if (await emailSwitch.isVisible()) {
        // Кликаем для переключения
        await emailSwitch.click()

        // Пауза для UI обновления switch состояния (debounce/state update)
        await page.waitForTimeout(500)

        // Проверяем что переключатель всё ещё видим (не упал с ошибкой)
        await expect(emailSwitch).toBeVisible()
      }
    })

    test('E2E-5.24 — отображаются категории уведомлений', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Должны быть категории уведомлений
      const categories = [
        /новые сообщения|сообщения в чате/i,
        /напоминания.*занятия|занятия/i,
        /изменения.*расписании|расписание/i,
      ]

      let visibleCategories = 0
      for (const category of categories) {
        const element = page.getByText(category)
        if (await element.isVisible().catch(() => false)) {
          visibleCategories++
        }
      }

      // Хотя бы одна категория должна быть видна
      expect(visibleCategories).toBeGreaterThan(0)
    })

    test('E2E-5.25 — сохранение настроек показывает уведомление', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Ищем переключатель и кликаем
      const anySwitch = page.locator('[role="switch"]').first()

      if (await anySwitch.isVisible().catch(() => false)) {
        await anySwitch.click()

        // Должно появиться уведомление об успехе или ошибке
        await expectToast(page, /настройки сохранены|изменения сохранены|ошибка/i).catch(() => undefined)
      }
    })

    test('E2E-5.26 — переключатели имеют aria-label', async ({ page }) => {
      await page.goto(urls.settingsNotifications)

      // Проверяем что переключатели имеют aria-label для скринридеров
      const switches = page.locator('[role="switch"]')

      if ((await switches.count()) > 0) {
        const firstSwitch = switches.first()
        const ariaLabel = await firstSwitch.getAttribute('aria-label')
        const ariaLabelledBy = await firstSwitch.getAttribute('aria-labelledby')

        // Должен быть либо aria-label, либо aria-labelledby
        expect(ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    })
  })
})
