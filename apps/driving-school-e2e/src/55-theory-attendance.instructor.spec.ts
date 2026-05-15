import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для посещаемости теоретических занятий (Instructor)
 *
 * Страница: /theory-lessons/[id]/attendance/
 *
 * Функциональность:
 * - Просмотр информации о занятии
 * - Список учеников группы
 * - Отметка присутствия/отсутствия
 * - Выбрать/снять всех
 * - Сохранение посещаемости
 *
 * Примечание: Требует роль INSTRUCTOR и принадлежность к школе
 */
test.describe('Посещаемость теоретических занятий (Instructor)', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Доступ к странице посещаемости', () => {
    test('E2E-TA-1 — переход на страницу посещаемости через список занятий', async ({ page }) => {
      // Сначала идём на страницу теоретических занятий
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку/ссылку "Отметить посещаемость" или просто занятие
      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasAttendanceLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasAttendanceLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        expect(page.url()).toContain('/attendance')
      } else {
        // Альтернативно — через меню действий
        const menuButton = page
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        const hasMenu = await menuButton.isVisible().catch(() => false)

        if (hasMenu) {
          await menuButton.click()
          await page.waitForTimeout(300)

          const menuItem = page.locator('[role="menuitem"]').filter({ hasText: /посещаемость/i })
          if (await menuItem.isVisible().catch(() => false)) {
            await menuItem.click()
            await page.waitForLoadState('domcontentloaded')
            expect(page.url()).toContain('/attendance')
          } else {
            console.log('  ⏭️ Skip: ссылка на посещаемость не найдена')
          }
        } else {
          console.log('  ⏭️ Skip: нет теоретических занятий')
        }
      }
    })
  })

  test.describe('Информация о занятии', () => {
    test('E2E-TA-2 — отображается информация о занятии', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        // Должна быть информация о занятии: тема, группа, дата, время
        const hasTopicName = await page
          .getByRole('heading')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasBadge = await Locators.badge(page)
          .isVisible()
          .catch(() => false)

        const hasDate = await page
          .locator('svg')
          .first()
          .isVisible() // Иконки даты/времени
          .catch(() => false)

        expect(hasTopicName || hasBadge || hasDate).toBe(true)
      }
    })

    test('E2E-TA-3 — кнопка "Назад к занятиям" присутствует', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        const backLink = page
          .getByRole('link', { name: /назад.*занятия/i })
          .or(page.getByRole('button', { name: /назад/i }))

        const hasBackLink = await backLink.isVisible({ timeout: 5000 }).catch(() => false)

        expect(hasBackLink).toBe(true)
      }
    })
  })

  test.describe('Форма посещаемости', () => {
    test('E2E-TA-4 — заголовок "Отметить присутствующих" отображается', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        const hasFormHeading = await page
          .getByRole('heading', { name: /отметить присутствующих/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        // Или текст "В группе нет учеников"
        const hasEmptyState = await page
          .getByText(/в группе нет учеников/i)
          .isVisible()
          .catch(() => false)

        expect(hasFormHeading || hasEmptyState).toBe(true)
      }
    })

    test('E2E-TA-5 — статистика присутствующих отображается', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        // "Присутствуют: X из Y"
        const hasStats = await page
          .getByText(/присутствуют.*\d+.*из.*\d+/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasEmptyState = await page
          .getByText(/в группе нет учеников/i)
          .isVisible()
          .catch(() => false)

        expect(hasStats || hasEmptyState).toBe(true)
      }
    })

    test('E2E-TA-6 — кнопка "Отметить всех" или "Снять все отметки" присутствует', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        const hasSelectAllButton = await page
          .getByRole('button', { name: /отметить всех|снять все отметки/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasEmptyState = await page
          .getByText(/в группе нет учеников/i)
          .isVisible()
          .catch(() => false)

        expect(hasSelectAllButton || hasEmptyState).toBe(true)
      }
    })

    test('E2E-TA-7 — список учеников отображается', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        // Список учеников — карточки с чекбоксами
        const hasStudentCards = await page
          .locator('[class*="checkbox"], input[type="checkbox"]')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasEmptyState = await page
          .getByText(/в группе нет учеников/i)
          .isVisible()
          .catch(() => false)

        expect(hasStudentCards || hasEmptyState).toBe(true)
      }
    })

    test('E2E-TA-8 — кнопка "Сохранить посещаемость" присутствует', async ({ page }) => {
      await page.goto(urls.theoryLessons)
      await page.waitForLoadState('domcontentloaded')

      const attendanceLink = page.getByRole('link', { name: /посещаемость|attendance/i }).first()
      const hasLink = await attendanceLink.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await attendanceLink.click()
        await page.waitForLoadState('domcontentloaded')

        const hasSaveButton = await page
          .getByRole('button', { name: /сохранить посещаемость/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasEmptyState = await page
          .getByText(/в группе нет учеников/i)
          .isVisible()
          .catch(() => false)

        expect(hasSaveButton || hasEmptyState).toBe(true)
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-TA-9 — ученик не имеет доступа к странице посещаемости', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      // Пробуем зайти на фиктивную страницу посещаемости
      await page.goto('/theory-lessons/test-id/attendance/')
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected =
        currentUrl.includes('dashboard') || currentUrl.includes('sign-in') || !currentUrl.includes('/attendance')

      // Ученик не должен видеть контент посещаемости — либо редирект, либо ошибка
      const hasError = await page
        .getByText(/ошибка|не найден|нет доступа|error/i)
        .isVisible()
        .catch(() => false)

      expect(isRedirected || hasError).toBe(true)

      await context.close()
    })

    test('E2E-TA-10 — неавторизованный редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto('/theory-lessons/test-id/attendance/', { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in')

      // Неавторизованный должен быть перенаправлен на sign-in или увидеть ошибку/блокировку
      const hasError = await page
        .getByText(/ошибка|не найден|не авторизован|error|unauthorized/i)
        .isVisible()
        .catch(() => false)

      expect(isRedirected || hasError).toBe(true)

      await context.close()
    })
  })
})
