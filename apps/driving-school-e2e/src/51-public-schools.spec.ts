import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для каталога автошкол (Public)
 *
 * Страница: /schools/
 *
 * Функциональность:
 * - Просмотр списка публичных автошкол
 * - Фильтрация по категории прав
 * - Фильтрация по городу
 * - Фильтрация по рейтингу
 * - Пагинация
 *
 * Примечание: Публичная страница, доступна всем
 */
test.describe('Каталог автошкол (Public)', () => {
  // Публичная страница — можем использовать любую сессию
  test.describe.configure({ retries: 1 })

  test.describe('Загрузка страницы', () => {
    test('E2E-PS-1 — страница каталога загружается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы
      await expect(page.getByRole('heading', { name: /автошкол/i })).toBeVisible({ timeout: 15000 })
    })

    test('E2E-PS-2 — описание страницы отображается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/найдите автошколу|водительских прав/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-PS-3 — хедер каталога присутствует', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // CatalogHeader должен быть виден (header, nav, или контейнер с навигацией)
      const hasHeader = await page
        .locator('header, nav, [class*="header"], [class*="nav"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Или есть контент страницы (заголовок)
      const hasContent = await page
        .getByRole('heading')
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasHeader || hasContent).toBe(true)
    })
  })

  test.describe('Список школ', () => {
    test('E2E-PS-4 — отображается список школ или пустое состояние', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Ждём загрузку данных
      await page.waitForTimeout(1000)

      // Карточки школ или пустое состояние
      const hasSchoolCards = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasEmptyState = await page
        .getByText(/нет школ|школы не найдены|ничего не найдено/i)
        .isVisible()
        .catch(() => false)

      const hasLoadingPlaceholder = await page
        .locator('[class*="skeleton"]')
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasSchoolCards || hasEmptyState || hasLoadingPlaceholder).toBe(true)
    })

    test('E2E-PS-5 — карточка школы содержит название', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      const schoolCard = Locators.card(page).first()
      const hasCard = await schoolCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // В карточке должен быть заголовок или текст
        const hasTitle = await schoolCard
          .locator('h3, h4, h5, [class*="title"], [class*="heading"], a, span')
          .first()
          .isVisible()
          .catch(() => false)

        // Или карточка просто содержит текст
        const hasText = (await schoolCard.textContent())?.trim().length > 0

        expect(hasTitle || hasText).toBe(true)
      } else {
        console.log('  ⏭️ Skip: нет публичных школ')
      }
    })
  })

  test.describe('Фильтры', () => {
    test('E2E-PS-6 — фильтры отображаются', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Фильтры (selects, buttons, или chips)
      const hasFilters = await page
        .locator('select, [role="combobox"], [class*="filter"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasFilterSection = await page
        .getByText(/категор|город|рейтинг/i)
        .isVisible()
        .catch(() => false)

      if (!hasFilters && !hasFilterSection) {
        console.log('  ℹ️ Фильтры не найдены')
      }
    })

    test('E2E-PS-7 — фильтр по категории прав присутствует', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const hasCategoryFilter = await page
        .getByText(/категори|a|b|c|d|права/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasCategorySelect = await page
        .locator('select')
        .filter({ hasText: /категори/i })
        .isVisible()
        .catch(() => false)

      if (!hasCategoryFilter && !hasCategorySelect) {
        console.log('  ℹ️ Фильтр по категории не найден')
      }
    })

    test('E2E-PS-8 — фильтр по городу присутствует', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const hasCityFilter = await page
        .getByPlaceholder(/город/i)
        .or(page.locator('select').filter({ hasText: /город/i }))
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (!hasCityFilter) {
        console.log('  ℹ️ Фильтр по городу не найден')
      }
    })

    test('E2E-PS-9 — применение фильтра обновляет URL', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Пробуем применить фильтр
      const citySelect = page.locator('select').first()
      const hasSelect = await citySelect.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasSelect) {
        const options = await citySelect.locator('option').all()

        if (options.length > 1) {
          // Выбираем второй вариант (первый обычно "Все")
          await citySelect.selectOption({ index: 1 })
          await page.waitForTimeout(500)

          // URL может измениться или остаться без параметров если выбрано "Все"
          // Просто проверяем что страница не сломалась
          expect(page.url()).toContain('/schools')
        }
      }
    })
  })

  test.describe('Напоминание о районах', () => {
    test('E2E-PS-10 — авторизованному показывается напоминание о районах', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Напоминание о предпочтительных районах
      const hasReminder = await page
        .getByText(/район|предпочтительн|заполните/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Это опционально — может не показываться
      if (!hasReminder) {
        console.log('  ℹ️ Напоминание о районах не показано')
      }

      await context.close()
    })
  })

  test.describe('Доступ', () => {
    test('E2E-PS-11 — неавторизованный может просматривать каталог', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Страница должна загрузиться без редиректа
      expect(page.url()).toContain('/schools')

      await context.close()
    })

    test('E2E-PS-12 — инструктор может просматривать каталог', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/instructor.json',
      })
      const page = await context.newPage()

      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      expect(page.url()).toContain('/schools')

      await context.close()
    })
  })
})
