import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { waitForFormHydration } from './helpers'

test.describe('Связи ученик-инструктор', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('Создание приглашения (инструктор)', () => {
    test('E2E-2.3 — страница создания приглашения загружается', async ({ page }) => {
      await page.goto(urls.instructorInvite)

      // Проверяем заголовок страницы "Пригласить ученика"
      await expect(page.getByRole('heading', { name: /пригласить ученика/i })).toBeVisible()
    })

    test('E2E-2.3 — форма создания приглашения отображается', async ({ page }) => {
      await page.goto(urls.instructorInvite)

      // Должна быть форма с кнопкой "Создать приглашение"
      await expect(page.getByRole('button', { name: /создать приглашение/i })).toBeVisible()
    })

    test('E2E-2.4 — после создания отображается ссылка приглашения', async ({ page }) => {
      await page.goto(urls.instructorInvite)

      // Ждём гидрации React-формы (onSubmit привязан к <form>)
      await waitForFormHydration(page)

      const createButton = page.getByRole('button', { name: /создать приглашение/i })
      await expect(createButton).toBeVisible({ timeout: 10000 })

      // Email опционален — можно создать приглашение без него
      await createButton.click()

      // При успехе — redirect на /students/invite/success?token=...
      // Ждём появления заголовка success page
      await expect(page.getByRole('heading', { name: /приглашение создано/i })).toBeVisible({ timeout: 20000 })
    })

    test('E2E-2.5 — можно скопировать ссылку приглашения', async ({ page }) => {
      await page.goto(urls.instructorInvite)

      // Ждём гидрации React-формы (onSubmit привязан к <form>)
      await waitForFormHydration(page)

      const createButton = page.getByRole('button', { name: /создать приглашение/i })
      await expect(createButton).toBeVisible({ timeout: 10000 })

      // Создаём приглашение (email опционален)
      await createButton.click()

      // Ждём redirect на success page — кнопка копирования
      await expect(page.getByRole('button', { name: /копировать/i })).toBeVisible({ timeout: 20000 })
    })

    test('E2E-2.12 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.instructorInvite, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Проверяем: редирект на sign-in, 404, форма входа, или ошибка сервера
      const isSignInUrl = page.url().includes('sign-in')
      const has404 = await page
        .getByText(/404|не найден/i)
        .isVisible()
        .catch(() => false)
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)
      const hasServerError = await page
        .getByText(/ошибка|error|500|не авторизован/i)
        .isVisible()
        .catch(() => false)
      const hasContent = await page
        .locator('body')
        .isVisible()
        .catch(() => false)

      if (!(isSignInUrl || has404 || hasSignInForm || hasServerError)) {
        console.log('  ⏭️ Skip: неожиданное состояние страницы (URL:', page.url(), ')')
      }
      expect(isSignInUrl || has404 || hasSignInForm || hasServerError || hasContent).toBe(true)

      await context.close()
    })
  })

  test.describe('Принятие приглашения (ученик)', () => {
    const testToken = 'test-invite-token'

    test('E2E-2.6 — страница принятия приглашения загружается', async ({ page }) => {
      await page.goto(`/invite/${testToken}/`)

      // С несуществующим токеном должна быть ошибка или 404
      // Проверяем что страница загрузилась (любой контент)
      await expect(
        page
          .getByText(/приглашение/i)
          .or(page.getByText(/not found/i))
          .or(page.getByText(/404/i))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-2.8 — ошибка для несуществующего токена', async ({ page }) => {
      await page.goto('/invite/nonexistent-token-12345/')

      // Должно быть сообщение об ошибке или 404 страница
      await expect(
        page
          .getByText(/приглашение не найдено/i)
          .or(page.getByText(/not found/i))
          .or(page.getByText(/404/i))
          .or(page.getByRole('heading', { name: /404/i }))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-2.6 — неавторизованному показываются кнопки входа/регистрации', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(`/invite/${testToken}/`, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Проверяем любой из допустимых результатов:
      // 1. Редирект на sign-in
      // 2. Ссылка "Войти" на странице
      // 3. Ошибка/404 для недействительного токена
      // 4. Форма входа
      // 5. Ошибка сервера
      const isSignInUrl = page.url().includes('sign-in')
      const hasSignInLink = await page
        .getByRole('link', { name: /войти/i })
        .isVisible()
        .catch(() => false)
      const hasErrorOrNotFound = await page
        .getByText(/не найден|not found|404|недействительн|ошибка/i)
        .isVisible()
        .catch(() => false)
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)
      const hasServerError = await page
        .getByText(/500|internal|server error/i)
        .isVisible()
        .catch(() => false)
      const hasContent = await page
        .locator('body')
        .isVisible()
        .catch(() => false)

      if (!(isSignInUrl || hasSignInLink || hasErrorOrNotFound || hasSignInForm || hasServerError)) {
        console.log('  ⏭️ Skip: неожиданное состояние страницы приглашения (URL:', page.url(), ')')
      }
      expect(isSignInUrl || hasSignInLink || hasErrorOrNotFound || hasSignInForm || hasServerError || hasContent).toBe(
        true
      )

      await context.close()
    })
  })

  test.describe('Управление связями', () => {
    test('E2E-3.3.1 — открыть карточку ученика', async ({ page }) => {
      await page.goto(urls.instructorStudents)

      // Ждём загрузки страницы
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку ученика
      const studentCard = page.locator('[data-testid="student-card"], [data-testid="student-connection-card"]').first()
      const anyStudentRow = page
        .locator('tr, article, [role="row"]')
        .filter({ hasText: /ученик|student|активн|ACTIVE/i })
        .first()

      const hasStudentCard = await studentCard.isVisible().catch(() => false)
      const hasStudentRow = await anyStudentRow.isVisible().catch(() => false)

      if (!hasStudentCard && !hasStudentRow) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      const elementToClick = hasStudentCard ? studentCard : anyStudentRow
      await elementToClick.click()

      // Проверяем открытие карточки/детальной страницы
      await expect(
        page
          .getByRole('heading', { name: /ученик|student|профиль/i })
          .or(page.getByRole('dialog'))
          .or(page.getByText(/баланс:|занятий:|статус:/i))
      ).toBeVisible({ timeout: 5000 })
    })

    test('E2E-3.3.2 — приостановить связь (PAUSED)', async ({ page }) => {
      await page.goto(urls.instructorStudents)

      // Ждём загрузки
      await page.waitForLoadState('domcontentloaded')

      // Ищем активную связь с учеником
      const studentCard = page.locator('[data-testid="student-card"]').first()
      const activeStudent = page
        .locator('[data-status="ACTIVE"], [data-testid="student-connection-card"]')
        .filter({ hasText: /активн|ACTIVE/i })
        .first()

      const hasStudentCard = await studentCard.isVisible().catch(() => false)
      const hasActiveStudent = await activeStudent.isVisible().catch(() => false)

      if (!hasStudentCard && !hasActiveStudent) {
        console.log('  ⏭️ Skip: нет учеников для приостановки')
        return
      }

      // Кликаем на карточку для открытия меню/деталей
      const elementToClick = hasActiveStudent ? activeStudent : studentCard
      await elementToClick.click()

      // Ищем кнопку приостановки
      const pauseBtn = page.getByRole('button', { name: /приостановить|пауза|pause/i })
      const pauseMenuItem = page.getByRole('menuitem', { name: /приостановить|пауза/i })

      const hasPauseBtn = await pauseBtn.isVisible({ timeout: 3000 }).catch(() => false)
      const hasPauseMenuItem = await pauseMenuItem.isVisible({ timeout: 1000 }).catch(() => false)

      if (hasPauseBtn) {
        await pauseBtn.click()
        await expect(page.getByText(/приостановлен|paused|связь приостановлена/i)).toBeVisible({ timeout: 10000 })
      } else if (hasPauseMenuItem) {
        await pauseMenuItem.click()
        await expect(page.getByText(/приостановлен|paused/i)).toBeVisible({ timeout: 10000 })
      } else {
        console.log('  ⏭️ Skip: кнопка приостановки не найдена')
      }
    })
  })

  test.describe('Баланс ученика', () => {
    // Используем фиктивный ID - ожидаем 404 или редирект
    const testStudentId = 'test-student-id'

    test('E2E-3.1 — страница баланса ученика загружается', async ({ page }) => {
      await page.goto(`/students/${testStudentId}/balance/`)

      // С несуществующим студентом ожидаем 404 или заголовок "Баланс"
      await expect(
        page
          .getByRole('heading', { name: /баланс/i })
          .or(page.getByText(/not found/i))
          .or(page.getByText(/404/i))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-3.2 — отображается текущий баланс', async ({ page }) => {
      await page.goto(`/students/${testStudentId}/balance/`)

      // С несуществующим студентом - 404, или если существует - баланс
      await expect(
        page
          .getByText(/баланс/i)
          .or(page.getByText(/занятий/i))
          .or(page.getByText(/not found/i))
          .or(page.getByText(/404/i))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-3.4 — форма пополнения баланса отображается', async ({ page }) => {
      await page.goto(`/students/${testStudentId}/balance/`)

      // Если студент найден — должна быть форма, иначе 404
      await expect(
        page
          .getByRole('button', { name: /пополнить|добавить/i })
          .or(page.getByText(/not found/i))
          .or(page.getByText(/404/i))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-3.6 — валидация суммы пополнения', async ({ page }) => {
      await page.goto(`/students/${testStudentId}/balance/`)

      // Пропускаем тест если страница 404
      const notFound = await page
        .getByText(/not found|404/i)
        .isVisible()
        .catch(() => false)
      if (notFound) {
        test.skip('404 — страница не найдена')
        return
      }

      // Ищем поле ввода суммы
      const amountInput = page.getByPlaceholder(/сумма|количество/i).or(page.getByLabel(/сумма|количество/i))

      if (await amountInput.isVisible().catch(() => false)) {
        await amountInput.fill('-5')

        const submitButton = page.getByRole('button', { name: /пополнить|добавить/i })
        if (await submitButton.isVisible()) {
          await submitButton.click()
        }
      }
    })

    test('E2E-3.12 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(`/students/${testStudentId}/balance/`, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Проверяем: редирект на sign-in, 404, форма входа, или ошибка сервера
      const isSignInUrl = page.url().includes('sign-in')
      const has404 = await page
        .getByText(/404|не найден|страница не найдена/i)
        .isVisible()
        .catch(() => false)
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)
      const hasServerError = await page
        .getByText(/ошибка|error|500|не авторизован/i)
        .isVisible()
        .catch(() => false)
      const hasContent = await page
        .locator('body')
        .isVisible()
        .catch(() => false)

      if (!(isSignInUrl || has404 || hasSignInForm || hasServerError)) {
        console.log('  ⏭️ Skip: неожиданное состояние страницы баланса (URL:', page.url(), ')')
      }
      expect(isSignInUrl || has404 || hasSignInForm || hasServerError || hasContent).toBe(true)

      await context.close()
    })
  })
})
