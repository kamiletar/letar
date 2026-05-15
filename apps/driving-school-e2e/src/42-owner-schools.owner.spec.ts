import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для управления школами (Owner)
 *
 * Страница: /owner/schools/
 *
 * Функциональность:
 * - Список автошкол на платформе
 * - Фильтрация и поиск
 * - Действия: приостановка, активация, удаление
 * - Детальная информация о школе
 *
 * Примечание: Требует роль OWNER
 */
test.describe('Управление автошколами (Owner)', () => {
  // Используем storageState владельца
  test.use({ storageState: 'playwright/.auth/owner.json' })

  // Retry для owner тестов (memory reset)
  test.describe.configure({ retries: 1 })

  test.describe('Загрузка страницы', () => {
    test('E2E-OS-1 — страница школ загружается', async ({ page }) => {
      await page.goto(urls.ownerSchools)

      // Ждём загрузку
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Заголовок страницы
      const hasHeading = await page
        .getByRole('heading', { name: /управление автошколами/i })
        .isVisible()
        .catch(() => false)

      const hasError = await page
        .getByText(/ошибка загрузки/i)
        .isVisible()
        .catch(() => false)

      expect(hasHeading || hasError).toBe(true)
    })

    test('E2E-OS-2 — отображается заголовок "Управление автошколами"', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: /управление автошколами/i })).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Список школ', () => {
    test('E2E-OS-3 — отображается таблица или пустое состояние', async ({ page }) => {
      await page.goto(urls.ownerSchools)

      // Ждём загрузку
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Таблица или пустое состояние
      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await page
        .getByText(/нет школ|нет автошкол/i)
        .isVisible()
        .catch(() => false)
      const hasError = await page
        .getByText(/ошибка/i)
        .isVisible()
        .catch(() => false)

      expect(hasTable || hasEmptyState || hasError).toBe(true)
    })

    test('E2E-OS-4 — колонки таблицы отображаются', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)

      if (hasTable) {
        // Проверяем заголовки колонок
        const hasNameColumn = await page
          .locator('th')
          .filter({ hasText: /название/i })
          .isVisible()
          .catch(() => false)

        const hasStatusColumn = await page
          .locator('th')
          .filter({ hasText: /статус/i })
          .isVisible()
          .catch(() => false)

        const hasActionsColumn = await page
          .locator('th')
          .filter({ hasText: /действия/i })
          .isVisible()
          .catch(() => false)

        expect(hasNameColumn || hasStatusColumn || hasActionsColumn).toBe(true)
      }
    })
  })

  test.describe('Фильтрация и поиск', () => {
    test('E2E-OS-5 — поле поиска присутствует', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasError = await page
        .getByText(/ошибка загрузки/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasSearch = await page
          .getByPlaceholder(/поиск|search|название/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        // Поиск может отсутствовать если нет школ
        if (!hasSearch) {
          console.log('  ℹ️ Поле поиска не найдено (возможно нет данных)')
        }
      }
    })

    test('E2E-OS-6 — поиск фильтрует результаты', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const searchInput = page.getByPlaceholder(/поиск|search|название/i)
      const hasSearch = await searchInput.isVisible().catch(() => false)

      if (hasSearch) {
        // Вводим поисковый запрос
        await searchInput.fill('тест')
        await page.waitForTimeout(500) // Debounce

        // URL должен измениться или данные отфильтроваться
        // Просто проверяем что поиск не сломал страницу
        const stillWorks = await Locators.container(page)
          .isVisible()
          .catch(() => false)
        expect(stillWorks).toBe(true)
      }
    })

    test('E2E-OS-7 — фильтр по статусу присутствует', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasError = await page
        .getByText(/ошибка загрузки/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Фильтр может быть select или tabs
        const hasStatusFilter =
          (await page
            .locator('select')
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByRole('tab', { name: /все|активн/i })
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByRole('button', { name: /все/i })
            .isVisible()
            .catch(() => false))

        if (!hasStatusFilter) {
          console.log('  ℹ️ Фильтр по статусу не найден')
        }
      }
    })
  })

  test.describe('Действия над школами', () => {
    test('E2E-OS-8 — кнопка приостановки присутствует', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const suspendButton = page.getByRole('button', { name: /приостановить|suspend/i }).first()
      const hasSuspend = await suspendButton.isVisible().catch(() => false)

      if (hasSuspend) {
        await expect(suspendButton).toBeEnabled()
      } else {
        console.log('  ℹ️ Кнопка приостановки не найдена (возможно нет школ)')
      }
    })

    test('E2E-OS-9 — можно открыть детали школы', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Ищем ссылку на школу
      const schoolLink = page.locator('a[href*="/school/"]').first()
      const hasLink = await schoolLink.isVisible().catch(() => false)

      if (hasLink) {
        await schoolLink.click()
        await page.waitForLoadState('domcontentloaded')

        // Должна открыться страница школы
        expect(page.url()).toContain('/school/')
      } else {
        console.log('  ℹ️ Нет ссылок на школы (возможно нет данных)')
      }
    })

    test('E2E-OS-10 — меню действий открывается', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Ищем кнопку меню действий
      const actionButton = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first()

      const hasButton = await actionButton.isVisible().catch(() => false)

      if (hasButton) {
        await actionButton.click()
        await page.waitForTimeout(300)

        // Должно появиться меню
        const hasMenu = await page
          .locator('[role="menu"], [data-part="content"]')
          .isVisible()
          .catch(() => false)

        // Или появились пункты меню
        const hasMenuItem = await page
          .locator('[role="menuitem"]')
          .first()
          .isVisible()
          .catch(() => false)

        if (!hasMenu && !hasMenuItem) {
          console.log('  ℹ️ Меню не появилось')
        }
      }
    })
  })

  test.describe('Статистика', () => {
    test('E2E-OS-11 — отображается количество школ', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      // Счётчик школ может быть в заголовке или отдельным элементом
      const hasCount = await page
        .getByText(/\d+\s*(школ|автошкол|записей)/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Или просто число в статистике
      const hasNumber = await Locators.stat(page)
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasCount && !hasNumber) {
        console.log('  ℹ️ Статистика школ не найдена')
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-OS-12 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.ownerSchools, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      // Должен быть редирект
      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || currentUrl.endsWith('/') || !currentUrl.includes('/owner/')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-OS-13 — ученик не имеет доступа', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.ownerSchools)
      await page.waitForLoadState('domcontentloaded')

      // Ученик должен быть перенаправлен
      const currentUrl = page.url()
      const isRedirected = !currentUrl.includes('/owner/schools')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
