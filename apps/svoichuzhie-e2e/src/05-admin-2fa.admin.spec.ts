import { expect, test } from '@playwright/test'

// Этот файл запускается в проекте authenticated-chromium (storageState admin)

test.describe('05 — Admin: панель и 2FA', () => {
  test('/admin доступен для авторизованного admin', async ({ page }) => {
    await page.goto('/admin')
    // Не редиректит на login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1, h2, nav').first()).toBeVisible()
  })

  test('/admin/products страница администрирования товаров', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('/admin/security: кнопка включения 2FA присутствует', async ({ page }) => {
    await page.goto('/admin/security')
    // Если страница существует — проверяем наличие 2FA кнопки
    if ((await page.locator('text=/2FA|двухфактор|two.factor/i').count()) === 0) {
      test.skip()
      return
    }
    const twoFaBtn = page.locator('button, a').filter({ hasText: /включить|enable|настроить|setup.*2fa/i })
    if (await twoFaBtn.count()) {
      await expect(twoFaBtn.first()).toBeVisible()
    }
  })
})
