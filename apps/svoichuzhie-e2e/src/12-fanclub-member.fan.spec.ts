import { expect, test } from '@playwright/test'

// Тесты выполняются под авторизованным testFan (уже участник фан-клуба)
// Проект: fan-chromium (storageState: playwright/.auth/fan.json)

test.describe('12 — Фан-клуб (авторизован, участник)', () => {
  test('авторизованный участник на /fanclub — редирект на /fanclub/profile', async ({ page }) => {
    await page.goto('/fanclub', { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\/fanclub\/profile\/?$/, { timeout: 15_000 })
  })

  test('/fanclub/profile — профиль участника отображается', async ({ page }) => {
    await page.goto('/fanclub/profile')

    // Страница должна загрузиться без редиректа на /login
    await expect(page).toHaveURL(/\/fanclub\/profile/)
    // Должен быть какой-то контент профиля (заголовок, email участника и т.п.)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('/fanclub/profile — есть ссылки на разделы фан-клуба', async ({ page }) => {
    await page.goto('/fanclub/profile')

    // Профиль должен содержать навигацию или кнопки
    const nav = page.locator('a[href*="/fanclub"]')
    await expect(nav.first()).toBeVisible()
  })
})
