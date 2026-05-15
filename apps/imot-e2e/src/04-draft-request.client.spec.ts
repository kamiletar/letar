import { expect, test } from '@playwright/test'
import { urls } from './fixtures/test-data'

// Этот файл запускается с client storage state (суффикс .client.spec.ts)

test.describe('Заявка клиента (draft-request)', () => {
  test('страница draft-request загружается', async ({ page }) => {
    await page.goto(urls.draftRequest)
    // Страница может показывать форму заявки или информацию
    await expect(page).toHaveURL(/draft-request/, { timeout: 15_000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('клиент может открыть страницу диагностики', async ({ page }) => {
    await page.goto(urls.diagnostics)
    await expect(page).toHaveURL(/diagnostics/, { timeout: 15_000 })
  })

  test('клиент может открыть страницу прогресса', async ({ page }) => {
    await page.goto(urls.progress)
    await expect(page).toHaveURL(/progress/, { timeout: 15_000 })
  })
})
