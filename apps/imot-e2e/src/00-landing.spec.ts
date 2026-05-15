import { expect, test } from '@playwright/test'
import { urls } from './fixtures/test-data'

test.describe('Публичные страницы', () => {
  test('главная страница загружается', async ({ page }) => {
    await page.goto(urls.home)
    // Проверяем что страница загрузилась — ищем заголовок или основной контент
    await expect(page).toHaveTitle(/ИМОТ|IMOT|Интегративная/)
  })

  test('страница входа отображает форму', async ({ page }) => {
    await page.goto(urls.signIn)
    // Форма входа содержит поля email и пароль
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('Ваш пароль')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  })

  test('страница регистрации отображает форму', async ({ page }) => {
    await page.goto(urls.signUp)
    // Форма регистрации содержит поля
    await expect(page.getByRole('button', { name: /зарегистрироваться|создать/i })).toBeVisible()
  })

  test('ссылка на регистрацию со страницы входа работает', async ({ page }) => {
    await page.goto(urls.signIn)
    // Ищем ссылку на регистрацию
    const signUpLink = page.getByRole('link', { name: /регистр|создать аккаунт/i }).first()
    await expect(signUpLink).toBeVisible()
    await signUpLink.click()
    await expect(page).toHaveURL(/sign-up/)
  })

  test('ссылка на вход со страницы регистрации работает', async ({ page }) => {
    await page.goto(urls.signUp)
    const signInLink = page.getByRole('link', { name: /войти|вход/i })
    await expect(signInLink).toBeVisible()
    await signInLink.click()
    await expect(page).toHaveURL(/sign-in/)
  })
})
