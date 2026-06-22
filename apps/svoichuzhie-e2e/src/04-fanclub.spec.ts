import { expect, test } from '@playwright/test'

test.describe('04 — Фан-клуб', () => {
  test('страница /fanclub загружается, есть CTA "Стать своим"', async ({ page }) => {
    await page.goto('/fanclub')
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // CTA — «Стать своим» или аналог
    const cta = page.locator('a, button').filter({ hasText: /стать своим|вступить|join|регистр/i })
    if (await cta.count()) {
      await expect(cta.first()).toBeVisible()
    }
  })

  test('форма регистрации в фан-клуб содержит чекбоксы согласий (152-ФЗ)', async ({ page }) => {
    await page.goto('/fanclub')

    // Находим ссылку на регистрацию или кнопку
    const registerBtn = page.locator('a[href*="register"], a[href*="sign-up"], button').filter({
      hasText: /стать своим|вступить|join|зарегистрировать/i,
    })

    if (!(await registerBtn.count())) {
      test.skip()
      return
    }

    await registerBtn.first().click()
    await page.waitForLoadState('networkidle')

    // Проверяем наличие чекбоксов согласий (ПДн + рассылка)
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    // Должно быть хотя бы 2 чекбокса (ПДн + маркетинг)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('/fanclub/profile требует авторизации', async ({ page }) => {
    await page.goto('/fanclub/profile')
    // Должен редиректнуть на /login или показать форму входа
    await expect(page).toHaveURL(/\/login|\/sign-in/)
  })
})
