import { expect, test } from '@playwright/test'
import { urls } from './fixtures/test-data'

// Этот файл запускается с specialist storage state (суффикс .specialist.spec.ts)

test.describe('Управление клиентами (специалист)', () => {
  test('список клиентов загружается', async ({ page }) => {
    await page.goto(urls.clients)
    await expect(page).toHaveURL(/clients/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('можно перейти к форме создания клиента', async ({ page }) => {
    await page.goto(urls.clientsNew)
    await expect(page).toHaveURL(/clients\/new/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('форма создания клиента загружается', async ({ page }) => {
    await page.goto(urls.clientsNew)
    await expect(page).toHaveURL(/clients\/new/, { timeout: 15_000 })

    // Форма должна содержать поля
    await expect(page.locator('form').or(page.locator('[role="form"]'))).toBeVisible({ timeout: 10_000 })
  })

  test('список сессий загружается', async ({ page }) => {
    await page.goto(urls.sessions)
    await expect(page).toHaveURL(/sessions/, { timeout: 15_000 })
  })

  test('список планов загружается', async ({ page }) => {
    await page.goto(urls.plans)
    await expect(page).toHaveURL(/plans/, { timeout: 15_000 })
  })
})
