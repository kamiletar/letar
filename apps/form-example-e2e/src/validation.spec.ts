import { expect, test } from '@playwright/test'

test.describe('Validation Form', () => {
  test('загружает страницу validation', async ({ page }) => {
    await page.goto('/examples/validation')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('показывает ошибки при пустой отправке', async ({ page }) => {
    await page.goto('/examples/validation')
    // Нажимаем submit без заполнения
    await page.getByRole('button', { name: /save|submit|сохранить|отправить/i }).click()
    // Должны появиться сообщения об ошибках
    await expect(page.locator('[data-scope="field"]').filter({ has: page.locator('[data-part="error-text"]') }).first())
      .toBeVisible()
  })
})
