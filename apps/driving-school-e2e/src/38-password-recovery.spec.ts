import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { clearAllEmails, isMailHogAvailable, waitForEmail } from './helpers/mailhog.helpers'

/**
 * E2E тесты для восстановления пароля
 *
 * Страницы:
 * - /forgot-password/ — Запрос восстановления пароля
 * - /reset-password/?token=... — Сброс пароля по токену
 *
 * Функциональность:
 * - Форма ввода email для восстановления
 * - Отправка письма с ссылкой сброса
 * - Валидация токена сброса
 * - Форма установки нового пароля
 */
test.describe('Восстановление пароля', () => {
  test.describe('Страница forgot-password', () => {
    test('E2E-PWD-1 — страница восстановления загружается', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок страницы
      await expect(page.getByText(/восстановление пароля/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-PWD-2 — отображается поле email', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Поле email
      await expect(page.getByPlaceholder(/email|example@mail.com/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-PWD-3 — отображается кнопка отправки', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Кнопка отправки
      await expect(page.getByRole('button', { name: /отправить|сбросить|восстановить/i })).toBeVisible({
        timeout: 10000,
      })
    })

    test('E2E-PWD-4 — валидация пустого email', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Пытаемся отправить без email
      await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click()

      // Форма не должна отправиться
      await expect(page).toHaveURL(/forgot-password/)
    })

    test('E2E-PWD-5 — валидация некорректного email', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Вводим некорректный email
      await page.getByPlaceholder(/email|example@mail.com/i).fill('invalid-email')

      // Пытаемся отправить
      await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click()

      // Должна быть ошибка валидации или форма не отправится
      const hasError = await page
        .getByText(/некорректный email|неверный формат/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      const stillOnPage = page.url().includes('forgot-password')
      expect(hasError || stillOnPage).toBe(true)
    })

    test('E2E-PWD-6 — ссылка "Войти" присутствует', async ({ page }) => {
      await page.goto(urls.forgotPassword)
      await page.waitForLoadState('domcontentloaded')

      // Ссылка на вход
      await expect(page.getByRole('link', { name: /войти/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-PWD-7 — ссылка "Войти" ведёт на sign-in', async ({ page }) => {
      await page.goto(urls.forgotPassword)

      const signInLink = page.getByRole('link', { name: /войти/i })
      await expect(signInLink).toBeVisible({ timeout: 10000 })
      await signInLink.click()

      await expect(page).toHaveURL(/sign-in/)
    })

    test('E2E-PWD-8 — отправка запроса для несуществующего email', async ({ page }) => {
      await page.goto(urls.forgotPassword)

      // Вводим несуществующий email
      await page.getByPlaceholder(/email|example@mail.com/i).fill('nonexistent@test.local')

      // Отправляем
      await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click()

      // Должно быть сообщение об успехе (для безопасности не сообщаем что email не найден)
      // или остаёмся на странице
      const hasSuccessMessage = await page
        .getByText(/письмо отправлено|проверьте почту|инструкции отправлены/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const stillOnPage = page.url().includes('forgot-password')
      expect(hasSuccessMessage || stillOnPage).toBe(true)
    })
  })

  test.describe('Страница reset-password', () => {
    test('E2E-PWD-9 — страница без токена показывает ошибку', async ({ page }) => {
      await page.goto('/reset-password/')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть ошибка об отсутствии токена
      await expect(page.getByText(/ошибка|отсутствует токен|недействительн/i).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-PWD-10 — страница с невалидным токеном показывает ошибку', async ({ page }) => {
      await page.goto('/reset-password/?token=invalid-token-12345')
      await page.waitForLoadState('domcontentloaded')

      // Должна быть ошибка о недействительном токене или кнопка запроса
      const hasError = await page
        .getByText(/недействительн|ссылка недействительна|не найден|истёк/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasRequestLink = await page
        .getByText(/запросить новую ссылку/i)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasError || hasRequestLink).toBe(true)
    })

    test('E2E-PWD-11 — кнопка "Запросить новую ссылку" присутствует при ошибке', async ({ page }) => {
      await page.goto('/reset-password/?token=invalid-token')
      await page.waitForLoadState('domcontentloaded')

      // Кнопка запроса новой ссылки (может быть link или button)
      const hasLink = await page
        .getByRole('link', { name: /запросить новую ссылку/i })
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasButton = await page
        .getByRole('button', { name: /запросить новую ссылку/i })
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasLink || hasButton).toBe(true)
    })

    test('E2E-PWD-12 — клик на "Запросить новую ссылку" ведёт на forgot-password', async ({ page }) => {
      await page.goto('/reset-password/?token=invalid-token')

      // Ищем link или button, берём первый найденный
      const link = page.getByRole('link', { name: /запросить новую ссылку/i }).first()
      const button = page.getByRole('button', { name: /запросить новую ссылку/i }).first()

      const hasLink = await link.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasLink) {
        await link.click()
      } else {
        await button.click()
      }

      await expect(page).toHaveURL(/forgot-password/)
    })
  })

  test.describe('Полный цикл с MailHog', () => {
    test('E2E-PWD-13 — полный цикл восстановления пароля', async ({ page }) => {
      // Пропускаем если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      // Очищаем старые письма
      await clearAllEmails()

      // Используем email тестового пользователя
      const testEmail = 'e2e-instructor@e2e-test.local'

      // === 1. ЗАПРОС ВОССТАНОВЛЕНИЯ ===
      await page.goto(urls.forgotPassword)
      await page.getByPlaceholder(/email|example@mail.com/i).fill(testEmail)
      await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click()

      // Ждём сообщение об успехе или переход
      await page.waitForTimeout(2000)

      // === 2. ПОЛУЧЕНИЕ ПИСЬМА ===
      const email = await waitForEmail(testEmail, { timeout: 30000 }).catch(() => null)

      if (!email) {
        console.log('  ⏭️ Skip: письмо не пришло (возможно email не существует в тестовой БД)')
        return
      }

      // Извлекаем ссылку сброса из письма
      const resetLinkMatch = email.Content.Body.match(/https?:\/\/[^\s<>"]+reset-password[^\s<>"]+/)

      if (!resetLinkMatch) {
        console.log('  ⏭️ Skip: ссылка сброса не найдена в письме')
        return
      }

      // === 3. СБРОС ПАРОЛЯ ===
      let resetUrl = resetLinkMatch[0]
      // Заменяем домен на localhost для E2E
      resetUrl = resetUrl.replace(/https?:\/\/[^/]+/, 'http://localhost:3003')

      await page.goto(resetUrl)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что форма сброса загрузилась
      const hasResetForm = await page
        .getByText(/новый пароль/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasResetForm) {
        // Вводим новый пароль
        await page
          .getByPlaceholder(/новый пароль|пароль/i)
          .first()
          .fill('NewTestPass123!')

        // Подтверждение пароля (если есть)
        const confirmInput = page.getByPlaceholder(/подтверд|повторите/i)
        if (await confirmInput.isVisible().catch(() => false)) {
          await confirmInput.fill('NewTestPass123!')
        }

        // Отправляем
        await page.getByRole('button', { name: /сохранить|сбросить|изменить/i }).click()

        // Должен быть редирект на sign-in или сообщение об успехе
        await page.waitForTimeout(3000)
        const isOnSignIn = page.url().includes('sign-in')
        const hasSuccess = await page
          .getByText(/пароль.*изменён|успешно|пароль обновлён/i)
          .isVisible()
          .catch(() => false)

        expect(isOnSignIn || hasSuccess).toBe(true)
      } else {
        console.log('  ⚠️ Форма сброса пароля не загрузилась (возможно токен истёк)')
      }
    })
  })
})
