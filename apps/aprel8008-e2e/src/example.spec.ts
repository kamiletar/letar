import { expect, test } from '@playwright/test'

test('главная страница отображает заголовок усадьбы', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('7 Сестёр')
})
