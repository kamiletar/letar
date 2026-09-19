import { expect, type Page, test } from '@playwright/test'
import { testFan } from './fixtures/test-data'
import { emailField, loginForm, passwordField } from './helpers/auth-forms'

// Better Auth отдаёт message сервера («Invalid email or password»), и assertAuthOk предпочитает
// его русскому fallback'у формы — на staging пользователь сейчас видит английский текст.
// Допускаем оба варианта: тест проверяет сам факт показа ошибки входа, а не локализацию.
const WRONG_CREDENTIALS_RE = /неверный email или пароль|invalid email or password/i

// Хелпер: заполняет и отправляет форму логина
async function fillLoginForm(page: Page, email: string, password: string) {
  const form = loginForm(page)
  const emailInput = emailField(form)
  const passwordInput = passwordField(form)

  await emailInput.click()
  await emailInput.fill(email)
  await passwordInput.click()
  await passwordInput.fill(password)
  // Локатор сужен до формы — шапка (UserMenu из @letar/ui) рендерит идентичную кнопку
  // «Войти», getByRole по всей странице матчит оба элемента (strict mode violation).
  await page.locator('form').getByRole('button', { name: /войти/i }).click()
}

test.describe('10 — Авторизация', () => {
  test('страница /login отображает форму входа', async ({ page }) => {
    await page.goto('/login')

    await expect(emailField(loginForm(page))).toBeVisible()
    await expect(passwordField(loginForm(page))).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: /войти/i })).toBeVisible()

    // Ссылка на регистрацию (фан-клуб) внутри формы
    await expect(page.getByRole('link', { name: /стать своим/i })).toBeVisible()
  })

  test('неверный пароль — отображается ошибка', async ({ page }) => {
    await page.goto('/login')

    await fillLoginForm(page, testFan.email, 'wrong-password-xyz')

    await expect(page.getByText(WRONG_CREDENTIALS_RE)).toBeVisible({ timeout: 15_000 })
    // Остаёмся на /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('несуществующий email — отображается ошибка', async ({ page }) => {
    await page.goto('/login')

    await fillLoginForm(page, 'no-such-user@e2e.test', 'AnyPass123!')

    await expect(page.getByText(WRONG_CREDENTIALS_RE)).toBeVisible({ timeout: 15_000 })
  })

  test('успешный вход — редирект на /fanclub/profile', async ({ page }) => {
    await page.goto('/login')

    await fillLoginForm(page, testFan.email, testFan.password)

    await expect(page).toHaveURL(/\/fanclub\/profile\/?$/, { timeout: 20_000 })
  })

  test('успешный вход с callbackUrl — редирект по параметру', async ({ page }) => {
    await page.goto('/login?callbackUrl=/events')

    await fillLoginForm(page, testFan.email, testFan.password)

    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 })
  })

  test('/fanclub/profile без сессии — редирект на /login', async ({ browser }) => {
    // Явно без cookies чтобы не наследовать session из проекта
    const ctx = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()

    await page.goto('/fanclub/profile', { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await ctx.close()
  })

  test('/admin без сессии — редирект на /login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()

    await page.goto('/admin', { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await ctx.close()
  })
})
