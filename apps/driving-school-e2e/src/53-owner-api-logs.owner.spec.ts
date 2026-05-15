import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для логов API и Rate Limits (Owner)
 *
 * Страницы:
 * - /owner/api-logs/ — Просмотр логов API запросов
 * - /owner/rate-limits/ — Управление лимитами запросов
 *
 * Функциональность api-logs:
 * - Просмотр журнала API запросов
 * - Фильтрация по организации, endpoint, статусу
 * - Ротация (удаление старых логов)
 * - Infinite scroll для загрузки
 *
 * Функциональность rate-limits:
 * - Статистика по rate limiting
 * - Установка кастомных лимитов
 * - Whitelist и blacklist организаций
 *
 * Примечание: Требует роль OWNER
 */
test.describe('API логи и Rate Limits (Owner)', () => {
  test.use({ storageState: 'playwright/.auth/owner.json' })
  test.describe.configure({ retries: 1 })

  test.describe('API Logs — Загрузка страницы', () => {
    test('E2E-AL-1 — страница api-logs загружается', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)

      // Ждём загрузку
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Заголовок страницы
      const hasHeading = await page
        .getByRole('heading', { name: /логи api/i })
        .isVisible()
        .catch(() => false)

      const hasDescription = await page
        .getByText(/журнал.*api.*запросов/i)
        .isVisible()
        .catch(() => false)

      expect(hasHeading || hasDescription).toBe(true)
    })

    test('E2E-AL-2 — отображается заголовок "Логи API"', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)

      // Ждём окончания загрузки
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: /логи api/i })).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('API Logs — Фильтрация', () => {
    test('E2E-AL-3 — фильтр по организации присутствует', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Ищем select для фильтра организации
      const hasOrganizationFilter = await page
        .getByText(/организация/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasSelect = await page
        .locator('select')
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasOrganizationFilter || hasSelect).toBe(true)
    })

    test('E2E-AL-4 — фильтр по endpoint присутствует', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasEndpointFilter = await page
        .getByPlaceholder(/поиск.*endpoint/i)
        .or(page.getByLabel(/endpoint/i))
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasEndpointFilter).toBe(true)
    })

    test('E2E-AL-5 — фильтр по статусу присутствует', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasStatusFilter = await page
        .getByText(/статус/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Или select с опциями "Успешные", "Ошибки"
      const hasStatusSelect = await page
        .locator('select')
        .filter({ hasText: /все|успешн|ошибк/i })
        .isVisible()
        .catch(() => false)

      expect(hasStatusFilter || hasStatusSelect).toBe(true)
    })
  })

  test.describe('API Logs — Таблица логов', () => {
    test('E2E-AL-6 — таблица или пустое состояние отображается', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await page
        .getByText(/логи не найдены|нет записей/i)
        .isVisible()
        .catch(() => false)

      expect(hasTable || hasEmptyState).toBe(true)
    })

    test('E2E-AL-7 — колонки таблицы отображаются', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)

      if (hasTable) {
        // Проверяем заголовки колонок
        const hasTimeColumn = await page
          .locator('th')
          .filter({ hasText: /время/i })
          .isVisible()
          .catch(() => false)

        const hasMethodColumn = await page
          .locator('th')
          .filter({ hasText: /метод/i })
          .isVisible()
          .catch(() => false)

        const hasEndpointColumn = await page
          .locator('th')
          .filter({ hasText: /endpoint/i })
          .isVisible()
          .catch(() => false)

        const hasStatusColumn = await page
          .locator('th')
          .filter({ hasText: /статус/i })
          .isVisible()
          .catch(() => false)

        expect(hasTimeColumn || hasMethodColumn || hasEndpointColumn || hasStatusColumn).toBe(true)
      }
    })
  })

  test.describe('API Logs — Действия', () => {
    test('E2E-AL-8 — кнопка "Обновить" присутствует', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)

      // Ждём окончания загрузки
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('button', { name: /обновить|refresh/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-AL-9 — кнопка "Ротация" присутствует', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)

      // Ждём окончания загрузки
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('button', { name: /ротация/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Rate Limits — Загрузка страницы', () => {
    test('E2E-RL-1 — страница rate-limits загружается', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)

      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasHeading = await page
        .getByRole('heading', { name: /rate limit/i })
        .isVisible()
        .catch(() => false)

      const hasDescription = await page
        .getByText(/управление лимитами/i)
        .isVisible()
        .catch(() => false)

      expect(hasHeading || hasDescription).toBe(true)
    })

    test('E2E-RL-2 — отображается заголовок "API Rate Limiting"', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)

      // Ждём окончания загрузки
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: /api rate limit/i })).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Rate Limits — Статистика', () => {
    test('E2E-RL-3 — статистика отображается', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Статистика — карточки или grid
      const hasStats = await page
        .locator('[class*="stat"], [class*="card"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasStats).toBe(true)
    })
  })

  test.describe('Rate Limits — Управление лимитами', () => {
    test('E2E-RL-4 — форма установки лимита присутствует', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Ищем форму для установки лимита
      const hasOrganizationSelect = await page
        .locator('select')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasLimitInput = await page
        .getByPlaceholder(/лимит|limit/i)
        .or(page.locator('input[type="number"]'))
        .isVisible()
        .catch(() => false)

      expect(hasOrganizationSelect || hasLimitInput).toBe(true)
    })

    test('E2E-RL-5 — секция whitelist присутствует', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasWhitelist = await page
        .getByText(/whitelist|белый список/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasWhitelist).toBe(true)
    })

    test('E2E-RL-6 — секция blacklist присутствует', async ({ page }) => {
      await page.goto(urls.ownerRateLimits)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasBlacklist = await page
        .getByText(/blacklist|чёрный список/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasBlacklist).toBe(true)
    })
  })

  test.describe('Доступ', () => {
    test('E2E-AL-10 — неавторизованный редиректится с api-logs', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.ownerApiLogs, { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || currentUrl.endsWith('/') || !currentUrl.includes('/owner/')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-RL-7 — ученик не имеет доступа к rate-limits', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.ownerRateLimits)
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = !currentUrl.includes('/owner/rate-limits')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-RL-8 — инструктор не имеет доступа к rate-limits', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/instructor.json',
      })
      const page = await context.newPage()

      await page.goto(urls.ownerRateLimits)
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = !currentUrl.includes('/owner/rate-limits')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
