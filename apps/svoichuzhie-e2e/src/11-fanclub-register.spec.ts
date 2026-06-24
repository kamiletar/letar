import { expect, test } from '@playwright/test'
import { testFan } from './fixtures/test-data'

// Уникальный email для каждого прогона — не конфликтует с другими тестами
function freshEmail(): string {
  return `e2e-new-fan-${Date.now()}@svoichuzhie.test`
}

test.describe('11 — Регистрация в фан-клуб', () => {
  test('форма вступления видна сразу, до секции тиров участия', async ({ page }) => {
    await page.goto('/fanclub')

    const form = page.locator('form').first()
    const tiers = page.getByText(/тиры участия/i)

    await expect(form).toBeVisible()
    await expect(tiers).toBeVisible()

    // Форма должна быть выше секции тиров в DOM (находится первее)
    const formY = await form.evaluate((el) => el.getBoundingClientRect().top)
    const tiersY = await tiers.evaluate((el) => el.getBoundingClientRect().top)
    expect(formY).toBeLessThan(tiersY)
  })

  test('форма содержит поля email, пароль и чекбоксы согласий', async ({ page }) => {
    await page.goto('/fanclub')

    await expect(page.locator('#join-email')).toBeVisible()
    await expect(page.locator('#join-password')).toBeVisible()

    // Минимум 1 обязательный чекбокс (ПДн 152-ФЗ)
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(1)
  })

  test('регистрация нового пользователя → экран "Проверь почту"', async ({ page }) => {
    await page.goto('/fanclub')

    const email = freshEmail()

    const emailInput = page.locator('#join-email')
    const passwordInput = page.locator('#join-password')

    await emailInput.click()
    await emailInput.fill(email)
    await passwordInput.click()
    await passwordInput.fill('TestPass123!')

    // Обязательный чекбокс согласия на ПДн
    const consentCheckbox = page.locator('input[type="checkbox"]').first()
    await consentCheckbox.check()

    await page.locator('button[type="submit"]').click()

    // После signUp (requireEmailVerification: true) показываем экран верификации
    await expect(page.getByText(/проверь почту/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(new RegExp(email))).toBeVisible()
  })

  test('регистрация с уже существующим email → ошибка "уже зарегистрирован"', async ({ page }) => {
    await page.goto('/fanclub')

    const emailInput = page.locator('#join-email')
    const passwordInput = page.locator('#join-password')

    await emailInput.click()
    await emailInput.fill(testFan.email)
    await passwordInput.click()
    await passwordInput.fill('AnyPass123!')

    const consentCheckbox = page.locator('input[type="checkbox"]').first()
    await consentCheckbox.check()

    await page.locator('button[type="submit"]').click()

    await expect(page.getByText(/уже зарегистрирован/i)).toBeVisible({ timeout: 15_000 })
    // Ссылка на вход
    await expect(page.locator('a[href*="/login"]')).toBeVisible()
  })

  test('кнопка "Войти" в форме ведёт на /login с callbackUrl', async ({ page }) => {
    await page.goto('/fanclub')

    const loginLink = page.locator('a[href*="/login?callbackUrl=/fanclub"]')
    await expect(loginLink).toBeVisible()
  })

  test('кнопка отправки заблокирована без согласия на ПДн', async ({ page }) => {
    await page.goto('/fanclub')

    const emailInput = page.locator('#join-email')
    const passwordInput = page.locator('#join-password')
    const submitBtn = page.locator('button[type="submit"]')

    await emailInput.click()
    await emailInput.fill(freshEmail())
    await passwordInput.click()
    await passwordInput.fill('TestPass123!')

    // Без чекбокса — кнопка disabled
    await expect(submitBtn).toBeDisabled()
  })
})
