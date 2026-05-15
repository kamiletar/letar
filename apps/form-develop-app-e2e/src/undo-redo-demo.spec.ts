import { expect, test } from '@playwright/test'

test.describe('Undo/Redo Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/undo-redo-demo')
    await page.locator('h1, h2').first().waitFor()
  })

  test('страница загружается', async ({ page }) => {
    await expect(page.getByText('useFormHistory')).toBeVisible()
  })

  test('показывает API документацию', async ({ page }) => {
    await expect(page.getByText('HistoryControls')).toBeVisible()
    await expect(page.getByText('Ctrl+Z')).toBeVisible()
  })

  test('показывает keyboard shortcuts', async ({ page }) => {
    await expect(page.getByText('Ctrl+Z')).toBeVisible()
    await expect(page.getByText('Ctrl+Y')).toBeVisible()
  })

  test('показывает когда использовать', async ({ page }) => {
    await expect(page.getByText('CMS')).toBeVisible()
    await expect(page.getByText('RichText')).toBeVisible()
  })
})
