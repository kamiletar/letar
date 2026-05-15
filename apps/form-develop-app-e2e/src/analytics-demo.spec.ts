import { expect, test } from '@playwright/test'

test.describe('Analytics Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics-demo')
    await page.locator('h1, h2').first().waitFor()
  })

  test('страница загружается', async ({ page }) => {
    await expect(page.getByText('Form.Analytics')).toBeVisible()
  })

  test('показывает использование useFormAnalytics', async ({ page }) => {
    await expect(page.getByText('useFormAnalytics')).toBeVisible()
  })

  test('показывает адаптеры', async ({ page }) => {
    await expect(page.getByText('Umami')).toBeVisible()
    await expect(page.getByText('Яндекс Метрика')).toBeVisible()
    await expect(page.getByText('Google Analytics 4')).toBeVisible()
    await expect(page.getByText('PostHog')).toBeVisible()
  })

  test('показывает трекаемые события', async ({ page }) => {
    await expect(page.getByText('field_focus')).toBeVisible()
    await expect(page.getByText('form_abandon')).toBeVisible()
    await expect(page.getByText('form_complete')).toBeVisible()
  })

  test('показывает статистику abandonment', async ({ page }) => {
    await expect(page.getByText('67%')).toBeVisible()
    await expect(page.getByText('10.5%')).toBeVisible()
  })
})
