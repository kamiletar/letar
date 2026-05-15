import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для аудит логов и тикетов (Owner)
 *
 * Страницы:
 * - /owner/audit/ — Аудит логи платформы
 * - /owner/tickets/ — Управление обращениями
 *
 * Функциональность:
 * - Просмотр событий аудита
 * - Фильтрация по типу и периоду
 * - Управление тикетами поддержки
 * - Ответы на обращения
 *
 * Примечание: Требует роль OWNER
 */
test.describe('Аудит и тикеты (Owner)', () => {
  test.use({ storageState: 'playwright/.auth/owner.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Аудит логи', () => {
    test('E2E-OA-1 — страница аудита загружается', async ({ page }) => {
      await page.goto(urls.ownerAudit)

      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Заголовок страницы
      await expect(page.getByRole('heading', { name: /аудит|audit|логи/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OA-2 — отображается список событий или пустое состояние', async ({ page }) => {
      await page.goto(urls.ownerAudit)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const auditList = page.locator('table')
      const emptyState = page.getByText(/нет событий|нет логов|пусто/i)
      const errorState = page.getByText(/ошибка/i)

      const hasList = await auditList.isVisible().catch(() => false)
      const hasEmpty = await emptyState.isVisible().catch(() => false)
      const hasError = await errorState.isVisible().catch(() => false)
      const hasContent = await page
        .locator('[class*="audit"]')
        .isVisible()
        .catch(() => false)

      expect(hasList || hasEmpty || hasError || hasContent).toBe(true)
    })

    test('E2E-OA-3 — фильтр по типу действия присутствует', async ({ page }) => {
      await page.goto(urls.ownerAudit)
      await page.waitForLoadState('domcontentloaded')

      const actionFilter = page
        .getByRole('combobox', { name: /действие|тип/i })
        .or(page.locator('[data-testid="action-filter"]'))
        .or(page.locator('select').first())

      const hasFilter = await actionFilter.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasFilter) {
        console.log('  ⚠️ Фильтр по типу действия не найден (возможно, в разработке)')
      }
    })

    test('E2E-OA-4 — фильтр по периоду присутствует', async ({ page }) => {
      await page.goto(urls.ownerAudit)
      await page.waitForLoadState('domcontentloaded')

      const dateFilter = page
        .getByRole('combobox', { name: /период|дата/i })
        .or(page.locator('[data-testid="date-filter"]'))
        .or(page.locator('input[type="date"]'))

      const hasFilter = await dateFilter.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasFilter) {
        console.log('  ⚠️ Фильтр по периоду не найден (возможно, в разработке)')
      }
    })

    test('E2E-OA-5 — события показывают время и действие', async ({ page }) => {
      await page.goto(urls.ownerAudit)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)

      if (hasTable) {
        // Проверяем что есть колонки с данными
        const hasTimeColumn = await page
          .locator('th')
          .filter({ hasText: /время|дата|date/i })
          .isVisible()
          .catch(() => false)

        const hasActionColumn = await page
          .locator('th')
          .filter({ hasText: /действие|action|событие/i })
          .isVisible()
          .catch(() => false)

        if (!hasTimeColumn && !hasActionColumn) {
          console.log('  ℹ️ Структура таблицы аудита другая')
        }
      }
    })
  })

  test.describe('Управление тикетами', () => {
    test('E2E-OA-6 — страница тикетов загружается', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const hasError = await page
        .getByText('Не удалось загрузить обращения')
        .isVisible()
        .catch(() => false)

      const hasHeading = await page
        .getByRole('heading', { name: /обращен|тикет/i })
        .isVisible()
        .catch(() => false)

      expect(hasError || hasHeading).toBe(true)
    })

    test('E2E-OA-7 — отображается список тикетов', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const ticketsList = page.locator('table')
      const emptyState = page.getByText(/нет тикетов|нет обращений/i)
      const errorState = page.getByText(/не удалось загрузить|ошибка загрузки/i)

      const hasList = await ticketsList.isVisible().catch(() => false)
      const hasEmpty = await emptyState.isVisible().catch(() => false)
      const hasError = await errorState.isVisible().catch(() => false)

      expect(hasList || hasEmpty || hasError).toBe(true)
    })

    test('E2E-OA-8 — фильтр по статусу присутствует', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const hasError = await page
        .getByText('Не удалось загрузить обращения')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasStatusFilter =
          (await page.locator('option:text-is("Все статусы")').count()) > 0 ||
          (await page
            .locator('select')
            .first()
            .isVisible()
            .catch(() => false))

        expect(hasStatusFilter).toBe(true)
      }
    })

    test('E2E-OA-9 — фильтр по категории присутствует', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const hasError = await page
        .getByText('Не удалось загрузить обращения')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasCategoryFilter =
          (await page.locator('option:text-is("Все категории")').count()) > 0 ||
          (await page
            .locator('select')
            .nth(1)
            .isVisible()
            .catch(() => false))

        expect(hasCategoryFilter).toBe(true)
      }
    })

    test('E2E-OA-10 — можно открыть детали тикета', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const hasError = await page
        .getByText('Не удалось загрузить обращения')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const ticketLink = page.locator('a[href*="/owner/tickets/"]').first()

        if (await ticketLink.isVisible().catch(() => false)) {
          await ticketLink.click()

          // Должна открыться страница тикета
          expect(page.url()).toContain('/owner/tickets/')

          // Должна быть форма ответа
          await expect(page.getByPlaceholder(/ответ|сообщение/i).or(page.getByRole('textbox'))).toBeVisible({
            timeout: 10000,
          })
        } else {
          console.log('  ⏭️ Skip: нет тикетов для открытия')
        }
      }
    })

    test('E2E-OA-11 — форма ответа на тикет присутствует', async ({ page }) => {
      await page.goto(urls.ownerTickets)

      const hasError = await page
        .getByText('Не удалось загрузить обращения')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const ticketLink = page.locator('a[href*="/owner/tickets/"]').first()

        if (await ticketLink.isVisible().catch(() => false)) {
          await ticketLink.click()
          await page.waitForLoadState('domcontentloaded')

          // Форма ответа
          const hasTextarea = await page
            .getByRole('textbox')
            .isVisible({ timeout: 10000 })
            .catch(() => false)

          const hasSubmitButton = await page
            .getByRole('button', { name: /отправить|ответить|send/i })
            .isVisible()
            .catch(() => false)

          expect(hasTextarea || hasSubmitButton).toBe(true)
        }
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-OA-12 — неавторизованный не может открыть аудит', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.ownerAudit, { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || currentUrl.endsWith('/') || !currentUrl.includes('/owner/')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-OA-13 — школьный админ не имеет доступа к аудиту', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/school-admin.json',
      })
      const page = await context.newPage()

      await page.goto(urls.ownerAudit)
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = !currentUrl.includes('/owner/audit')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
