import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для публичной документации API
 *
 * Страницы:
 * - /api-docs/ — Swagger UI интерактивная документация
 * - /developers/ — Руководство для разработчиков
 *
 * Функциональность api-docs:
 * - Swagger UI интерфейс
 * - Просмотр эндпоинтов
 * - Примеры запросов
 *
 * Функциональность developers:
 * - Описание API возможностей
 * - Примеры авторизации
 * - Коды ошибок
 * - Rate Limiting информация
 *
 * Примечание: Публичные страницы, доступны без авторизации
 */
test.describe('Публичная документация API', () => {
  // Публичные страницы — без авторизации
  test.describe.configure({ retries: 1 })

  test.describe('API Docs — Swagger UI', () => {
    test('E2E-PD-1 — страница api-docs загружается', async ({ page }) => {
      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы (рендерится сразу, не зависит от Swagger UI)
      const hasHeading = await page
        .getByRole('heading', { name: /api documentation/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasDescription = await page
        .getByText(/интерактивная документация/i)
        .isVisible()
        .catch(() => false)

      expect(hasHeading || hasDescription).toBe(true)
    })

    test('E2E-PD-2 — Swagger UI контейнер присутствует', async ({ page }) => {
      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      // Контейнер #swagger-ui должен быть в DOM (даже если скрипт не загружен)
      const hasSwaggerContainer = await page
        .locator('#swagger-ui')
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasSwaggerContainer).toBe(true)
    })

    test('E2E-PD-3 — кнопка переключения темы присутствует', async ({ page }) => {
      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasColorModeButton = await page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasColorModeButton).toBe(true)
    })

    test('E2E-PD-4 — ссылка на руководство присутствует', async ({ page }) => {
      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasDevLink = await page
        .getByRole('link', { name: /руководство/i })
        .or(page.getByRole('button', { name: /руководство/i }))
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasDevLink).toBe(true)
    })

    test('E2E-PD-5 — переход на страницу разработчиков', async ({ page }) => {
      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      const devLink = page.getByRole('link', { name: /руководство/i })
      const hasLink = await devLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await Promise.all([page.waitForURL('**/developers**', { timeout: 15000 }), devLink.click()])

        expect(page.url()).toContain('/developers')
      }
    })
  })

  test.describe('Developers — Руководство', () => {
    test('E2E-PD-6 — страница developers загружается', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasHeading = await page
        .getByRole('heading', { name: /public api/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasHeading).toBe(true)
    })

    test('E2E-PD-7 — отображается секция "Возможности API"', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasCapabilities = await page
        .getByText(/возможности api/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasCapabilities).toBe(true)
    })

    test('E2E-PD-8 — отображается секция "Авторизация"', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasAuth = await page
        .getByText(/авторизация/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasAuth).toBe(true)
    })

    test('E2E-PD-9 — отображается пример API ключа', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      // Ищем текст с заглавными буквами как в коде
      const hasApiKeyExample = await page
        .locator('text=X-API-Key')
        .or(page.locator('text=x-api-key'))
        .or(page.locator('code:has-text("X-API-Key")'))
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false)

      expect(hasApiKeyExample).toBe(true)
    })

    test('E2E-PD-10 — отображается секция "Rate Limiting"', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasRateLimiting = await page
        .getByText(/rate limiting/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasRateLimiting).toBe(true)
    })

    test('E2E-PD-11 — отображается секция "Эндпоинты"', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasEndpoints = await page
        .getByText(/эндпоинты/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasEndpoints).toBe(true)
    })

    test('E2E-PD-12 — отображается секция "Коды ошибок"', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const hasErrorCodes = await page
        .getByText(/коды ошибок/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasErrorCodes).toBe(true)
    })

    test('E2E-PD-13 — отображаются примеры кода', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      // Ищем заголовок секции с примерами
      const hasExamplesSection = await page
        .locator('text=Примеры запросов')
        .or(page.locator('text=cURL:'))
        .or(page.locator('code:has-text("curl")'))
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false)

      expect(hasExamplesSection).toBe(true)
    })

    test('E2E-PD-14 — ссылка на Swagger UI присутствует', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      // Ищем ссылку с текстом Swagger UI
      const hasSwaggerLink = await page
        .locator('a:has-text("Swagger UI")')
        .or(page.locator('button:has(a:has-text("Swagger UI"))'))
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false)

      expect(hasSwaggerLink).toBe(true)
    })

    test('E2E-PD-15 — переход на Swagger UI', async ({ page }) => {
      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      const swaggerLink = page.getByRole('link', { name: /swagger ui/i }).first()
      const hasLink = await swaggerLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await Promise.all([page.waitForURL('**/api-docs**', { timeout: 15000 }), swaggerLink.click()])

        expect(page.url()).toContain('/api-docs')
      }
    })
  })

  test.describe('Доступность без авторизации', () => {
    test('E2E-PD-16 — api-docs доступна без авторизации', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      // Блокируем внешний CDN для ускорения теста
      await page.route('https://unpkg.com/**', (route) => route.abort())

      await page.goto(urls.apiDocs, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      // Страница должна загрузиться без редиректа
      const currentUrl = page.url()
      const isOnDocsPage = currentUrl.includes('/api-docs')

      expect(isOnDocsPage).toBe(true)

      await context.close()
    })

    test('E2E-PD-17 — developers доступна без авторизации', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(urls.developers, { timeout: 30000 })
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isOnDevPage = currentUrl.includes('/developers')

      expect(isOnDevPage).toBe(true)

      await context.close()
    })
  })
})
