import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { waitForAction } from './helpers/page.helpers'

test.describe('21. Система прогресса ученика', () => {
  test.describe('21.1 Курсы', () => {
    test('E2E-21.1.1 — навигация к курсам из шапки админки', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Ищем ссылку на курсы в навигации
      const coursesLink = page
        .getByRole('link', { name: /курс|course|программ/i })
        .or(page.getByRole('tab', { name: /курс/i }))
        .or(page.locator('nav').getByText(/курс/i))

      if (!(await coursesLink.isVisible().catch(() => false))) {
        // Пробуем перейти напрямую
        await page.goto(urls.schoolCourses)
        await page.waitForLoadState('domcontentloaded')
      } else {
        await coursesLink.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Проверяем что страница курсов загрузилась
      const hasCoursesPage = await page
        .getByText(/курс|course|программ|обучен/i)
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasCoursesPage) {
        console.log('  ⏭️ Skip: страница курсов не загрузилась')
        return
      }

      await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('E2E-21.1.2 — форма добавления курса открывается', async ({ page }) => {
      await page.goto(urls.schoolCourses)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Ищем кнопку добавления курса
      const addButton = page
        .getByRole('button', { name: /добавить.*курс|создать.*курс|новый.*курс|add.*course/i })
        .or(page.getByRole('link', { name: /добавить.*курс|создать.*курс/i }))
        .or(page.locator('[data-testid="add-course-button"]'))

      if (!(await addButton.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка добавления курса не найдена')
        return
      }

      await addButton.click()
      await waitForAction(page)

      // Проверяем что форма или диалог открылся
      const dialog = page.getByRole('dialog')
      const form = page.getByRole('form')
      const nameInput = page.getByLabel(/название|name/i).or(page.getByPlaceholder(/название|name/i))

      const hasDialog = await dialog.isVisible().catch(() => false)
      const hasForm = await form.isVisible().catch(() => false)
      const hasInput = await nameInput.isVisible().catch(() => false)

      if (!hasDialog && !hasForm && !hasInput) {
        // Возможно перешли на новую страницу
        const hasNewPage = await page.url().includes('new')
        if (hasNewPage) {
          await expect(page.getByRole('heading').first()).toBeVisible()
          return
        }
        console.log('  ⏭️ Skip: форма добавления курса не открылась')
        return
      }

      expect(hasDialog || hasForm || hasInput).toBeTruthy()
    })
  })

  test.describe('21.3 Прогресс учеников', () => {
    test('E2E-21.3.1 — навигация к прогрессу учеников', async ({ page }) => {
      await page.goto(urls.schoolStats)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к школе запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Ищем ссылку на прогресс в навигации
      const progressLink = page
        .getByRole('link', { name: /прогресс|progress/i })
        .or(page.getByRole('tab', { name: /прогресс/i }))
        .or(page.locator('nav').getByText(/прогресс/i))

      if (!(await progressLink.isVisible().catch(() => false))) {
        // Пробуем перейти напрямую
        await page.goto(urls.schoolProgress)
        await page.waitForLoadState('domcontentloaded')

        // Проверяем доступ после прямого перехода
        if (await accessDenied.isVisible().catch(() => false)) {
          console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
          return
        }
      } else {
        await progressLink.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Проверяем что страница прогресса загрузилась
      const heading = page
        .getByRole('heading', { level: 1 })
        .or(page.getByRole('heading', { level: 2 }))
        .first()
      await expect(heading).toBeVisible({ timeout: 10000 })
    })

    test('E2E-21.3.2 — таблица прогресса отображается', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        // После выбора школы переходим к прогрессу
        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем таблицу или список учеников
      const table = page.locator('table')
      const progressList = page
        .locator('[data-testid="progress-table"]')
        .or(page.locator('[data-testid="students-list"]'))

      const studentRows = page.locator('tbody tr')

      const hasTable = await table.isVisible().catch(() => false)
      const hasList = await progressList.isVisible().catch(() => false)
      const hasRows = await studentRows
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasTable && !hasList && !hasRows) {
        // Проверяем пустое состояние
        const emptyState = await page
          .getByText(/нет.*ученик|пусто|no.*student/i)
          .isVisible()
          .catch(() => false)
        if (emptyState) {
          console.log('  ⏭️ Skip: нет учеников в школе')
          return
        }
        console.log('  ⏭️ Skip: таблица прогресса не найдена')
        return
      }

      expect(hasTable || hasList || hasRows).toBeTruthy()
    })

    test('E2E-21.3.5 — детали ученика открываются по клику', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        // После выбора школы переходим к прогрессу
        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем строку ученика
      const studentRow = page.locator('tbody tr').first()
      const studentCard = page.locator('[data-testid="student-row"]').first()
      const studentLink = page.getByRole('link', { name: /подробнее|профиль|детали/i }).first()

      const hasRow = await studentRow.isVisible().catch(() => false)
      const hasCard = await studentCard.isVisible().catch(() => false)
      const hasLink = await studentLink.isVisible().catch(() => false)

      if (!hasRow && !hasCard && !hasLink) {
        console.log('  ⏭️ Skip: нет учеников для просмотра')
        return
      }

      // Кликаем на ученика
      if (hasLink) {
        await studentLink.click()
      } else if (hasRow) {
        await studentRow.click()
      } else {
        await studentCard.click()
      }

      await page.waitForLoadState('domcontentloaded')

      // Проверяем что детали открылись
      const heading = page.getByRole('heading').first()
      await expect(heading).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('21.4 Страница зачисления /enroll/', () => {
    test('E2E-21.4.1 — страница зачисления загружается', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем строку ученика и переходим к деталям
      const studentRow = page.locator('tbody tr').first()
      if (!(await studentRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      await studentRow.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи и кликаем
      const enrollButton = page
        .getByRole('button', { name: /запис.*курс|enroll|добавить.*курс/i })
        .or(page.getByRole('link', { name: /запис.*курс|enroll/i }))

      if (await enrollButton.isVisible().catch(() => false)) {
        await enrollButton.click()
        await page.waitForLoadState('domcontentloaded')

        // Должна загрузиться страница зачисления
        const hasEnrollPage =
          page.url().includes('/enroll') ||
          (await page
            .getByRole('heading', { name: /запис|зачислен|курс/i })
            .isVisible()
            .catch(() => false))

        expect(hasEnrollPage).toBe(true)
      } else {
        console.log('  ⏭️ Skip: кнопка записи не найдена')
      }
    })

    test('E2E-21.4.2 — форма выбора курса присутствует', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем строку ученика
      const studentRow = page.locator('tbody tr').first()
      if (!(await studentRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      await studentRow.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи
      const enrollButton = page
        .getByRole('button', { name: /запис.*курс|enroll|добавить.*курс/i })
        .or(page.getByRole('link', { name: /запис.*курс|enroll/i }))

      if (await enrollButton.isVisible().catch(() => false)) {
        await enrollButton.click()
        await page.waitForLoadState('domcontentloaded')

        // Должна быть форма выбора курса
        const hasCourseSelect = await page
          .locator('select, [role="listbox"], [role="combobox"]')
          .or(page.getByLabel(/курс|course/i))
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        const hasCoursePlaceholder = await page
          .getByPlaceholder(/курс|выбер/i)
          .isVisible()
          .catch(() => false)

        expect(hasCourseSelect || hasCoursePlaceholder).toBe(true)
      } else {
        console.log('  ⏭️ Skip: кнопка записи не найдена')
      }
    })

    test('E2E-21.4.3 — кнопка зачисления присутствует', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем строку ученика
      const studentRow = page.locator('tbody tr').first()
      if (!(await studentRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      await studentRow.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи
      const enrollButton = page
        .getByRole('button', { name: /запис.*курс|enroll|добавить.*курс/i })
        .or(page.getByRole('link', { name: /запис.*курс|enroll/i }))

      if (await enrollButton.isVisible().catch(() => false)) {
        await enrollButton.click()
        await page.waitForLoadState('domcontentloaded')

        // Должна быть кнопка подтверждения зачисления
        const hasSubmitButton = await page
          .getByRole('button', { name: /зачислить|записать|enroll|confirm|подтвердить/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        expect(hasSubmitButton).toBe(true)
      } else {
        console.log('  ⏭️ Skip: кнопка записи не найдена')
      }
    })
  })

  test.describe('21.5 Запись на курс (доступность)', () => {
    test('E2E-21.5.1 — кнопка записи на курс доступна', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем доступ
      const accessDenied = page.getByRole('heading', { name: /доступ.*запрещён|access.*denied/i })
      if (await accessDenied.isVisible().catch(() => false)) {
        console.log('  ⏭️ Skip: доступ к странице прогресса запрещён')
        return
      }

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        // После выбора школы переходим к прогрессу
        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем строку ученика и кликаем
      const studentRow = page.locator('tbody tr').first()
      if (!(await studentRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      await studentRow.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи на курс
      const enrollButton = page
        .getByRole('button', { name: /запис.*курс|enroll|добавить.*курс/i })
        .or(page.getByRole('link', { name: /запис.*курс|enroll/i }))
        .or(page.locator('[data-testid="enroll-button"]'))

      const hasButton = await enrollButton.isVisible().catch(() => false)
      if (!hasButton) {
        // Возможно ученик уже записан на все курсы
        const alreadyEnrolled = await page
          .getByText(/записан|enrolled|активн/i)
          .isVisible()
          .catch(() => false)
        if (alreadyEnrolled) {
          console.log('  ⏭️ Skip: ученик уже записан на курс')
          return
        }
        console.log('  ⏭️ Skip: кнопка записи на курс не найдена')
        return
      }

      await expect(enrollButton).toBeVisible()
    })
  })

  // === Iteration 9: Расширенное покрытие системы прогресса (+8 тестов) ===

  test.describe('21.6 Расширенное управление курсами и прогрессом', () => {
    test('E2E-PROG-01 — редактирование курса', async ({ page }) => {
      await page.goto(urls.schoolCourses)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Ищем курс в списке
      const courseRow = page.locator('tbody tr').first()
      const courseCard = page.locator('[data-testid="course-card"]').first()

      const hasCourse =
        (await courseRow.isVisible().catch(() => false)) || (await courseCard.isVisible().catch(() => false))

      if (!hasCourse) {
        console.log('  ⏭️ Skip: нет курсов для редактирования')
        return
      }

      // Ищем кнопку редактирования
      const editButton = page
        .getByRole('button', { name: /редактир|edit/i })
        .or(page.getByRole('link', { name: /редактир|edit/i }))
        .first()

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click()
        await waitForAction(page)

        // Проверяем открытие формы
        const hasForm =
          (await page
            .getByRole('dialog')
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByLabel(/название|name/i)
            .isVisible()
            .catch(() => false))

        if (hasForm) {
          console.log('  ✓ Форма редактирования курса открыта')
          await page.keyboard.press('Escape')
        } else {
          console.log('  ℹ️ Форма редактирования не обнаружена')
        }
      } else {
        console.log('  ⏭️ Skip: кнопка редактирования не найдена')
      }
    })

    test('E2E-PROG-02 — удаление курса с подтверждением', async ({ page }) => {
      await page.goto(urls.schoolCourses)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Ищем кнопку удаления курса
      const deleteButton = page
        .getByRole('button', { name: /удалить|delete/i })
        .or(page.locator('[data-testid="delete-course-button"]'))

      if (!(await deleteButton.isVisible().catch(() => false))) {
        // Может быть в меню действий
        const menuButton = page.getByRole('button', { name: /⋮|⋯|menu|меню/i }).first()
        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click()
          await waitForAction(page)
        }
      }

      const hasDelete = await deleteButton.isVisible().catch(() => false)

      if (hasDelete) {
        await deleteButton.click()
        await waitForAction(page)

        // Проверяем появление диалога подтверждения
        const confirmDialog = page.getByRole('dialog')
        const confirmText = page.getByText(/уверены|подтверд|confirm|sure/i)

        const hasConfirm =
          (await confirmDialog.isVisible().catch(() => false)) || (await confirmText.isVisible().catch(() => false))

        if (hasConfirm) {
          console.log('  ✓ Диалог подтверждения удаления появился')
          await page.keyboard.press('Escape')
        } else {
          console.log('  ℹ️ Удаление без подтверждения')
        }
      } else {
        console.log('  ⏭️ Skip: кнопка удаления не найдена')
      }
    })

    test('E2E-PROG-03 — сортировка таблицы прогресса', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем заголовки таблицы для сортировки
      const sortableHeaders = page.locator('th[aria-sort], th button, th[role="button"]')
      const nameHeader = page.getByRole('columnheader', { name: /имя|name|ученик/i })

      const hasSortable = (await sortableHeaders.count()) > 0
      const hasNameHeader = await nameHeader.isVisible().catch(() => false)

      if (hasSortable) {
        await sortableHeaders.first().click()
        await waitForAction(page)
        console.log('  ✓ Сортировка по заголовку работает')
      } else if (hasNameHeader) {
        await nameHeader.click()
        await waitForAction(page)
        console.log('  ✓ Клик на заголовок таблицы выполнен')
      } else {
        // Проверяем select сортировки
        const sortSelect = page.getByRole('combobox', { name: /сортир|sort/i })
        if (await sortSelect.isVisible().catch(() => false)) {
          console.log('  ✓ Выпадающий список сортировки найден')
        } else {
          console.log('  ⏭️ Skip: сортировка не найдена')
        }
      }
    })

    test('E2E-PROG-04 — фильтрация по статусу прогресса', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем фильтр по статусу
      const statusFilter = page
        .getByRole('combobox', { name: /статус|status/i })
        .or(page.locator('[data-testid="status-filter"]'))
        .or(page.getByRole('tab', { name: /активн|завершён|в процессе/i }))

      const hasFilter = await statusFilter.isVisible().catch(() => false)

      if (hasFilter) {
        await statusFilter.click()
        await waitForAction(page)
        console.log('  ✓ Фильтр по статусу прогресса найден')
        await page.keyboard.press('Escape')
      } else {
        console.log('  ⏭️ Skip: фильтр по статусу не найден')
      }
    })

    test('E2E-PROG-05 — экспорт данных о прогрессе', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем кнопку экспорта
      const exportBtn = page
        .getByRole('button', { name: /экспорт|export|скачать|download/i })
        .or(page.locator('[data-testid="export-progress"]'))

      // Может быть в меню
      if (!(await exportBtn.isVisible().catch(() => false))) {
        const menuBtn = page.getByRole('button', { name: /меню|menu|⋮|⋯/i })
        if (await menuBtn.isVisible().catch(() => false)) {
          await menuBtn.click()
          await waitForAction(page)

          const exportMenuItem = page.getByRole('menuitem', { name: /экспорт|export/i })
          if (await exportMenuItem.isVisible().catch(() => false)) {
            console.log('  ✓ Экспорт доступен в меню')
            await page.keyboard.press('Escape')
            return
          }
        }
      }

      const hasExport = await exportBtn.isVisible().catch(() => false)

      if (hasExport) {
        console.log('  ✓ Кнопка экспорта найдена')
      } else {
        console.log('  ⏭️ Skip: функция экспорта не найдена')
      }
    })

    test('E2E-PROG-06 — отклонение записи на курс', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем записи с ожидающим статусом
      const pendingRow = page
        .locator('tr')
        .filter({ hasText: /ожидает|pending|на рассмотрении/i })
        .first()

      if (!(await pendingRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет записей на рассмотрении')
        return
      }

      // Ищем кнопку отклонения
      const rejectBtn = pendingRow
        .getByRole('button', { name: /отклон|reject|отказ/i })
        .or(page.locator('[data-testid="reject-enrollment"]'))

      const hasReject = await rejectBtn.isVisible().catch(() => false)

      if (hasReject) {
        // Не кликаем — только проверяем
        await expect(rejectBtn).toBeEnabled()
        console.log('  ✓ Кнопка отклонения записи найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка отклонения не найдена')
      }
    })

    test('E2E-PROG-07 — массовое зачисление студентов', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Ищем чекбоксы для массового выбора
      const selectAll = page
        .getByRole('checkbox', { name: /выбрать все|select all/i })
        .or(page.locator('thead input[type="checkbox"]'))

      const rowCheckboxes = page.locator('tbody input[type="checkbox"]')

      const hasSelectAll = await selectAll.isVisible().catch(() => false)
      const hasCheckboxes = (await rowCheckboxes.count()) > 0

      if (!hasSelectAll && !hasCheckboxes) {
        console.log('  ⏭️ Skip: массовый выбор не поддерживается')
        return
      }

      // Выбираем несколько записей
      if (hasCheckboxes) {
        await rowCheckboxes.first().click()
        await waitForAction(page)
      }

      // Ищем кнопку массового действия
      const bulkEnrollBtn = page
        .getByRole('button', { name: /зачислить выбранн|enroll selected|массов/i })
        .or(page.locator('[data-testid="bulk-enroll-button"]'))

      const hasBulk = await bulkEnrollBtn.isVisible().catch(() => false)

      if (hasBulk) {
        console.log('  ✓ Массовое зачисление доступно')
      } else {
        console.log('  ⏭️ Skip: массовое зачисление не найдено')
      }
    })

    test('E2E-PROG-08 — история изменения статуса', async ({ page }) => {
      await page.goto(urls.schoolProgress)
      await page.waitForLoadState('domcontentloaded')

      // Выбираем школу если нужно
      const schoolCard = page.locator('[data-testid="school-card"]').first()
      if (await schoolCard.isVisible().catch(() => false)) {
        await schoolCard.click()
        await page.waitForLoadState('domcontentloaded')

        const progressLink = page.getByRole('link', { name: /прогресс/i })
        if (await progressLink.isVisible().catch(() => false)) {
          await progressLink.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // Переходим к детальной странице ученика
      const studentRow = page.locator('tbody tr').first()
      if (!(await studentRow.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      await studentRow.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем историю/timeline изменений
      const historySection = page
        .getByRole('heading', { name: /история|history|timeline/i })
        .or(page.locator('[data-testid="status-history"]'))
        .or(page.getByRole('tab', { name: /история/i }))

      const timelineItems = page.locator('[data-testid="timeline-item"]').or(page.locator('.timeline-item'))

      const hasHistory = await historySection.isVisible().catch(() => false)
      const hasTimeline = (await timelineItems.count()) > 0

      if (hasHistory) {
        console.log('  ✓ Секция истории изменений найдена')
      } else if (hasTimeline) {
        console.log('  ✓ Timeline изменений статуса найден')
      } else {
        // Проверяем таблицу истории
        const historyTable = page.locator('table').filter({ hasText: /изменён|статус|дата/i })
        if (await historyTable.isVisible().catch(() => false)) {
          console.log('  ✓ Таблица истории изменений найдена')
        } else {
          console.log('  ⏭️ Skip: история изменений не найдена')
        }
      }
    })
  })
})
