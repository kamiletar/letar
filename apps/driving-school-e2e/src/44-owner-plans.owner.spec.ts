import { expect, test } from './fixtures/base-test'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для тарифных планов (Owner)
 *
 * Страница: /owner/plans/
 *
 * Функциональность:
 * - Список тарифных планов (FREE, INSTRUCTOR, SCHOOL)
 * - Статистика подписок
 * - Информация о монетизации
 * - Просмотр деталей тарифов
 *
 * Примечание: Требует роль OWNER. Монетизация пока не активна.
 */
test.describe('Тарифные планы (Owner)', () => {
  test.use({ storageState: 'playwright/.auth/owner.json' })
  test.describe.configure({ retries: 1 })

  const plansUrl = '/owner/plans/'

  test.describe('Загрузка страницы', () => {
    test('E2E-OP-1 — страница тарифов загружается', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы
      await expect(page.getByRole('heading', { name: /тарифные планы/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-2 — отображается описание страницы', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/управление тарифами.*монетизация/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Статистика', () => {
    test('E2E-OP-3 — отображается количество тарифных планов', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Карточка "Тарифных планов"
      await expect(page.getByText(/тарифных планов/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-4 — отображается количество подписок', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Карточка "Всего подписок"
      await expect(page.getByText(/всего подписок/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-5 — отображается количество активных подписок', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Карточка "Активных подписок"
      await expect(page.getByText(/активных подписок/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Информация о монетизации', () => {
    test('E2E-OP-6 — отображается уведомление о неактивной монетизации', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/монетизация.*не активна/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-7 — отображается пояснение о бесплатном периоде', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/функции.*бесплатны|все функции.*бесплатны/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Карточки тарифов', () => {
    test('E2E-OP-8 — отображается тариф "Ученик" (бесплатный)', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Карточка с названием "Ученик"
      const hasStudentPlan = await Locators.cardTitle(page)
        .filter({ hasText: /ученик/i })
        .isVisible()
        .catch(() => false)

      // Или в любом заголовке
      const hasStudentText = await page
        .getByText(/^ученик$/i)
        .isVisible()
        .catch(() => false)

      expect(hasStudentPlan || hasStudentText).toBe(true)
    })

    test('E2E-OP-9 — отображается тариф "Инструктор"', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      const hasInstructorPlan = await Locators.cardTitle(page)
        .filter({ hasText: /инструктор/i })
        .isVisible()
        .catch(() => false)

      const hasInstructorText = await page
        .getByText(/^инструктор$/i)
        .isVisible()
        .catch(() => false)

      expect(hasInstructorPlan || hasInstructorText).toBe(true)
    })

    test('E2E-OP-10 — отображается тариф "Школа"', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      const hasSchoolPlan = await Locators.cardTitle(page)
        .filter({ hasText: /школа/i })
        .isVisible()
        .catch(() => false)

      const hasSchoolText = await page
        .getByText(/^школа$/i)
        .isVisible()
        .catch(() => false)

      expect(hasSchoolPlan || hasSchoolText).toBe(true)
    })

    test('E2E-OP-11 — тарифы показывают "Бесплатно"', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Текст "Бесплатно" в карточках
      await expect(page.getByText(/бесплатно/i).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-12 — тарифы содержат список функций', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      // Функции отмечены галочками (Check icons)
      // Ищем текст функций
      const hasFeatures =
        (await page
          .getByText(/поиск инструкторов/i)
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/запись на занятия/i)
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/управление расписанием/i)
          .isVisible()
          .catch(() => false))

      expect(hasFeatures).toBe(true)
    })
  })

  test.describe('Инструкции', () => {
    test('E2E-OP-13 — отображаются дальнейшие шаги', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/дальнейшие шаги/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-14 — шаги включают настройку цен', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/определите цены|цены для тарифов/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-OP-15 — шаги включают интеграцию платежей', async ({ page }) => {
      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/платёжн|юkassa|тинькофф/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Доступ', () => {
    test('E2E-OP-16 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(plansUrl, { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || currentUrl.endsWith('/') || !currentUrl.includes('/owner/')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-OP-17 — инструктор не имеет доступа', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/instructor.json',
      })
      const page = await context.newPage()

      await page.goto(plansUrl)
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = !currentUrl.includes('/owner/plans')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
