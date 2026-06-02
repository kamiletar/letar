import { expect, test } from '@playwright/test'

// Placeholder-тест — просто проверяем что dev-сервер отвечает на /sign-up (auth-страница).
// Реальные E2E-тесты: email-verification.spec.ts
test('sign-up page loads', async ({ page }) => {
  await page.goto('/sign-up')
  await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible()
})
