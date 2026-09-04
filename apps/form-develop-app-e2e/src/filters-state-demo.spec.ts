import { expect, test } from '@playwright/test'

test.describe('Filters State Demo — Active Filter Chips (getActiveUrlSyncFields)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/filters-state-demo')
    await page.locator('form').waitFor()
  })

  test('shows no chips when all filters are at default', async ({ page }) => {
    await expect(page.getByTestId('active-filter-chips')).toHaveCount(0)
  })

  test('shows a chip with reset button when a filter changes from default', async ({ page }) => {
    const searchField = page.locator('[data-field-name="search"]').first()
    await searchField.fill('React')
    await searchField.blur()

    await expect(page.getByRole('button', { name: 'Сбросить search' })).toBeVisible()
  })

  test('clicking the chip reset button clears the field back to default and removes the chip', async ({ page }) => {
    const searchField = page.locator('[data-field-name="search"]').first()
    await searchField.fill('React')
    await searchField.blur()

    const resetChip = page.getByRole('button', { name: 'Сбросить search' })
    await expect(resetChip).toBeVisible()
    await resetChip.click()

    await expect(resetChip).toHaveCount(0)
    await expect(searchField).toHaveValue('')
  })

  test('multiple active filters produce multiple chips', async ({ page }) => {
    const searchField = page.locator('[data-field-name="search"]').first()
    await searchField.fill('Node')
    await searchField.blur()

    const onlyFavoritesField = page.locator('[data-field-name="onlyFavorites"]').first()
    await onlyFavoritesField.click()

    await expect(page.getByRole('button', { name: 'Сбросить search' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сбросить onlyFavorites' })).toBeVisible()
  })
})
