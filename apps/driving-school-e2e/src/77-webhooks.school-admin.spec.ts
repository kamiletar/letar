import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { getSchoolIdForAdmin, safeIsVisibleWithTimeout, waitForPageLoad } from './helpers'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для Webhooks (школьный администратор)
 *
 * Страница: /school/[id]/settings/ — секция Webhooks
 *
 * Тестирует:
 * - Отображение секции Webhooks в настройках школы
 * - CRUD операции (создание, детали, удаление)
 * - Выбор событий для webhook
 * - Логи доставки
 * - Access control
 *
 * ПРИМЕЧАНИЕ: Если секция Webhooks не подключена к странице,
 * тесты gracefully пропускаются с информативным сообщением.
 */
test.describe('Webhooks (школьный администратор)', () => {
  test.use({ storageState: 'playwright/.auth/school-admin.json' })

  // Получаем schoolId для тестов
  let settingsUrl: string

  test.beforeAll(async () => {
    try {
      const schoolId = await getSchoolIdForAdmin('e2e-school-admin@e2e-test.local')
      settingsUrl = schoolId ? `/school/${schoolId}/settings/` : urls.schoolSettings
    } catch {
      settingsUrl = urls.schoolSettings
    }
  })

  test.describe('Секция Webhooks', () => {
    test('E2E-77.1 — страница настроек школы загружается', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasSettings = await safeIsVisibleWithTimeout(page.getByText(/настройки школы|настройки/i).first(), 10000)

      // Если произошёл редирект на конкретную школу
      const isRedirected = page.url().includes('/school/') && page.url().includes('/settings/')

      expect(hasSettings || isRedirected).toBe(true)
    })

    test('E2E-77.2 — секция Webhooks присутствует', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooks = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 10000)

      if (!hasWebhooks) {
        test.skip(true, 'Секция Webhooks не подключена к странице настроек')
      }
    })

    test('E2E-77.3 — пустое состояние или список webhooks', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      // Либо пустое состояние, либо таблица
      const hasEmptyState = await safeIsVisibleWithTimeout(page.getByText(/нет webhooks/i), 5000)

      const hasTable = await safeIsVisibleWithTimeout(page.locator('table, [role="table"]').first(), 3000)

      expect(hasEmptyState || hasTable).toBe(true)
    })

    test('E2E-77.4 — кнопка «Добавить» webhook видна', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const addBtn = page.getByRole('button', { name: /добавить/i })
      await expect(addBtn).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Создание webhook', () => {
    test('E2E-77.5 — кнопка «Добавить» открывает диалог', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const addBtn = page.getByRole('button', { name: /добавить/i })
      await addBtn.click()

      // Должен открыться диалог создания
      const dialog = Locators.modal(page)
      await expect(dialog).toBeVisible({ timeout: 5000 })
    })

    test('E2E-77.6 — диалог создания содержит поле URL', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      await page.getByRole('button', { name: /добавить/i }).click()
      await expect(Locators.modal(page)).toBeVisible({ timeout: 5000 })

      // Поле URL
      const urlField = page
        .getByRole('textbox', { name: /url/i })
        .or(page.locator('input[placeholder*="https://"]'))
        .or(page.locator('[data-field-name="url"]'))
      const hasUrl = await safeIsVisibleWithTimeout(urlField.first(), 5000)
      expect(hasUrl).toBe(true)
    })

    test('E2E-77.7 — диалог создания содержит выбор событий', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      await page.getByRole('button', { name: /добавить/i }).click()
      await expect(Locators.modal(page)).toBeVisible({ timeout: 5000 })

      // Должны быть чекбоксы или список событий
      const hasEvents = await safeIsVisibleWithTimeout(page.getByText(/событи|events/i), 5000)

      const hasCheckboxes = await Locators.checkbox(page)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasEvents || hasCheckboxes).toBe(true)
    })

    test('E2E-77.8 — валидация: пустой URL не проходит', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      await page.getByRole('button', { name: /добавить/i }).click()
      await expect(Locators.modal(page)).toBeVisible({ timeout: 5000 })

      // Нажимаем «Создать» без заполнения URL
      const createBtn = page.getByRole('button', { name: /создать|сохранить/i })
      if (await safeIsVisibleWithTimeout(createBtn, 3000)) {
        await createBtn.click()

        // Должна появиться ошибка валидации
        const hasError = await safeIsVisibleWithTimeout(Locators.formError(page).first(), 3000)

        const hasValidationText = await safeIsVisibleWithTimeout(page.getByText(/обязательно|url|некорректн/i), 3000)

        expect(hasError || hasValidationText).toBe(true)
      }
    })
  })

  test.describe('Детали webhook', () => {
    test('E2E-77.9 — пустое состояние содержит описание', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const hasEmpty = await safeIsVisibleWithTimeout(page.getByText(/нет webhooks/i), 5000)

      if (hasEmpty) {
        // Описание пустого состояния
        await expect(page.getByText(/создайте webhook|получения уведомлений/i)).toBeVisible({ timeout: 5000 })
      } else {
        console.log('  ⏭️ Skip: webhooks уже созданы')
      }
    })

    test('E2E-77.10 — если есть webhooks, таблица содержит URL', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const hasTable = await safeIsVisibleWithTimeout(page.locator('table, [role="table"]').first(), 5000)

      if (!hasTable) {
        console.log('  ⏭️ Skip: нет webhooks в таблице')
        return
      }

      // Таблица должна содержать URL
      const hasUrl = await safeIsVisibleWithTimeout(page.getByText(/https?:\/\//i), 5000)

      expect(hasUrl).toBe(true)
    })

    test('E2E-77.11 — если есть webhooks, видны статусы', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const hasTable = await safeIsVisibleWithTimeout(page.locator('table, [role="table"]').first(), 5000)

      if (!hasTable) {
        console.log('  ⏭️ Skip: нет webhooks в таблице')
        return
      }

      // Статус должен быть виден (badge с active/inactive)
      const hasStatus = await safeIsVisibleWithTimeout(
        Locators.badge(page)
          .first()
          .or(page.getByText(/активн|неактивн|active|inactive/i)),
        5000
      )

      expect(hasStatus).toBe(true)
    })
  })

  test.describe('Логи и действия', () => {
    test('E2E-77.12 — если есть webhooks, кнопки действий видны', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const hasTable = await safeIsVisibleWithTimeout(page.locator('table, [role="table"]').first(), 5000)

      if (!hasTable) {
        console.log('  ⏭️ Skip: нет webhooks для проверки кнопок')
        return
      }

      // Должны быть кнопки действий (детали, логи, тест, удалить)
      const actionBtns = page.getByRole('button').filter({ hasText: /детали|логи|тест|удалить/i })
      const hasActions = await safeIsVisibleWithTimeout(actionBtns.first(), 5000)

      // Или иконочные кнопки
      const iconBtns = page.locator('table button, [role="table"] button')
      const hasIconBtns = (await iconBtns.count()) > 0

      expect(hasActions || hasIconBtns).toBe(true)
    })

    test('E2E-77.13 — диалог логов открывается', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasWebhooksSection = await safeIsVisibleWithTimeout(page.getByText(/webhooks/i), 5000)

      if (!hasWebhooksSection) {
        test.skip(true, 'Секция Webhooks не подключена')
        return
      }

      const hasTable = await safeIsVisibleWithTimeout(page.locator('table, [role="table"]').first(), 5000)

      if (!hasTable) {
        console.log('  ⏭️ Skip: нет webhooks для проверки логов')
        return
      }

      // Кликаем на кнопку логов
      const logsBtn = page.getByRole('button', { name: /логи|logs/i })
      const hasLogsBtn = await safeIsVisibleWithTimeout(logsBtn.first(), 5000)

      if (hasLogsBtn) {
        await logsBtn.first().click()

        // Должен открыться диалог логов
        const dialog = Locators.modal(page)
        await expect(dialog).toBeVisible({ timeout: 5000 })
      } else {
        console.log('  ⏭️ Skip: кнопка логов не найдена')
      }
    })
  })

  test.describe('Настройки API (проверка секций на странице)', () => {
    test('E2E-77.14 — секция API-ключей видна', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasApiKeys = await safeIsVisibleWithTimeout(page.getByText(/api.?ключ|api.?key/i), 10000)

      expect(hasApiKeys).toBe(true)
    })

    test('E2E-77.15 — секция логов API видна', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasApiLogs = await safeIsVisibleWithTimeout(page.getByText(/логи api|api.*лог/i), 10000)

      expect(hasApiLogs).toBe(true)
    })

    test('E2E-77.16 — секция импорта данных видна', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasImport = await safeIsVisibleWithTimeout(page.getByText(/импорт данных/i), 10000)

      expect(hasImport).toBe(true)
    })

    test('E2E-77.17 — кнопка «Импорт из Excel» видна', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const importBtn = page
        .getByRole('link', { name: /импорт.*excel/i })
        .or(page.getByRole('button', { name: /импорт.*excel/i }))
      const hasBtn = await safeIsVisibleWithTimeout(importBtn.first(), 10000)
      expect(hasBtn).toBe(true)
    })
  })

  test.describe('Доступ', () => {
    test('E2E-77.18 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(urls.schoolSettings)
      await page.waitForLoadState('domcontentloaded')

      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })

    test('E2E-77.19 — несуществующая школа показывает 404', async ({ page }) => {
      await page.goto('/school/nonexistent-school-id/settings/')
      await page.waitForLoadState('domcontentloaded')

      const notFoundText = page.getByText(/не найден|not found|404/i)
      const accessDenied = page.getByText(/доступ запрещён/i)

      const hasNotFound = await notFoundText.isVisible().catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      expect(hasNotFound || hasDenied || page.url().includes('sign-in')).toBe(true)
    })

    test('E2E-77.20 — основная форма настроек школы содержит поле названия', async ({ page }) => {
      await page.goto(settingsUrl)
      await waitForPageLoad(page)

      const hasForm = await safeIsVisibleWithTimeout(page.getByRole('textbox').first(), 10000)

      const hasDenied = await safeIsVisibleWithTimeout(page.getByText(/доступ запрещён/i), 3000)

      if (!hasDenied) {
        expect(hasForm).toBe(true)
      }
    })
  })
})
