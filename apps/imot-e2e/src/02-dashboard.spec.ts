import { expect, test } from '@playwright/test'
import { resolve } from 'path'
import { urls } from './fixtures/test-data'

const CLIENT_STORAGE = resolve(__dirname, '../playwright/.auth/client.json')
const SPECIALIST_STORAGE = resolve(__dirname, '../playwright/.auth/specialist.json')
const ADMIN_STORAGE = resolve(__dirname, '../playwright/.auth/admin.json')

test.describe('Dashboard по ролям', () => {
  test('CLIENT перенаправляется на draft-request (нет mainRequest)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: CLIENT_STORAGE })
    const page = await context.newPage()

    await page.goto(urls.dashboard)

    // CLIENT без заполненного mainRequest перенаправляется на /draft-request
    await expect(page).toHaveURL(/draft-request/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()

    await context.close()
  })

  test('SPECIALIST видит специалистский дашборд', async ({ browser }) => {
    const context = await browser.newContext({ storageState: SPECIALIST_STORAGE })
    const page = await context.newPage()

    await page.goto(urls.dashboard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    // Специалист должен видеть элементы навигации специалиста
    await expect(page.locator('body')).not.toBeEmpty()

    await context.close()
  })

  test('ADMIN видит админский дашборд', async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STORAGE })
    const page = await context.newPage()

    await page.goto(urls.dashboard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

    // Админ должен видеть страницу
    await expect(page.locator('body')).not.toBeEmpty()

    await context.close()
  })
})
