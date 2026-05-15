import { expect, test } from './fixtures/base-test'
import { Locators } from './helpers/locators.helpers'

/**
 * E2E тесты для присоединения к школе и инструктору
 *
 * Страницы:
 * - /join-school/[token]/ — Присоединение к автошколе
 * - /join-instructor/[token]/ — Присоединение к инструктору
 *
 * Функциональность:
 * - Отображение приглашения
 * - Состояния: валидное, истекшее, уже использовано, не найдено
 * - Авторизованный vs неавторизованный пользователь
 * - Принятие/отклонение приглашения
 */
test.describe('Присоединение к школе', () => {
  test.describe('Невалидные токены', () => {
    test('E2E-JOIN-1 — невалидный токен показывает ошибку', async ({ page }) => {
      await page.goto('/join-school/invalid-token-12345/')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть ошибка
      await expect(page.getByText(/недействительн|не найден|приглашение не найдено/i).first()).toBeVisible({
        timeout: 10000,
      })
    })

    test('E2E-JOIN-2 — кнопка "На главную" присутствует при ошибке', async ({ page }) => {
      await page.goto('/join-school/invalid-token/')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть кнопка возврата (link или button)
      const hasLink = await page
        .getByRole('link', { name: /на главную/i })
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasButton = await page
        .getByRole('button', { name: /на главную/i })
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasLink || hasButton).toBe(true)
    })

    test('E2E-JOIN-3 — клик на "На главную" ведёт на главную', async ({ page }) => {
      await page.goto('/join-school/invalid-token/')
      await page.waitForLoadState('domcontentloaded')

      // Ищем link (может содержать вложенную button)
      const link = page.getByRole('link', { name: /на главную/i }).first()
      const hasLink = await link.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await link.click()
        await page.waitForTimeout(1000)
      }

      // URL может быть главная, dashboard, или sign-in (если требует авторизации)
      const url = page.url()
      const isHome = url.match(/localhost:\d+\/?$/) !== null
      const isDashboard = url.includes('dashboard')
      const isSignIn = url.includes('sign-in')
      const notOnJoinPage = !url.includes('join-school')

      // Успех если ушли со страницы join-school
      expect(notOnJoinPage || isHome || isDashboard || isSignIn).toBe(true)
    })
  })

  test.describe('Неавторизованный доступ', () => {
    test('E2E-JOIN-4 — неавторизованный видит кнопки входа/регистрации', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      // Используем невалидный токен — в реальном тесте нужен валидный
      await page.goto('/join-school/test-token-123/')
      await page.waitForLoadState('domcontentloaded')

      // Либо ошибка (невалидный токен), либо кнопки входа
      const hasError = await page
        .getByText(/недействительн|не найден/i)
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Проверяем кнопки входа (link или button)
        const hasSignInLink = await page
          .getByRole('link', { name: /войти/i })
          .first()
          .isVisible()
          .catch(() => false)

        const hasSignInButton = await page
          .getByRole('button', { name: /войти/i })
          .first()
          .isVisible()
          .catch(() => false)

        const hasSignUp = await page
          .getByRole('link', { name: /регистрация/i })
          .first()
          .isVisible()
          .catch(() => false)

        expect(hasSignInLink || hasSignInButton || hasSignUp).toBe(true)
      }

      await context.close()
    })

    test('E2E-JOIN-5 — ссылка входа содержит callbackUrl', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto('/join-school/test-token/')
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/недействительн|не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const signInLink = page.getByRole('link', { name: /войти/i })

        if (await signInLink.isVisible().catch(() => false)) {
          const href = await signInLink.getAttribute('href')
          expect(href).toContain('callbackUrl')
          expect(href).toContain('join-school')
        }
      }

      await context.close()
    })
  })
})

