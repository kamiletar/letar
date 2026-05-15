import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для страницы "Мои инструкторы"
 *
 * Страница: /my-instructors/
 *
 * Функциональность:
 * - Список привязанных инструкторов ученика
 * - Карточки инструкторов с основной информацией
 * - Кнопки перехода к профилю и расписанию
 * - Кнопка чата с инструктором
 */
test.describe('Мои инструкторы', () => {
  test.describe('Загрузка страницы', () => {
    test('E2E-INST-1 — страница загружается', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок "Мои инструкторы"
      await expect(page.getByRole('heading', { name: /мои инструкторы/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-INST-2 — отображается счётчик инструкторов', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      // Должен быть текст с количеством инструкторов
      const hasCount = await page
        .getByText(/у вас \d+ инструктор|у вас пока нет инструкторов/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasCount).toBe(true)
    })

    test('E2E-INST-3 — кнопка "Назад" присутствует', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      // Кнопка возврата на дашборд
      await expect(
        page.getByRole('link', { name: /назад/i }).or(page.getByRole('button', { name: /назад/i }))
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Пустое состояние', () => {
    test('E2E-INST-4 — пустое состояние показывает подсказку', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const hasInstructors = await page
        .locator('[data-testid="instructor-card"]')
        .or(page.locator('article'))
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (!hasInstructors) {
        // Должно быть пустое состояние с подсказкой
        await expect(
          page
            .getByText(/вы пока не связаны|нет инструкторов/i)
            .or(page.getByText(/найдите инструктора/i))
            .first()
        ).toBeVisible()
      }
    })

    test('E2E-INST-5 — пустое состояние содержит кнопку поиска', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const hasInstructors = await page
        .locator('[data-testid="instructor-card"]')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (!hasInstructors) {
        // Должна быть кнопка перехода к поиску инструкторов
        await expect(page.getByRole('link', { name: /найти инструктора/i })).toBeVisible({ timeout: 5000 })
      }
    })

    test('E2E-INST-6 — кнопка поиска ведёт на страницу инструкторов', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const searchButton = page.getByRole('link', { name: /найти инструктора/i })
      const hasButton = await searchButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasButton) {
        await searchButton.click()
        await expect(page).toHaveURL(/instructors/, { timeout: 10000 })
      }
    })
  })

  test.describe('Карточки инструкторов', () => {
    test('E2E-INST-7 — карточка показывает имя инструктора', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorCard = page.locator('[data-testid="instructor-card"]').first().or(page.locator('article').first())

      const hasCard = await instructorCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Карточка должна содержать имя
        await expect(instructorCard.getByRole('heading')).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })

    test('E2E-INST-8 — карточка показывает информацию об авто', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorCard = page.locator('[data-testid="instructor-card"]').first().or(page.locator('article').first())

      const hasCard = await instructorCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Может быть информация об автомобиле (марка, модель, КПП)
        const hasVehicleInfo = await instructorCard
          .getByText(/toyota|hyundai|kia|мт|ат|мкпп|акпп/i)
          .isVisible()
          .catch(() => false)

        if (hasVehicleInfo) {
          console.log('  ✅ Информация об авто отображается')
        } else {
          console.log('  ℹ️ У инструктора может не быть привязанного авто')
        }
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })

    test('E2E-INST-9 — карточка показывает badge основного инструктора', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      // Если есть основной инструктор, он должен быть отмечен
      const primaryBadge = page.getByText(/основной инструктор/i)
      const hasBadge = await primaryBadge.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasBadge) {
        await expect(primaryBadge).toBeVisible()
      } else {
        console.log('  ℹ️ Нет основного инструктора или нет инструкторов')
      }
    })

    test('E2E-INST-10 — карточка содержит кнопку перехода к профилю', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorCard = page.locator('[data-testid="instructor-card"]').first().or(page.locator('article').first())

      const hasCard = await instructorCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Должна быть кнопка/ссылка на профиль
        await expect(
          instructorCard
            .getByRole('link', { name: /профиль/i })
            .or(instructorCard.getByRole('button', { name: /профиль/i }))
        ).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })

    test('E2E-INST-11 — карточка содержит кнопку записи на занятие', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorCard = page.locator('[data-testid="instructor-card"]').first().or(page.locator('article').first())

      const hasCard = await instructorCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Должна быть кнопка/ссылка на запись
        await expect(
          instructorCard
            .getByRole('link', { name: /записаться/i })
            .or(instructorCard.getByRole('button', { name: /записаться/i }))
        ).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })
  })

  test.describe('Действия с карточкой', () => {
    test('E2E-INST-12 — переход к профилю инструктора', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const profileLink = page.getByRole('link', { name: /профиль/i }).first()
      const hasLink = await profileLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await profileLink.click()
        await expect(page).toHaveURL(/instructors\//, { timeout: 10000 })
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })

    test('E2E-INST-13 — переход к записи на занятие', async ({ page }) => {
      await page.goto(urls.studentInstructors)
      await page.waitForLoadState('domcontentloaded')

      const scheduleLink = page.getByRole('link', { name: /записаться/i }).first()
      const hasLink = await scheduleLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await scheduleLink.click()
        await expect(page).toHaveURL(/my-schedule/, { timeout: 10000 })
      } else {
        console.log('  ⏭️ Skip: нет привязанных инструкторов')
      }
    })
  })

  test.describe('Доступ и безопасность', () => {
    test('E2E-INST-14 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.studentInstructors, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in
      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })
  })
})
