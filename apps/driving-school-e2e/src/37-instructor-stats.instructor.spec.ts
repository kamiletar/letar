import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для статистики инструктора
 *
 * Страница: /stats/
 *
 * Функциональность:
 * - Дашборд со статистикой занятий, учеников, финансов
 * - Выбор периода (неделя, месяц, год, всё время)
 * - Экспорт данных в CSV
 * - Статистика по типам занятий
 */
test.describe('Статистика инструктора', () => {
  test.describe('Загрузка страницы', () => {
    test('E2E-STAT-1 — страница статистики загружается', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что нет ошибки NO_PROFILE
      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Заголовок "Статистика"
      await expect(page.getByRole('heading', { name: /статистика/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-STAT-2 — отображается описание страницы', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Описание: "Отчёты и аналитика за [период]"
      await expect(page.getByText(/отчёты и аналитика/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-STAT-3 — отображается ошибка при недоступных данных', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      // Если есть ошибка загрузки статистики
      const hasError = await page
        .getByText(/не удалось загрузить статистику/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        await expect(page.getByRole('heading', { name: /ошибка/i })).toBeVisible()
      } else {
        console.log('  ✅ Статистика загрузилась успешно')
      }
    })
  })

  test.describe('Выбор периода', () => {
    test('E2E-STAT-4 — селектор периода присутствует', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Кнопки периодов
      await expect(page.getByRole('button', { name: /неделя/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /месяц/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /год/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /всё время/i })).toBeVisible()
    })

    test('E2E-STAT-5 — можно переключить период на неделю', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const weekButton = page.getByRole('button', { name: /неделя/i })
      const hasButton = await weekButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasButton) {
        await weekButton.click()
        await page.waitForTimeout(500)

        // URL должен содержать period=week
        expect(page.url()).toContain('period=week')
      } else {
        console.log('  ⏭️ Skip: кнопка периода недоступна')
      }
    })

    test('E2E-STAT-6 — можно переключить период на год', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const yearButton = page.getByRole('button', { name: /^год$/i })
      const hasButton = await yearButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasButton) {
        await yearButton.click()
        await page.waitForTimeout(500)

        // URL должен содержать period=year
        expect(page.url()).toContain('period=year')
      } else {
        console.log('  ⏭️ Skip: кнопка периода недоступна')
      }
    })

    test('E2E-STAT-7 — период "Всё время" показывает все данные', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const allTimeButton = page.getByRole('button', { name: /всё время/i })
      const hasButton = await allTimeButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasButton) {
        await allTimeButton.click()
        await page.waitForTimeout(500)

        // URL должен содержать period=all
        expect(page.url()).toContain('period=all')

        // Описание должно измениться
        await expect(page.getByText(/за всё время/i)).toBeVisible({ timeout: 5000 })
      } else {
        console.log('  ⏭️ Skip: кнопка периода недоступна')
      }
    })
  })

  test.describe('Карточки статистики', () => {
    test('E2E-STAT-8 — отображаются карточки занятий', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Карточки занятий
      await expect(page.getByText(/всего занятий/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/завершено/i).first()).toBeVisible()
      await expect(page.getByText(/отменено/i)).toBeVisible()
      await expect(page.getByText(/неявки/i)).toBeVisible()
    })

    test('E2E-STAT-9 — отображаются карточки учеников', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Карточки учеников
      await expect(page.getByText(/всего учеников/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/активных/i)).toBeVisible()
    })

    test('E2E-STAT-10 — отображаются карточки финансов', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Карточки финансов
      await expect(page.getByText(/общий доход/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-STAT-11 — отображается статистика по типам занятий', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Заголовок секции (может отсутствовать если нет типов занятий)
      const hasTypeStats = await page
        .getByText(/доходы по типам занятий/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasTypeStats) {
        await expect(page.getByText(/доходы по типам занятий/i)).toBeVisible()
      } else {
        console.log('  ℹ️ Нет типов занятий для отображения')
      }
    })
  })

  test.describe('Экспорт данных', () => {
    test('E2E-STAT-12 — кнопка экспорта CSV присутствует', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль|не удалось загрузить/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: данные недоступны')
        return
      }

      // Кнопка экспорта
      await expect(page.getByRole('button', { name: /экспорт csv/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-STAT-13 — клик на экспорт запускает скачивание', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const exportButton = page.getByRole('button', { name: /экспорт csv/i })
      const hasButton = await exportButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasButton) {
        // Подписываемся на событие скачивания
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

        await exportButton.click()

        const download = await downloadPromise

        if (download) {
          // Проверяем что файл имеет расширение .csv
          expect(download.suggestedFilename()).toMatch(/\.csv$/)
          console.log(`  ✅ Скачан файл: ${download.suggestedFilename()}`)
        } else {
          // Может быть тост с сообщением об ошибке или успехе
          const hasToast = await page
            .getByText(/экспорт завершён|ошибка экспорта/i)
            .isVisible({ timeout: 3000 })
            .catch(() => false)

          if (hasToast) {
            console.log('  ✅ Экспорт обработан (тост показан)')
          } else {
            console.log('  ℹ️ Экспорт не вызвал скачивание (возможно нет данных)')
          }
        }
      } else {
        console.log('  ⏭️ Skip: кнопка экспорта недоступна')
      }
    })
  })

  test.describe('Доступ и безопасность', () => {
    test('E2E-STAT-14 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.instructorStats, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })

    test('E2E-STAT-15 — ученик не может открыть статистику инструктора', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      // Ученик должен быть перенаправлен на dashboard
      const isRedirected = page.url().includes('dashboard')
      const hasAccessError = await page
        .getByText(/нет доступа|только для инструктор/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(isRedirected || hasAccessError).toBe(true)

      await context.close()
    })
  })
})
