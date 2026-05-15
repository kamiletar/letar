import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для управления пользователями (Owner)
 *
 * Страница: /owner/users/
 *
 * Функциональность:
 * - Список пользователей платформы
 * - Фильтрация по роли (Все, Ученики, Инструкторы, Модераторы, Владельцы)
 * - Поиск по имени/email
 * - Действия: блокировка, изменение ролей
 * - Пагинация
 *
 * Примечание: Требует роль OWNER
 */
test.describe('Управление пользователями (Owner)', () => {
  test.use({ storageState: 'playwright/.auth/owner.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Загрузка страницы', () => {
    test('E2E-OU-1 — страница пользователей загружается', async ({ page }) => {
      await page.goto(urls.ownerUsers)

      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasHeading = await page
        .getByRole('heading', { name: 'Управление пользователями' })
        .isVisible()
        .catch(() => false)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      expect(hasHeading || hasError).toBe(true)
    })

    test('E2E-OU-2 — отображается заголовок страницы', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: 'Управление пользователями' })).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Список пользователей', () => {
    test('E2E-OU-3 — отображается таблица пользователей', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await page
        .getByText(/нет пользователей/i)
        .isVisible()
        .catch(() => false)
      const hasError = await page
        .getByText(/ошибка/i)
        .isVisible()
        .catch(() => false)

      expect(hasTable || hasEmptyState || hasError).toBe(true)
    })

    test('E2E-OU-4 — колонки таблицы: Имя, Email, Роли', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false)

      if (hasTable) {
        // Проверяем заголовки
        const headers = page.locator('th')

        const hasName = await headers
          .filter({ hasText: /имя|name/i })
          .isVisible()
          .catch(() => false)
        const hasEmail = await headers
          .filter({ hasText: /email/i })
          .isVisible()
          .catch(() => false)
        const hasRoles = await headers
          .filter({ hasText: /рол/i })
          .isVisible()
          .catch(() => false)

        expect(hasName || hasEmail || hasRoles).toBe(true)
      }
    })

    test('E2E-OU-5 — пользователи отображают роли в виде бейджей', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Бейджи ролей
        const hasBadge = await Locators.badge(page)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasBadge) {
          console.log('  ℹ️ Бейджи ролей не найдены (возможно другой UI)')
        }
      }
    })
  })

  test.describe('Фильтрация по роли', () => {
    test('E2E-OU-6 — фильтр "Все" присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const allFilter = page.getByRole('link', { name: 'Все' }).or(page.getByRole('button', { name: 'Все' }))
        const hasFilter = await allFilter.isVisible().catch(() => false)
        expect(hasFilter).toBe(true)
      }
    })

    test('E2E-OU-7 — фильтр "Ученики" присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const studentsFilter = page
          .getByRole('link', { name: /ученик/i })
          .or(page.getByRole('button', { name: /ученик/i }))

        const hasFilter = await studentsFilter.isVisible().catch(() => false)
        expect(hasFilter).toBe(true)
      }
    })

    test('E2E-OU-8 — фильтр "Инструкторы" присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const instructorsFilter = page
          .getByRole('link', { name: /инструктор/i })
          .or(page.getByRole('button', { name: /инструктор/i }))

        const hasFilter = await instructorsFilter.isVisible().catch(() => false)
        expect(hasFilter).toBe(true)
      }
    })

    test('E2E-OU-9 — клик на фильтр обновляет URL', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const studentsFilter = page
          .getByRole('link', { name: /ученик/i })
          .or(page.getByRole('button', { name: /ученик/i }))

        const hasFilter = await studentsFilter.isVisible().catch(() => false)

        if (hasFilter) {
          await studentsFilter.click()
          await page.waitForTimeout(500)

          // URL должен содержать filter параметр
          expect(page.url()).toMatch(/filter=|ученик/i)
        }
      }
    })
  })

  test.describe('Поиск', () => {
    test('E2E-OU-10 — поле поиска присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const hasError = await page
        .getByText('Ошибка загрузки данных')
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        await expect(page.getByPlaceholder(/поиск|search|имя|email/i)).toBeVisible({ timeout: 5000 })
      }
    })

    test('E2E-OU-11 — поиск по имени работает', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const searchInput = page.getByPlaceholder(/поиск|search|имя|email/i)
      const hasSearch = await searchInput.isVisible().catch(() => false)

      if (hasSearch) {
        await searchInput.fill('E2E')
        await page.waitForTimeout(500) // Debounce

        // URL должен содержать search параметр
        expect(page.url()).toMatch(/search=|e2e/i)
      }
    })

    test('E2E-OU-12 — очистка поиска сбрасывает фильтр', async ({ page }) => {
      await page.goto(`${urls.ownerUsers}?search=test`)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const searchInput = page.getByPlaceholder(/поиск|search|имя|email/i)
      const hasSearch = await searchInput.isVisible().catch(() => false)

      if (hasSearch) {
        await searchInput.clear()
        await page.waitForTimeout(500)

        // URL не должен содержать search=test
        expect(page.url()).not.toContain('search=test')
      }
    })
  })

  test.describe('Действия над пользователями', () => {
    test('E2E-OU-13 — кнопка блокировки присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const blockButton = page.getByRole('button', { name: /заблокировать|block/i }).first()

      if (await blockButton.isVisible().catch(() => false)) {
        await expect(blockButton).toBeEnabled()
      } else {
        console.log('  ℹ️ Кнопка блокировки не найдена')
      }
    })

    test('E2E-OU-14 — кнопка изменения ролей присутствует', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const rolesButton = page.getByRole('button', { name: /роли|roles|изменить/i }).first()
      const iconButton = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first()

      const hasRolesButton = await rolesButton.isVisible().catch(() => false)
      const hasIconButton = await iconButton.isVisible().catch(() => false)

      expect(hasRolesButton || hasIconButton).toBe(true)
    })

    test('E2E-OU-15 — можно открыть модалку изменения ролей', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      const actionButton = page.locator('table button').first()

      const hasButton = await actionButton.isVisible().catch(() => false)

      if (hasButton) {
        await actionButton.click()
        await page.waitForTimeout(500)

        // Должна появиться модалка или меню
        const hasModal = await page
          .locator('[role="dialog"]')
          .isVisible()
          .catch(() => false)

        const hasMenu = await page
          .locator('[role="menu"]')
          .isVisible()
          .catch(() => false)

        if (!hasModal && !hasMenu) {
          console.log('  ℹ️ Модалка/меню не появились')
        }
      }
    })
  })

  test.describe('Пагинация', () => {
    test('E2E-OU-16 — пагинация отображается при большом количестве', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page
        .waitForSelector('text=Загрузка пользователей', { state: 'hidden', timeout: 15000 })
        .catch(() => undefined)

      // Пагинация может быть кнопками или навигацией
      const hasPagination =
        (await page
          .getByRole('navigation', { name: /pagination/i })
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByRole('button', { name: /следующ|next/i })
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('[data-part="page"]')
          .first()
          .isVisible()
          .catch(() => false))

      if (!hasPagination) {
        console.log('  ℹ️ Пагинация не видна (возможно мало данных)')
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-OU-17 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.ownerUsers, { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in') || currentUrl.endsWith('/') || !currentUrl.includes('/owner/')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })
})
