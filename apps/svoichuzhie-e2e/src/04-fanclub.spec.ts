import { expect, test } from '@playwright/test'

test.describe('04 — Фан-клуб', () => {
  test('страница /fanclub загружается, есть CTA "Стать своим"', async ({ page }) => {
    await page.goto('/fanclub')
    // Форма «Стать своим» — submit кнопка
    await expect(page.locator('form:has(#join-email) button[type="submit"]')).toBeVisible()
  })

  test('форма регистрации в фан-клуб содержит чекбоксы согласий (152-ФЗ)', async ({ page }) => {
    await page.goto('/fanclub')

    // Чекбоксы согласий видны на странице сразу (форма не требует клика)
    const checkboxes = page.locator('form:has(#join-email) input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(1)
  })

  test('/fanclub/profile требует авторизации', async ({ page }) => {
    await page.goto('/fanclub/profile')
    // Должен редиректнуть на /login или показать форму входа
    await expect(page).toHaveURL(/\/login|\/sign-in/)
  })
})
