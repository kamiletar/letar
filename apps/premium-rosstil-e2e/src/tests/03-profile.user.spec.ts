/**
 * Тест: Профиль пользователя
 *
 * Сценарий: Просмотр профиля
 *   Дано я залогинен как user@test.local
 *   Когда я перехожу на /profile
 *   Тогда отображается мой профиль
 *
 * Сценарий: Редактирование профиля
 *   Дано я залогинен как user@test.local
 *   И я на странице /profile/edit
 *   Когда я заполняю форму профиля
 *   И нажимаю "Сохранить изменения"
 *   Тогда профиль обновляется
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { ProfileEditPage, ProfilePage } from '../pages/profile'

test.describe.serial('03-user: Профиль пользователя', () => {
  test.beforeAll(async () => {
    // Обеспечиваем существование активированного тестового пользователя
    await ensureTestUser(TEST_USER)
    // Сбрасываем rate limits
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Страница просмотра профиля ===
  // Тест на неавторизованного пользователя находится в 02-protected-redirects.guest.spec.ts

  test('авторизованный пользователь видит свой профиль', async ({ page }) => {
    // Логинимся

    // Переходим на страницу профиля
    const profilePage = new ProfilePage(page)
    await profilePage.goto()

    // Проверяем основные элементы
    await expect(profilePage.profileCard).toBeVisible()
    await expect(profilePage.profileName).toBeVisible()
  })

  test('в профиле отображается имя пользователя', async ({ page }) => {
    const profilePage = new ProfilePage(page)
    await profilePage.goto()

    // Проверяем что отображается имя
    const nameText = await profilePage.getUserName()
    expect(nameText).toBeTruthy()
  })

  test('в профиле отображается email пользователя', async ({ page }) => {
    const profilePage = new ProfilePage(page)
    await profilePage.goto()

    // Email должен быть виден на странице
    const emailText = page.getByText(TEST_USER.email)
    await expect(emailText).toBeVisible()
  })

  // === Страница редактирования профиля ===
  // Тест на неавторизованного пользователя находится в 02-protected-redirects.guest.spec.ts

  test('авторизованный пользователь видит форму редактирования', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Проверяем наличие полей формы
    await expect(editPage.nameInput).toBeVisible()
    await expect(editPage.emailInput).toBeVisible()
    await expect(editPage.phoneInput).toBeVisible()
    await expect(editPage.genderSelect).toBeVisible()
    await expect(editPage.birthdateInput).toBeVisible()
    await expect(editPage.submitButton).toBeVisible()
  })

  test('форма предзаполнена текущими данными пользователя', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Имя и email должны быть заполнены
    await expect(editPage.nameInput).toHaveValue(TEST_USER.name)
    await expect(editPage.emailInput).toHaveValue(TEST_USER.email)
  })

  test('можно изменить телефон пользователя', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Заполняем телефон (в WebKit нужен click перед fill)
    const testPhone = '+79991234567'
    await editPage.phoneInput.click()
    await editPage.phoneInput.fill(testPhone)

    // Проверяем что значение введено (телефон может форматироваться)
    // Используем not.toHaveValue('') вместо inputValue().toBeTruthy()
    await expect(editPage.phoneInput).not.toHaveValue('')
  })

  test('можно выбрать пол пользователя', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Комбобокс пола - кликаем и выбираем опцию
    await editPage.genderSelect.click()
    await page.getByRole('option', { name: /женский/i }).click()

    // Проверяем что значение выбрано (текст в комбобоксе должен измениться)
    await expect(editPage.genderSelect).toContainText(/женский/i)
  })

  test('можно указать дату рождения', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Указываем дату рождения
    const testDate = '1990-05-15'
    await editPage.birthdateInput.fill(testDate)

    // Проверяем что значение введено
    await expect(editPage.birthdateInput).toHaveValue(testDate)
  })

  test('кнопка сохранения активна', async ({ page }) => {
    const editPage = new ProfileEditPage(page)
    await editPage.goto()

    // Кнопка должна быть активна
    await expect(editPage.submitButton).toBeEnabled()
  })

  test('форма отправляется при нажатии на кнопку сохранения', async ({ page }) => {
    // Переходим на свежую страницу (избегаем влияния предыдущих тестов)
    await page.goto(localePath('/profile/edit'))

    const editPage = new ProfileEditPage(page)

    // Проверяем что кнопка видна и активна
    await expect(editPage.submitButton).toBeVisible()
    await expect(editPage.submitButton).toBeEnabled()

    // Нажимаем кнопку - форма должна отправиться
    await editPage.submit()

    // После успешной отправки ожидаем редирект на /profile
    await expect(page).toHaveURL(/\/ru\/profile/, { timeout: 15000 })
  })
})
