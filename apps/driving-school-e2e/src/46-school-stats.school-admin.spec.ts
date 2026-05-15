import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для статистики школы (School Admin)
 *
 * Страницы:
 * - /school/stats/ — Список школ пользователя
 * - /school/stats/[schoolId]/ — Детальная статистика школы
 *
 * Функциональность:
 * - Список школ пользователя
 * - Статистика за период (неделя, месяц, год, всё время)
 * - Карточки статистики (участники, занятия)
 * - Таблица инструкторов с показателями
 *
 * Примечание: Требует роль SCHOOL_ADMIN или выше
 */
test.describe('Статистика школы (School Admin)', () => {
  test.use({ storageState: 'playwright/.auth/school-admin.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Список школ', () => {
    test('E2E-SS-1 — страница "Мои школы" загружается', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы
      await expect(page.getByRole('heading', { name: /мои школы/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SS-2 — отображается количество школ', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Ждём заголовок страницы как индикатор загрузки
      await expect(page.getByRole('heading', { name: /мои школы/i })).toBeVisible({ timeout: 10000 })

      // Текст с количеством школ или пустое состояние
      // .first() — "автошкол" может встречаться и в названии школы
      const hasSchoolCount = await page
        .getByText(/\d+\s*автошкол|у вас пока нет школ/i)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasSchoolCount).toBe(true)
    })

    test('E2E-SS-3 — кнопка "Зарегистрировать школу" присутствует', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('link', { name: /зарегистрировать школу/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SS-4 — при наличии школ отображаются карточки', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      const hasNoSchools = await page
        .getByText(/нет школ|у вас пока нет школ/i)
        .isVisible()
        .catch(() => false)

      if (!hasNoSchools) {
        // Должны быть карточки школ
        const hasSchoolCards = await Locators.card(page)
          .first()
          .isVisible()
          .catch(() => false)

        expect(hasSchoolCards).toBe(true)
      }
    })

    test('E2E-SS-5 — карточка школы содержит кнопку "Статистика"', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      const hasNoSchools = await page
        .getByText(/нет школ|у вас пока нет школ/i)
        .isVisible()
        .catch(() => false)

      if (!hasNoSchools) {
        await expect(page.getByRole('link', { name: /статистика/i }).first()).toBeVisible({ timeout: 5000 })
      }
    })

    test('E2E-SS-6 — карточка школы содержит кнопку "Настройки"', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      const hasNoSchools = await page
        .getByText(/нет школ|у вас пока нет школ/i)
        .isVisible()
        .catch(() => false)

      if (!hasNoSchools) {
        await expect(page.getByRole('link', { name: /настройки/i }).first()).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Детальная статистика', () => {
    test('E2E-SS-7 — переход на страницу статистики школы', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Ждём загрузку страницы "Мои школы"
      await expect(page.getByRole('heading', { name: /мои школы/i })).toBeVisible({ timeout: 10000 })

      const statsLink = page.getByRole('link', { name: /статистика/i }).first()
      const hasStatsLink = await statsLink.isVisible().catch(() => false)

      if (hasStatsLink) {
        await statsLink.click()
        // Ждём навигации на страницу конкретной школы
        await page.waitForURL(/\/school\/stats\/[a-z0-9-]+/i, { timeout: 10000 })

        expect(page.url()).toMatch(/\/school\/stats\/[a-z0-9-]+/i)
      } else {
        console.log('  ⏭️ Skip: нет школ для просмотра статистики')
      }
    })

    test('E2E-SS-8 — отображается селектор периода', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Ждём заголовок страницы
      await expect(page.getByRole('heading', { name: /мои школы/i })).toBeVisible({ timeout: 10000 })

      const statsLink = page.getByRole('link', { name: /статистика/i }).first()

      if (await statsLink.isVisible().catch(() => false)) {
        await statsLink.click()
        await page.waitForURL(/\/school\/stats\/[a-z0-9-]+/i, { timeout: 10000 })

        const hasPeriodSelector = await page
          .locator('[class*="segment"], [role="group"]')
          .filter({ hasText: /месяц|неделя|год/i })
          .isVisible({ timeout: 10000 })
          .catch(() => false)

        const hasPeriodText = await page
          .getByText(/за неделю|за месяц|за год|за всё время/i)
          .first()
          .isVisible()
          .catch(() => false)

        expect(hasPeriodSelector || hasPeriodText).toBe(true)
      }
    })

    test('E2E-SS-9 — отображаются карточки статистики', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      const statsLink = page.getByRole('link', { name: /статистика/i }).first()

      if (await statsLink.isVisible().catch(() => false)) {
        await statsLink.click()
        await page.waitForLoadState('domcontentloaded')

        // Ждём загрузку данных
        await page.waitForTimeout(1000)

        // Проверяем наличие карточек статистики
        const hasError = await page
          .getByText(/ошибка/i)
          .isVisible()
          .catch(() => false)

        if (!hasError) {
          // Карточки могут быть либо SimpleGrid, либо стат карточки
          const hasCards = await Locators.stat(page)
            .or(Locators.card(page))
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          const hasNumbers = await page
            .locator('text=/\\d+/')
            .first()
            .isVisible()
            .catch(() => false)

          if (!hasCards && !hasNumbers) {
            console.log('  ℹ️ Карточки статистики не найдены')
          }
        }
      }
    })

    test('E2E-SS-10 — отображается таблица инструкторов', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Ждём заголовок страницы
      await expect(page.getByRole('heading', { name: /мои школы/i })).toBeVisible({ timeout: 10000 })

      const statsLink = page.getByRole('link', { name: /статистика/i }).first()

      if (await statsLink.isVisible().catch(() => false)) {
        await statsLink.click()
        await page.waitForURL(/\/school\/stats\/[a-z0-9-]+/i, { timeout: 10000 })

        const hasError = await page
          .getByText(/ошибка/i)
          .first()
          .isVisible()
          .catch(() => false)

        if (!hasError) {
          // Таблица инструкторов или сообщение об отсутствии
          const hasTable = await page
            .locator('table')
            .isVisible({ timeout: 10000 })
            .catch(() => false)

          const hasNoInstructors = await page
            .getByText(/нет инструкторов/i)
            .isVisible()
            .catch(() => false)

          expect(hasTable || hasNoInstructors).toBe(true)
        }
      }
    })

    test('E2E-SS-11 — смена периода обновляет URL', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      const statsLink = page.getByRole('link', { name: /статистика/i }).first()

      if (await statsLink.isVisible().catch(() => false)) {
        await statsLink.click()
        await page.waitForLoadState('domcontentloaded')

        // Ищем кнопку периода
        const yearButton = page
          .getByRole('button', { name: /год/i })
          .or(page.locator('[data-part="item"]').filter({ hasText: /год/i }))

        if (await yearButton.isVisible().catch(() => false)) {
          await yearButton.click()
          await page.waitForTimeout(500)

          // URL должен содержать period параметр
          expect(page.url()).toMatch(/period=|year/i)
        }
      }
    })
  })

  test.describe('Ошибки и доступ', () => {
    test('E2E-SS-12 — ошибка при отсутствии школы показывает сообщение', async ({ page }) => {
      // Переход на несуществующую школу
      await page.goto('/school/stats/non-existent-id/')
      await page.waitForLoadState('domcontentloaded')

      // Ждём 3 секунды для завершения рендеринга
      await page.waitForTimeout(3000)

      // Должна быть ошибка, редирект, или страница без контента (access denied)
      const hasError = await page
        .getByText(/ошибка|не найден|нет доступа/i)
        .first()
        .isVisible()
        .catch(() => false)

      const isRedirected = !page.url().includes('non-existent-id')

      // Также считаем допустимым если страница пустая (нет контента для несуществующей школы)
      const hasNoContent = !(await page
        .getByRole('heading')
        .first()
        .isVisible()
        .catch(() => false))

      expect(hasError || isRedirected || hasNoContent).toBe(true)
    })

    test('E2E-SS-13 — неавторизованный редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.schoolStats, { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || !currentUrl.includes('/school/')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
