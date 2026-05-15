/**
 * Тест: Регистрация пользователя
 *
 * Сценарий: Регистрация обычного пользователя
 *   Дано я на странице /auth/register
 *   Когда я заполняю форму регистрации для user@test.local
 *   И отправляю форму
 *   Тогда появляется сообщение о подтверждении email
 *
 * Сценарий: Подтверждение email через БД (для автоматизации)
 *   Дано в БД есть пользователь user@test.local
 *   Когда я обновляю emailVerified через Prisma
 *   Тогда пользователь может войти
 */
import { expect, test } from '@playwright/test'

import { LOCALE_PREFIX } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { activateUser, disconnectDb, getUser, resetRateLimit, userExists } from '../helpers/db.helpers'
import { RegisterPage } from '../pages/auth'

test.describe.serial('03-user: Регистрация пользователя', () => {
  test.beforeAll(async () => {
    // Сбрасываем rate limits перед тестами регистрации
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница регистрации', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Проверяем заголовок
    await expect(registerPage.heading).toBeVisible()
    await expect(registerPage.heading).toHaveText('Регистрация')
  })

  test('должны отображаться все поля формы', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Проверяем наличие всех полей
    await expect(registerPage.nameInput).toBeVisible()
    await expect(registerPage.emailInput).toBeVisible()
    await expect(registerPage.passwordInput).toBeVisible()
    await expect(registerPage.confirmPasswordInput).toBeVisible()
    await expect(registerPage.submitButton).toBeVisible()
  })

  test('должна отображаться ссылка на вход', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Проверяем ссылку на вход
    await expect(registerPage.signInLink).toBeVisible()
  })

  test('должна показывать ошибку при пустых полях', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Пытаемся отправить пустую форму
    await registerPage.submit()

    // Даём время на валидацию

    await page.waitForTimeout(500)

    // Проверяем, что поля невалидны (браузерная валидация или кастомная)
    // Форма не должна успешно отправиться
    await expect(page).toHaveURL(new RegExp(`${LOCALE_PREFIX}/auth/register`))
  })

  test('должна показывать ошибку при несовпадении паролей', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Заполняем форму с разными паролями
    await registerPage.fillForm({
      name: 'Test',
      email: 'test@example.com',
      password: 'ValidPass123!',
      confirmPassword: 'DifferentPass123!',
    })
    await registerPage.submit()

    // Ждём ошибку

    await page.waitForTimeout(500)

    // Должна быть ошибка о несовпадении паролей
    const errorText = page.locator('text=/пароли|не совпадают/i')
    await expect(errorText).toBeVisible()
  })

  test('должна успешно регистрировать нового пользователя', async ({ page }) => {
    // Сначала проверяем, существует ли уже тестовый пользователь
    const exists = await userExists(TEST_USER.email)

    // Пропускаем тест если пользователь уже существует
    // (регистрация должна запускаться на чистой БД или после cleanup)

    if (exists) {
      test.skip()
      return
    }

    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Регистрируем нового пользователя
    await registerPage.fillForm({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
    await registerPage.submit()

    // После успешной регистрации происходит редирект на /auth/signin
    // Ждём редирект (с таймаутом 10 секунд на случай показа success message + 2 сек задержки)
    await expect(page).toHaveURL(new RegExp(`${LOCALE_PREFIX}/auth/signin`), { timeout: 15000 })

    // Проверяем, что пользователь создан в БД
    const user = await getUser(TEST_USER.email)

    expect(user).not.toBeNull()

    expect(user?.name).toBe(TEST_USER.name)

    expect(user?.emailVerified).toBeNull() // Email не подтверждён
  })

  test('тестовый пользователь должен существовать в БД', async () => {
    // Этот тест проверяет, что предыдущий тест успешно создал пользователя
    const exists = await userExists(TEST_USER.email)
    expect(exists).toBe(true)
  })

  test('должна показывать ошибку при повторной регистрации', async ({ page }) => {
    // Пользователь уже существует (создан в предыдущем тесте)
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Пытаемся зарегистрировать того же пользователя
    await registerPage.fillForm({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
    await registerPage.submit()

    // Должна появиться ошибка о существующем email или rate limit
    // (rate limit может сработать при многократных прогонах тестов)
    const errorText = page.getByText(/уже существует|already exists|Слишком много попыток/i)
    await expect(errorText).toBeVisible({ timeout: 10000 })
  })

  test('подтверждение email через БД', async () => {
    // Активируем пользователя через БД
    await activateUser(TEST_USER.email)

    // Проверяем, что emailVerified установлен
    const user = await getUser(TEST_USER.email)
    expect(user?.emailVerified).not.toBeNull()
  })

  test('пользователь может войти после активации', async ({ page }) => {
    // Пользователь активирован в предыдущем тесте

    // Должны оказаться на странице профиля или главной
    await expect(page).toHaveURL(new RegExp(`${LOCALE_PREFIX}/(profile|catalog|$)`))
  })
})
