import { expect, test } from '@playwright/test'
import { testFan } from './fixtures/test-data'
import { emailField, joinForm, passwordField } from './helpers/auth-forms'

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

    await expect(emailField(joinForm(page))).toBeVisible()
    await expect(passwordField(joinForm(page))).toBeVisible()

    // Минимум 1 обязательный чекбокс (ПДн 152-ФЗ)
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(1)
  })

  test('регистрация нового пользователя → экран "Проверь почту"', async ({ page }) => {
    await page.goto('/fanclub')

    const email = freshEmail()

    const emailInput = emailField(joinForm(page))
    const passwordInput = passwordField(joinForm(page))

    await emailInput.click()
    await emailInput.fill(email)
    await passwordInput.click()
    await passwordInput.fill('TestPass123!')

    // Обязательный чекбокс согласия на ПДн — .check()/.click() ненадёжно переключают этот
    // конкретный чекбокс (тот же класс проблемы, что задокументирован для aboi, см. PLAN.md
    // §18.7): focus() + Space работает стабильно.
    // Локатор ОБЯЗАТЕЛЬНО скопирован формой: неограниченный `input[type="checkbox"]` на всей
    // странице попадает на чекбокс cookie-баннера («Необходимые» — disabled, всегда checked),
    // который рендерится раньше формы в DOM — .first() выбирал его, а не согласие формы.
    const consentCheckbox = joinForm(page).locator('input[type="checkbox"]').first()
    await consentCheckbox.focus()
    await page.keyboard.press('Space')
    await expect(consentCheckbox).toBeChecked()

    await joinForm(page).locator('button[type="submit"]').click()

    // После signUp (requireEmailVerification: true) показываем экран верификации
    await expect(page.getByText(/проверь почту/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(new RegExp(email))).toBeVisible()
  })

  test('регистрация с уже существующим email → anti-enumeration: экран "Проверь почту"', async ({ page }) => {
    // Better Auth с requireEmailVerification не раскрывает факт существования email (anti-enumeration).
    // При дублирующем email ответ 200 OK → форма показывает "Проверь почту" как обычно.
    await page.goto('/fanclub')

    const emailInput = emailField(joinForm(page))
    const passwordInput = passwordField(joinForm(page))

    await emailInput.click()
    await emailInput.fill(testFan.email)
    await passwordInput.click()
    await passwordInput.fill('AnyPass123!')

    const consentCheckbox = joinForm(page).locator('input[type="checkbox"]').first()
    await consentCheckbox.focus()
    await page.keyboard.press('Space')
    await expect(consentCheckbox).toBeChecked()

    await joinForm(page).locator('button[type="submit"]').click()

    // Anti-enumeration: показываем "Проверь почту" независимо от того, существует email или нет
    await expect(page.getByText(/проверь почту/i)).toBeVisible({ timeout: 15_000 })
  })

  test('кнопка "Войти" в форме ведёт на /login с callbackUrl', async ({ page }) => {
    await page.goto('/fanclub')

    const loginLink = page.locator('a[href*="/login?callbackUrl=/fanclub"]')
    await expect(loginLink).toBeVisible()
  })

  test('отправка без согласия на ПДн блокируется валидацией', async ({ page }) => {
    await page.goto('/fanclub')

    const emailInput = emailField(joinForm(page))
    const passwordInput = passwordField(joinForm(page))
    const submitBtn = joinForm(page).locator('button[type="submit"]')

    await emailInput.click()
    await emailInput.fill(freshEmail())
    await passwordInput.click()
    await passwordInput.fill('TestPass123!')

    // После переноса на @letar/forms кнопка не disabled — форма проверяет схему при отправке
    // и показывает ошибку согласия (консент обязателен по 152-ФЗ), экран «Проверь почту» не наступает.
    await submitBtn.click()

    await expect(joinForm(page).getByText(/необходимо согласие на обработку персональных данных/i).first())
      .toBeVisible()
    await expect(page.getByText(/проверь почту/i)).toBeHidden()
  })
})
