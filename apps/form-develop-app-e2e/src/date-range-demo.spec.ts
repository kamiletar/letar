import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('DateRange Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/date-range-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all DateRange fields', async ({ page }) => {
    // Verify DateRange fields are present
    await expect(getField(page, 'period.start')).toBeVisible()
    await expect(getField(page, 'period.end')).toBeVisible()
    await expect(getField(page, 'reportPeriod.start')).toBeVisible()
    await expect(getField(page, 'reportPeriod.end')).toBeVisible()
    await expect(getField(page, 'vacationDates.start')).toBeVisible()
    await expect(getField(page, 'vacationDates.end')).toBeVisible()
  })

  test('should display labels for date fields', async ({ page }) => {
    await expect(page.getByText('Basic DateRange')).toBeVisible()
    await expect(page.getByText('DateRange with Presets')).toBeVisible()
    await expect(page.getByText('Vertical Orientation')).toBeVisible()
    await expect(page.getByText('From')).toBeVisible()
    await expect(page.getByText('To')).toBeVisible()
  })

  test('should show presets menu button', async ({ page }) => {
    // Find the presets button
    const presetsButton = page.getByRole('button', { name: /presets/i })
    await expect(presetsButton).toBeVisible()
  })

  test('should open presets menu and show options', async ({ page }) => {
    // Click on presets button
    const presetsButton = page.getByRole('button', { name: /presets/i }).first()
    await presetsButton.click()

    // Wait for menu to open and verify preset options
    await expect(page.getByRole('menuitem', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'This Week' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'This Month' })).toBeVisible()
  })

  test('should fill dates when selecting preset', async ({ page }) => {
    // Click on presets button
    const presetsButton = page.getByRole('button', { name: /presets/i }).first()
    await presetsButton.click()

    // Select "Today" preset
    await page.getByRole('menuitem', { name: 'Today' }).click()

    // Both start and end fields should now have today's date
    const startField = getField(page, 'reportPeriod.start')
    const endField = getField(page, 'reportPeriod.end')

    const today = new Date().toISOString().split('T')[0]
    await expect(startField).toHaveValue(today)
    await expect(endField).toHaveValue(today)
  })

  test('should allow manual date entry', async ({ page }) => {
    const startField = getField(page, 'period.start')
    const endField = getField(page, 'period.end')

    // Enter start date
    await startField.fill('2024-01-15')
    await expect(startField).toHaveValue('2024-01-15')

    // Enter end date
    await endField.fill('2024-01-31')
    await expect(endField).toHaveValue('2024-01-31')
  })

  test('should submit form with date range values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill in dates
    await getField(page, 'period.start').fill('2024-06-01')
    await getField(page, 'period.end').fill('2024-06-30')

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that date range values are in the output
    await expect(submittedData).toContainText('"start": "2024-06-01"')
    await expect(submittedData).toContainText('"end": "2024-06-30"')
  })

  test('should enforce end date >= start date constraint via min attribute', async ({ page }) => {
    // Fill start date first
    const startField = getField(page, 'period.start')
    await startField.fill('2024-03-15')

    // End date should have min attribute set to start date
    const endField = getField(page, 'period.end')
    await expect(endField).toHaveAttribute('min', '2024-03-15')
  })
})
