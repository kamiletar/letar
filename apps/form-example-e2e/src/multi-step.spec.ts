import { expect, test } from '@playwright/test'

test.describe('Multi-Step Form', () => {
  test('загружает страницу multi-step', async ({ page }) => {
    await page.goto('/examples/multi-step')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('отображает индикатор шагов', async ({ page }) => {
    await page.goto('/examples/multi-step')
    // Должен быть видим индикатор шагов (Steps)
    await expect(page.locator('[data-scope="steps"]').first()).toBeVisible()
  })

  test('навигация между шагами', async ({ page }) => {
    await page.goto('/examples/multi-step')
    // Кнопка Next/Далее должна быть видима
    const nextButton = page.getByRole('button', { name: /next|далее/i })
    await expect(nextButton).toBeVisible()
  })
})
