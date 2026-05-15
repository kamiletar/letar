/**
 * Тест: Восстановление пароля
 *
 * Сценарий: Запрос сброса пароля
 *   Дано я на странице /auth/signin
 *   Когда я нажимаю "Забыли пароль?"
 *   Тогда открывается страница /auth/forgot-password
 *
 * Сценарий: Отправка формы восстановления
 *   Дано я на странице /auth/forgot-password
 *   Когда я ввожу email user@test.local
 *   И нажимаю "Отправить инструкции"
 *   Тогда появляется сообщение об отправке письма
 *
 * Сценарий: Сброс пароля по ссылке (с недействительным токеном)
 *   Дано я на странице /auth/reset-password?token=invalid
 *   Тогда отображается ошибка о недействительном токене
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb } from '../helpers/db.helpers'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from '../pages/auth'

test.describe.serial('03-user: Восстановление пароля', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Страница "Забыли пароль?" ===

  test('должна открываться страница восстановления пароля', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Проверяем заголовок
    await expect(forgotPage.heading).toBeVisible()
    await expect(forgotPage.heading).toHaveText('Восстановление пароля')
  })

  test('должны отображаться все элементы страницы восстановления', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Проверяем описание
    await expect(forgotPage.description).toBeVisible()

    // Проверяем поле email
    await expect(forgotPage.emailInput).toBeVisible()
    await expect(forgotPage.emailHelperText).toBeVisible()

    // Проверяем кнопку
    await expect(forgotPage.submitButton).toBeVisible()
    await expect(forgotPage.submitButton).toHaveText('Отправить инструкции')

    // Проверяем ссылку назад
    await expect(forgotPage.backToSignInLink).toBeVisible()
  })

  test('ссылка "Забыли пароль?" на странице входа ведёт на восстановление', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Проверяем наличие ссылки
    await expect(loginPage.forgotPasswordLink).toBeVisible()
    await expect(loginPage.forgotPasswordLink).toHaveText('Забыли пароль?')

    // Переходим по ссылке
    await loginPage.forgotPasswordLink.click()

    // Должны оказаться на странице восстановления
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('должна показывать ошибку при пустом email', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Пытаемся отправить пустую форму
    await forgotPage.submitButton.click()

    // Даём время на валидацию

    await page.waitForTimeout(500)

    // Форма не должна успешно отправиться (остаёмся на странице)
    await expect(page).toHaveURL(/forgot-password/)

    // Сообщение об успехе не должно появиться
    await expect(forgotPage.successTitle).toBeHidden()
  })

  test('должна показывать ошибку при невалидном email', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Вводим невалидный email
    await forgotPage.emailInput.fill('invalid-email')
    await forgotPage.submitButton.click()

    // Даём время на валидацию

    await page.waitForTimeout(500)

    // Остаёмся на странице
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('должна успешно отправлять запрос на восстановление', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Вводим email тестового пользователя
    await forgotPage.emailInput.fill(TEST_USER.email)
    await forgotPage.submitButton.click()

    // Ждём появления сообщения об успехе
    await forgotPage.waitForSuccess()

    // Проверяем что отобразилось сообщение
    await expect(forgotPage.successTitle).toBeVisible()
    await expect(forgotPage.successDescription).toBeVisible()
  })

  test('должна успешно отправлять запрос для несуществующего email', async ({ page }) => {
    // По безопасности - форма не должна раскрывать существование email
    const forgotPage = new ForgotPasswordPage(page)
    await forgotPage.goto()

    // Вводим несуществующий email
    await forgotPage.emailInput.fill('nonexistent@example.com')
    await forgotPage.submitButton.click()

    // Должно появиться то же сообщение об успехе (безопасность)
    await forgotPage.waitForSuccess()

    await expect(forgotPage.successTitle).toBeVisible()
  })

  test('на странице есть ссылка для возврата на вход', async ({ page }) => {
    // Используем прямой переход, чтобы избежать влияния предыдущего теста
    await page.goto(localePath('/auth/forgot-password'))

    // Ищем ссылку "Войти" по тексту (href может иметь trailing slash)
    const signInLink = page.locator('a', { hasText: 'Войти' }).filter({ hasText: 'Войти' })
    await expect(signInLink).toBeVisible()
    // Проверяем что href содержит /auth/signin (с или без trailing slash)
    await expect(signInLink).toHaveAttribute('href', /\/auth\/signin\/?$/)
  })

  // === Страница сброса пароля ===

  test('должна показывать ошибку при отсутствии токена', async ({ page }) => {
    // Переходим без токена
    await page.goto(localePath('/auth/reset-password'))

    // Должна отображаться ошибка об отсутствии токена
    const errorTitle = page.getByText('Отсутствует токен восстановления')
    await expect(errorTitle).toBeVisible({ timeout: 10000 })
  })

  test('должна отображать форму сброса пароля при наличии токена', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)

    // Переходим с любым токеном (валидация на сервере при отправке)
    await resetPage.goto('some-token-12345')

    // Должна отображаться форма
    await expect(resetPage.heading).toBeVisible()
    await expect(resetPage.passwordInput).toBeVisible()
    await expect(resetPage.confirmPasswordInput).toBeVisible()
    await expect(resetPage.submitButton).toBeVisible()
  })

  test('форма сброса пароля должна быть заполняемой', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)

    // Переходим с любым токеном
    await resetPage.goto('test-token-12345')

    // Проверяем что поля можно заполнить
    await resetPage.passwordInput.fill('NewPassword123!')
    await resetPage.confirmPasswordInput.fill('NewPassword123!')

    // Проверяем что значения введены
    await expect(resetPage.passwordInput).toHaveValue('NewPassword123!')
    await expect(resetPage.confirmPasswordInput).toHaveValue('NewPassword123!')

    // Кнопка должна быть активна
    await expect(resetPage.submitButton).toBeEnabled()
  })
})
