import { expect, test } from '@playwright/test'
import { urls } from './fixtures/test-data'

// Этот файл запускается с specialist storage state (суффикс .specialist.spec.ts)

test.describe('Управление сессиями (специалист)', () => {
  test('список сессий загружается', async ({ page }) => {
    await page.goto(urls.sessions)
    await expect(page).toHaveURL(/sessions/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('можно перейти к созданию сессии', async ({ page }) => {
    await page.goto(urls.sessionsNew)
    await expect(page).toHaveURL(/sessions\/new/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('форма создания сессии загружается', async ({ page }) => {
    await page.goto(urls.sessionsNew)
    await expect(page).toHaveURL(/sessions\/new/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
