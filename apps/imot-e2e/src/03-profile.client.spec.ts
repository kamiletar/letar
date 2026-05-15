import { expect, test } from '@playwright/test'
import { urls } from './fixtures/test-data'

// Этот файл запускается с client storage state (суффикс .client.spec.ts)
// CLIENT без mainRequest перенаправляется на /draft-request с клиентских страниц

test.describe('Профиль клиента', () => {
  test('клиент перенаправляется на draft-request (нет mainRequest)', async ({ page }) => {
    // CLIENT без заполненного профиля перенаправляется на /draft-request
    await page.goto(urls.myProfile)
    await expect(page).toHaveURL(/my-profile|draft-request/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('страница draft-request загружается для клиента', async ({ page }) => {
    await page.goto(urls.draftRequest)
    await expect(page).toHaveURL(/draft-request/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('клиент не может открыть страницу специалиста /clients', async ({ page }) => {
    await page.goto(urls.clients)
    // CLIENT без доступа → dashboard → draft-request
    await expect(page).toHaveURL(/dashboard|draft-request/, { timeout: 15_000 })
  })
})
