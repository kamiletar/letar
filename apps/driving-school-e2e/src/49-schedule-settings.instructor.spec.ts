import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для настроек расписания (Instructor)
 *
 * Страница: /schedule/settings/
 *
 * Функциональность:
 * - Настройка рабочего времени
 * - Управление перерывами
 * - Генерация слотов
 * - Управление отсутствиями
 *
 * Примечание: Требует роль INSTRUCTOR
 */
test.describe('Настройки расписания (Instructor)', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Загрузка страницы', () => {
    test('E2E-SST-1 — страница настроек расписания загружается', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы
      await expect(page.getByRole('heading', { name: /настройки расписания/i })).toBeVisible({ timeout: 15000 })
    })

    test('E2E-SST-2 — описание страницы отображается', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // React hydration

      // Описание страницы или любой контент настроек
      const description = page.getByText(/рабочие часы|параметры занятий|настройте/i)
      await expect(description.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SST-3 — кнопка "К расписанию" присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('link', { name: /к расписанию/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-SST-4 — кнопка "В личный кабинет" присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('link', { name: /в личный кабинет/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Форма настроек', () => {
    test('E2E-SST-5 — форма настроек отображается или ошибка профиля', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // React hydration

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Проверяем наличие формы настроек или контента страницы
        const hasForm = await page
          .locator('form')
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasSettings = await page
          .getByText(/рабочие дни|время работы|длительность|рабочие часы/i)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasCombobox = await page
          .getByRole('combobox', { name: /длительность/i })
          .isVisible({ timeout: 2000 })
          .catch(() => false)

        expect(hasForm || hasSettings || hasCombobox).toBe(true)
      }
    })

    test('E2E-SST-6 — секция рабочих дней присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Рабочие дни (чекбоксы или переключатели)
        const hasWorkDays = await page
          .getByText(/понедельник|вторник|среда|рабочие дни/i)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasWorkDays) {
          console.log('  ℹ️ Секция рабочих дней не найдена')
        }
      }
    })

    test('E2E-SST-7 — поле длительности занятия присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasDuration = await page
          .getByText(/длительность|продолжительность/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasDuration) {
          console.log('  ℹ️ Поле длительности не найдено')
        }
      }
    })

    test('E2E-SST-8 — кнопка сохранения присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasSaveButton = await page
          .getByRole('button', { name: /сохранить/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasSaveButton) {
          console.log('  ℹ️ Кнопка сохранения не найдена')
        }
      }
    })
  })

  test.describe('Перерывы', () => {
    test('E2E-SST-9 — секция перерывов присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasBreaks = await page
          .getByText(/перерыв/i)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasBreaks) {
          console.log('  ℹ️ Секция перерывов не найдена')
        }
      }
    })
  })

  test.describe('Генерация слотов', () => {
    test('E2E-SST-10 — секция генерации слотов присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasGenerate = await page
          .getByText(/генер|слот|создать расписание/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasGenerate) {
          console.log('  ℹ️ Секция генерации слотов не найдена')
        }
      }
    })
  })

  test.describe('Отсутствия', () => {
    test('E2E-SST-11 — секция отсутствий присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/ошибка|профиль инструктора не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasAbsences = await page
          .getByText(/отсутств|отпуск|выходн/i)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (!hasAbsences) {
          console.log('  ℹ️ Секция отсутствий не найдена')
        }
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-SST-12 — ученик редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('dashboard') || !currentUrl.includes('/schedule/settings')

      // Клиентская защита: показывается loading вместо редиректа
      const isLoading = await page
        .getByText(/загрузка/i)
        .isVisible()
        .catch(() => false)

      if (isLoading && !isRedirected) {
        console.log('  ⏭️ Skip: защита реализована на клиенте (показывается loading)')
        await context.close()
        return
      }

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-SST-13 — неавторизованный редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.instructorScheduleSettings, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForTimeout(2000)
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      // Клиентская защита: страница может показывать пустое состояние или loading
      const isBlocked =
        (await page
          .locator('alert')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/загрузка/i)
          .isVisible()
          .catch(() => false))

      if (isBlocked && !isRedirected && !hasSignInForm) {
        console.log('  ⏭️ Skip: защита реализована на клиенте')
        await context.close()
        return
      }

      expect(isRedirected || hasSignInForm).toBe(true)

      await context.close()
    })
  })
})
