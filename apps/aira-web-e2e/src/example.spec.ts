import { expect, test } from '@playwright/test'

test('главная страница отображает hero-заголовок', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak freely')
})