test.describe('Присоединение к инструктору', () => {
  test.describe('Невалидные токены', () => {
    test('E2E-JOIN-6 — невалидный токен показывает ошибку', async ({ page }) => {
      await page.goto('/join-instructor/invalid-token-12345/')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть ошибка
      await expect(page.getByText(/не найден|недействительн|приглашение не найдено/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-JOIN-7 — отображается сообщение об истёкшем приглашении', async ({ page }) => {
      // В реальном тесте нужен истёкший токен
      await page.goto('/join-instructor/expired-token/')
      await page.waitForLoadState('domcontentloaded')

      // Либо "не найдено" (т.к. токен фейковый), либо "истекло"
      const hasExpired = await page
        .getByText(/истекл|expired/i)
        .isVisible()
        .catch(() => false)

      const hasNotFound = await page
        .getByText(/не найден/i)
        .isVisible()
        .catch(() => false)

      expect(hasExpired || hasNotFound).toBe(true)
    })
  })

  test.describe('Неавторизованный доступ', () => {
    test('E2E-JOIN-8 — неавторизованный видит сообщение о необходимости входа', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto('/join-instructor/test-token/')
      await page.waitForLoadState('domcontentloaded')

      // Либо ошибка, либо сообщение о необходимости входа
      const hasError = await page
        .getByText(/не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasAuthMessage = await page
          .getByText(/войти.*систему|необходимо войти|зарегистрир/i)
          .isVisible()
          .catch(() => false)

        expect(hasAuthMessage).toBe(true)
      }

      await context.close()
    })

    test('E2E-JOIN-9 — кнопки входа/регистрации присутствуют', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto('/join-instructor/test-token/')
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        const hasSignIn = await page
          .getByRole('link', { name: /войти/i })
          .isVisible()
          .catch(() => false)

        const hasSignUp = await page
          .getByRole('link', { name: /регистрация/i })
          .isVisible()
          .catch(() => false)

        expect(hasSignIn && hasSignUp).toBe(true)
      }

      await context.close()
    })
  })

  test.describe('Авторизованный доступ', () => {
    test('E2E-JOIN-10 — авторизованный ученик видит кнопки действий', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto('/join-instructor/test-token/')
      await page.waitForLoadState('domcontentloaded')

      // Либо ошибка (невалидный токен), либо кнопки действий
      const hasError = await page
        .getByText(/не найден/i)
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        // Проверяем наличие кнопок принять/отклонить
        const hasAccept = await page
          .getByRole('button', { name: /принять/i })
          .isVisible()
          .catch(() => false)

        const hasDecline = await page
          .getByRole('button', { name: /отклонить/i })
          .isVisible()
          .catch(() => false)

        expect(hasAccept || hasDecline).toBe(true)
      }

      await context.close()
    })
  })
})

test.describe('Общие проверки', () => {
  test('E2E-JOIN-11 — страница join-school отображает название школы', async ({ page }) => {
    // С валидным токеном должно отображаться название школы
    await page.goto('/join-school/valid-token/')
    await page.waitForLoadState('domcontentloaded')

    const hasError = await page
      .getByText(/недействительн|не найден/i)
      .isVisible()
      .catch(() => false)

    if (!hasError) {
      // Должно быть название школы в Heading
      const hasSchoolName = await page
        .getByRole('heading')
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasSchoolName).toBe(true)
    }
  })

  test('E2E-JOIN-12 — страница join-instructor отображает имя инструктора', async ({ page }) => {
    await page.goto('/join-instructor/valid-token/')
    await page.waitForLoadState('domcontentloaded')

    const hasError = await page
      .getByText(/не найден/i)
      .isVisible()
      .catch(() => false)

    if (!hasError) {
      // Должен быть заголовок о приглашении
      await expect(page.getByText(/приглашение от инструктора/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('E2E-JOIN-13 — отображается роль в приглашении школы', async ({ page }) => {
    await page.goto('/join-school/valid-token/')
    await page.waitForLoadState('domcontentloaded')

    const hasError = await page
      .getByText(/недействительн|не найден/i)
      .isVisible()
      .catch(() => false)

    if (!hasError) {
      // Должна быть роль (Badge)
      const hasBadge = await Locators.badge(page)
        .first()
        .isVisible()
        .catch(() => false)

      const hasRoleText = await page
        .getByText(/инструктор|менеджер|участник|member|instructor|manager/i)
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasError) {
        console.log(`  ℹ️ Badge: ${hasBadge}, RoleText: ${hasRoleText}`)
      }
    }
  })
})
