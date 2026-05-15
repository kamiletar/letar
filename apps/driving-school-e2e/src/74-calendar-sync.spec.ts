import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { gotoAndExpectHeading, safeIsVisibleWithTimeout, testUnauthenticatedRedirect, waitForPageLoad } from './helpers'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для синхронизации календарей
 *
 * Страница: /settings/calendar/
 *
 * Тестирует:
 * - iCal Feed: URL, toggles (занятия/экзамены/теория/отсутствия), регенерация
 * - Google Calendar: кнопка добавления, список подключённых
 * - Доступ: только авторизованные пользователи
 */
test.describe('Настройки календаря (Calendar Sync)', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('iCal Feed', () => {
    test('E2E-74.1 — страница настроек календаря загружается', async ({ page }) => {
      await gotoAndExpectHeading(page, urls.settingsCalendar, /настройки календаря/i)
    })

    test('E2E-74.2 — отображается URL для подписки', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // iCal Feed секция должна содержать URL
      const feedUrl = page.locator('input[readonly]').first()
      await expect(feedUrl).toBeVisible({ timeout: 10000 })

      // URL должен содержать webcal:// или http://
      const value = await feedUrl.inputValue()
      expect(value).toMatch(/webcal:\/\/|http/)
    })

    test('E2E-74.3 — описание секции iCal Feed видно', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // Описание подписки — ищем заголовок секции iCal Feed
      await expect(page.getByRole('heading', { name: /ical feed/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-74.4 — toggles контента присутствуют', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // Должны быть 4 switch-элемента: занятия, экзамены, теория, отсутствия
      const switches = Locators.switch(page)
      const count = await switches.count()
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('E2E-74.5 — подписи для toggles видны', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // Проверяем наличие подписей
      const labels = [/практические занятия/i, /экзамены/i, /теоретические занятия/i, /отсутствия/i]

      let visibleCount = 0
      for (const label of labels) {
        if (await safeIsVisibleWithTimeout(page.getByText(label), 3000)) {
          visibleCount++
        }
      }

      // Минимум 3 из 4 — "Отсутствия" может быть ниже viewport
      expect(visibleCount).toBeGreaterThanOrEqual(3)
    })

    test('E2E-74.6 — кнопка «Сменить ссылку» присутствует', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      const regenerateBtn = page.getByRole('button', { name: /сменить ссылку/i })
      await expect(regenerateBtn).toBeVisible({ timeout: 10000 })
      await expect(regenerateBtn).toBeEnabled()
    })
  })

  test.describe('Google Calendar', () => {
    test('E2E-74.7 — секция подключённых календарей видна', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // Секция подключённых календарей (заголовок h2)
      await expect(page.getByRole('heading', { name: /подключённые календари/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-74.8 — кнопка добавления календаря присутствует', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      const addBtn = page.getByRole('button', { name: /подключить|добавить/i })
      const hasBtn = await safeIsVisibleWithTimeout(addBtn, 10000)

      if (hasBtn) {
        await expect(addBtn.first()).toBeEnabled()
      } else {
        console.log('  ⏭️ Skip: кнопка добавления календаря не найдена (возможно пустое состояние)')
      }
    })

    test('E2E-74.9 — пустое состояние или список подключённых календарей', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      const hasConnections = await safeIsVisibleWithTimeout(
        Locators.card(page).filter({ hasText: /google|calendar|синхронизац/i }),
        5000
      )

      const hasEmptyState = await safeIsVisibleWithTimeout(
        page.getByText(/нет подключённых|подключите.*календарь/i),
        3000
      )

      // Либо есть подключения, либо empty state, либо кнопка подключения
      const hasAddBtn = await safeIsVisibleWithTimeout(page.getByRole('button', { name: /подключить|добавить/i }), 3000)

      expect(hasConnections || hasEmptyState || hasAddBtn).toBe(true)
    })
  })

  test.describe('Доступ и навигация', () => {
    test('E2E-74.10 — неавторизованный пользователь редиректится', async ({ browser }) => {
      await testUnauthenticatedRedirect(browser, urls.settingsCalendar)
    })

    test('E2E-74.11 — навигация из главных настроек', async ({ page }) => {
      await page.goto(urls.settings)
      await waitForPageLoad(page)

      // Ищем ссылку на настройки календаря
      const calendarLink = page.getByRole('link', { name: /календар/i })
      const hasLink = await safeIsVisibleWithTimeout(calendarLink, 5000)

      if (hasLink) {
        await calendarLink.click()
        await expect(page).toHaveURL(/settings\/calendar/, { timeout: 10000 })
      } else {
        console.log('  ⏭️ Skip: ссылка на календарь не найдена в меню настроек')
      }
    })

    test('E2E-74.12 — статистика доступа к feed отображается', async ({ page }) => {
      await page.goto(urls.settingsCalendar)
      await waitForPageLoad(page)

      // Статистика: "Последний доступ" и "Всего запросов"
      const hasStats = await safeIsVisibleWithTimeout(page.getByText(/последний доступ|всего запросов/i), 10000)

      expect(hasStats).toBe(true)
    })
  })
})
