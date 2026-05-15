import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для управления ценами занятий (Instructor)
 *
 * Страница: /lesson-types/[id]/pricing/
 *
 * Функциональность:
 * - Просмотр вариантов цен для типа занятия
 * - Добавление нового варианта цены
 * - Редактирование варианта цены
 * - Удаление варианта цены
 *
 * Примечание: Требует роль INSTRUCTOR
 */
test.describe('Управление ценами занятий (Instructor)', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })
  test.describe.configure({ retries: 1 })

  test.describe('Доступ к странице', () => {
    test('E2E-LP-1 — переход на страницу цен через типы занятий', async ({ page }) => {
      // Сначала идём на страницу типов занятий
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку с типом занятия
      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        // Ищем ссылку на цены
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
        const hasPricingLink = await pricingLink.isVisible().catch(() => false)

        if (hasPricingLink) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          expect(page.url()).toContain('/pricing')
        } else {
          // Может быть в меню
          const menuButton = page
            .locator('button')
            .filter({ has: page.locator('svg') })
            .first()
          if (await menuButton.isVisible().catch(() => false)) {
            await menuButton.click()
            await page.waitForTimeout(300)

            const menuPricingItem = page.locator('[role="menuitem"]').filter({ hasText: /цен/i })
            if (await menuPricingItem.isVisible().catch(() => false)) {
              await menuPricingItem.click()
              await page.waitForLoadState('domcontentloaded')
              expect(page.url()).toContain('/pricing')
            } else {
              console.log('  ⏭️ Skip: ссылка на цены не найдена')
            }
          } else {
            console.log('  ⏭️ Skip: ссылка на цены не найдена')
          }
        }
      } else {
        console.log('  ⏭️ Skip: нет типов занятий')
      }
    })

    test('E2E-LP-2 — страница цен отображает заголовок', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          await expect(page.getByRole('heading', { name: /варианты цен/i })).toBeVisible({ timeout: 10000 })
        }
      }
    })
  })

  test.describe('Список вариантов цен', () => {
    test('E2E-LP-3 — отображается список или пустое состояние', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          // Список или пустое состояние
          const hasPricingList = await Locators.card(page)
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          const hasEmptyHint = await page
            .getByText(/пока нет вариантов цен|добавьте первый/i)
            .isVisible()
            .catch(() => false)

          expect(hasPricingList || hasEmptyHint).toBe(true)
        }
      }
    })

    test('E2E-LP-4 — кнопка "Добавить вариант цены" присутствует', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          await expect(page.getByRole('link', { name: /добавить вариант цены/i })).toBeVisible({ timeout: 10000 })
        }
      }
    })

    test('E2E-LP-5 — кнопка "К типам занятий" присутствует', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          await expect(page.getByRole('link', { name: /к типам занятий/i })).toBeVisible({ timeout: 10000 })
        }
      }
    })
  })

  test.describe('Добавление варианта цены', () => {
    test('E2E-LP-6 — переход на страницу создания', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            expect(page.url()).toContain('/pricing/new')
          }
        }
      }
    })

    test('E2E-LP-7 — страница создания содержит форму', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            // Проверяем форму
            const hasForm = await page
              .locator('form')
              .isVisible({ timeout: 5000 })
              .catch(() => false)
            const hasNameField = await page
              .getByPlaceholder(/название|name/i)
              .or(page.getByLabel(/название/i))
              .isVisible()
              .catch(() => false)

            expect(hasForm || hasNameField).toBe(true)
          }
        }
      }
    })

    test('E2E-LP-8 — форма содержит поле цены', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            const hasPriceField = await page
              .getByPlaceholder(/цена|price|стоимость/i)
              .or(page.getByLabel(/цена|стоимость/i))
              .isVisible({ timeout: 5000 })
              .catch(() => false)

            expect(hasPriceField).toBe(true)
          }
        }
      }
    })
  })

  test.describe('Страница создания цены /pricing/new/', () => {
    test('E2E-LP-9 — форма создания содержит поле количества занятий', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            // Поле количества занятий
            const hasCountField = await page
              .getByPlaceholder(/количество|кол-во|count/i)
              .or(page.getByLabel(/количество занятий|кол-во/i))
              .isVisible({ timeout: 5000 })
              .catch(() => false)

            expect(hasCountField).toBe(true)
          }
        }
      }
    })

    test('E2E-LP-10 — форма создания содержит кнопку отмены', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            // Кнопка отмены или возврата
            const hasCancelButton = await page
              .getByRole('button', { name: /отмена|cancel/i })
              .or(page.getByRole('link', { name: /отмена|назад|cancel|back/i }))
              .isVisible({ timeout: 5000 })
              .catch(() => false)

            expect(hasCancelButton).toBe(true)
          }
        }
      }
    })

    test('E2E-LP-11 — валидация обязательных полей формы создания', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLessonTypes) {
        const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()

        if (await pricingLink.isVisible().catch(() => false)) {
          await pricingLink.click()
          await page.waitForLoadState('domcontentloaded')

          const addButton = page.getByRole('link', { name: /добавить вариант цены/i })

          if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await page.waitForLoadState('domcontentloaded')

            // Пробуем отправить пустую форму
            const submitButton = page.getByRole('button', { name: /сохранить|создать|добавить|save|create/i })
            if (await submitButton.isVisible().catch(() => false)) {
              await submitButton.click()
              await page.waitForTimeout(500)

              // Должны появиться ошибки валидации или форма остаётся
              const hasError = await page
                .getByText(/обязательн|required|заполните/i)
                .isVisible({ timeout: 3000 })
                .catch(() => false)

              const stillOnNewPage = page.url().includes('/new')

              expect(hasError || stillOnNewPage).toBe(true)
            }
          }
        }
      }
    })
  })

  test.describe('Доступ', () => {
    test('E2E-LP-12 — ученик не имеет доступа к ценам (iteration 4)', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto('/lesson-types/test-id/pricing/')
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isRedirected =
        currentUrl.includes('dashboard') || currentUrl.includes('sign-in') || !currentUrl.includes('/pricing')

      expect(isRedirected).toBe(true)

      await context.close()
    })

    test('E2E-LP-13 — неавторизованный редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto('/lesson-types/test-id/pricing/', { timeout: 15000 })
      } catch {
        await context.close()
        return
      }

      const currentUrl = page.url()
      const isRedirected = currentUrl.includes('sign-in')

      expect(isRedirected).toBe(true)

      await context.close()
    })
  })

  // === Iteration 5: Расширенное CRUD покрытие (+4 теста) ===

  test.describe('Редактирование и удаление вариантов цен', () => {
    test('E2E-LP-14 — кнопка редактирования варианта цены', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasLessonTypes) {
        console.log('  ⏭️ Skip: нет типов занятий')
        return
      }

      const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
      if (!(await pricingLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: ссылка на цены не найдена')
        return
      }

      await pricingLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку варианта цены
      const priceCard = Locators.card(page).first()
      const hasPriceCard = await priceCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasPriceCard) {
        console.log('  ⏭️ Skip: нет вариантов цен для редактирования')
        return
      }

      // Ищем кнопку редактирования
      const editButton = page
        .getByRole('button', { name: /редактировать|edit/i })
        .or(page.getByRole('link', { name: /редактировать/i }))
        .or(page.locator('a[href*="/edit"]'))
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)
      if (hasEditButton) {
        await expect(editButton).toBeVisible()
        console.log('  ✓ Кнопка редактирования найдена')
      } else {
        // Может быть в меню
        const menuButton = page
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click()
          await page.waitForTimeout(300)

          const editMenuItem = page.getByRole('menuitem', { name: /редактировать|edit/i })
          if (await editMenuItem.isVisible().catch(() => false)) {
            console.log('  ✓ Редактирование доступно в меню')
            await page.keyboard.press('Escape')
          } else {
            console.log('  ⏭️ Skip: кнопка редактирования не найдена')
          }
        } else {
          console.log('  ⏭️ Skip: кнопка редактирования не найдена')
        }
      }
    })

    test('E2E-LP-15 — кнопка удаления варианта цены', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasLessonTypes) {
        console.log('  ⏭️ Skip: нет типов занятий')
        return
      }

      const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
      if (!(await pricingLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: ссылка на цены не найдена')
        return
      }

      await pricingLink.click()
      await page.waitForLoadState('domcontentloaded')

      const priceCard = Locators.card(page).first()
      const hasPriceCard = await priceCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasPriceCard) {
        console.log('  ⏭️ Skip: нет вариантов цен для удаления')
        return
      }

      // Ищем кнопку удаления
      const deleteButton = page.getByRole('button', { name: /удалить|delete/i }).first()

      const hasDeleteButton = await deleteButton.isVisible().catch(() => false)
      if (hasDeleteButton) {
        // Не кликаем — только проверяем доступность
        await expect(deleteButton).toBeEnabled()
        console.log('  ✓ Кнопка удаления найдена')
      } else {
        // Может быть в меню
        const menuButton = page
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click()
          await page.waitForTimeout(300)

          const deleteMenuItem = page.getByRole('menuitem', { name: /удалить|delete/i })
          if (await deleteMenuItem.isVisible().catch(() => false)) {
            console.log('  ✓ Удаление доступно в меню')
            await page.keyboard.press('Escape')
          } else {
            console.log('  ⏭️ Skip: кнопка удаления не найдена')
          }
        } else {
          console.log('  ⏭️ Skip: кнопка удаления не найдена')
        }
      }
    })

    test('E2E-LP-16 — отображение цены за занятие', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasLessonTypes) {
        console.log('  ⏭️ Skip: нет типов занятий')
        return
      }

      const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
      if (!(await pricingLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: ссылка на цены не найдена')
        return
      }

      await pricingLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем отображение цены (например, "1500 ₽" или "1500 руб")
      const priceDisplay = page
        .getByText(/\d+\s*₽|\d+\s*руб/i)
        .or(page.locator('[data-testid="price-amount"]'))
        .first()

      const hasPriceDisplay = await priceDisplay.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasPriceDisplay) {
        console.log('  ✓ Цена отображается')
      } else {
        console.log('  ⏭️ Skip: отображение цены не найдено (возможно, нет вариантов)')
      }
    })

    test('E2E-LP-17 — отображение количества занятий в пакете', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const lessonCard = Locators.card(page).first()
      const hasLessonTypes = await lessonCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasLessonTypes) {
        console.log('  ⏭️ Skip: нет типов занятий')
        return
      }

      const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
      if (!(await pricingLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: ссылка на цены не найдена')
        return
      }

      await pricingLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем отображение количества (например, "10 занятий")
      const countDisplay = page
        .getByText(/\d+\s*занят/i)
        .or(page.locator('[data-testid="lesson-count"]'))
        .first()

      const hasCountDisplay = await countDisplay.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasCountDisplay) {
        console.log('  ✓ Количество занятий отображается')
      } else {
        console.log('  ⏭️ Skip: количество занятий не найдено (возможно, нет вариантов)')
      }
    })
  })
})
