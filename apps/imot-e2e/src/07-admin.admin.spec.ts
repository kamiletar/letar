import { expect, test } from '@playwright/test'
import { resolve } from 'path'
import { urls } from './fixtures/test-data'

// Этот файл запускается с admin storage state (суффикс .admin.spec.ts)

const CLIENT_STORAGE = resolve(__dirname, '../playwright/.auth/client.json')

test.describe('Админ-панель', () => {
  test('админ может открыть страницу пользователей', async ({ page }) => {
    await page.goto(urls.users)
    await expect(page).toHaveURL(/users/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('админ может открыть страницу специалистов', async ({ page }) => {
    await page.goto(urls.specialists)
    await expect(page).toHaveURL(/specialists/, { timeout: 15_000 })
  })

  test('админ может открыть настройки', async ({ page }) => {
    await page.goto(urls.settings)
    await expect(page).toHaveURL(/settings/, { timeout: 15_000 })
  })

  test('клиент не может открыть /users — редирект на dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: CLIENT_STORAGE })
    const page = await context.newPage()

    await page.goto(urls.users)
    // CLIENT → dashboard → draft-request (нет mainRequest)
    await expect(page).toHaveURL(/dashboard|draft-request/, { timeout: 15_000 })

    await context.close()
  })
})
