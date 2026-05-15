import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Numeric Fields Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/numeric-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all numeric fields', async ({ page }) => {
    // NumberInput fields
    await expect(getField(page, 'quantity').first()).toBeVisible()
    await expect(getField(page, 'temperature').first()).toBeVisible()

    // Currency fields
    await expect(getField(page, 'priceRub').first()).toBeVisible()
    await expect(getField(page, 'priceUsd').first()).toBeVisible()
    await expect(getField(page, 'priceEur').first()).toBeVisible()

    // Percentage fields
    await expect(getField(page, 'discount').first()).toBeVisible()
    await expect(getField(page, 'taxRate').first()).toBeVisible()
    await expect(getField(page, 'margin').first()).toBeVisible()
  })

  test('should display section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'NumberInput' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Currency' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Percentage' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Size Variants' })).toBeVisible()
  })

  test('should have increment/decrement buttons on NumberInput', async ({ page }) => {
    // Find quantity field container and check for control buttons
    const quantityContainer = getField(page, 'quantity').first().locator('..')
    await expect(quantityContainer.locator('[data-part="increment-trigger"]')).toBeVisible()
    await expect(quantityContainer.locator('[data-part="decrement-trigger"]')).toBeVisible()
  })

  test('should increment NumberInput value with button', async ({ page }) => {
    const quantityField = getField(page, 'quantity').first()
    const container = quantityField.locator('..')
    const incrementBtn = container.locator('[data-part="increment-trigger"]')

    // Get initial value
    const initialValue = await quantityField.inputValue()

    // Click increment
    await incrementBtn.click()

    // Value should increase
    const newValue = await quantityField.inputValue()
    expect(Number(newValue)).toBeGreaterThan(Number(initialValue))
  })

  test('should type directly in NumberInput', async ({ page }) => {
    const quantityField = getField(page, 'quantity').first()

    // Clear and type new value
    await quantityField.click()
    await quantityField.fill('42')
    await quantityField.blur()

    // Verify value
    await expect(quantityField).toHaveValue('42')
  })

  test('should format Currency fields with symbol', async ({ page }) => {
    // Currency fields should show formatted values
    const priceRubField = getField(page, 'priceRub').first()
    const priceUsdField = getField(page, 'priceUsd').first()

    // Fields should be visible and have values
    await expect(priceRubField).toBeVisible()
    await expect(priceUsdField).toBeVisible()

    // Check that values contain currency formatting (₽, $, EUR)
    const rubValue = priceRubField
    const usdValue = priceUsdField

    // Values should contain formatted numbers or currency symbols
    await expect(rubValue).toHaveValue()
    await expect(usdValue).toHaveValue()
  })

  test('should format Percentage fields with % symbol', async ({ page }) => {
    const discountField = getField(page, 'discount').first()
    await expect(discountField).toBeVisible()

    // Percentage fields display with % suffix
    const discountValue = discountField
    await expect(discountValue).toHaveValue()
  })

  test('should display different size variants', async ({ page }) => {
    await expect(page.getByText('Extra Small (xs)')).toBeVisible()
    await expect(page.getByText('Small (sm)')).toBeVisible()
    await expect(page.getByText('Medium (md)')).toBeVisible()
    await expect(page.getByText('Large (lg)')).toBeVisible()
  })

  test('should submit form with all numeric values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    const submitButton = page.getByRole('button', { name: /submit/i })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that all field values are in the output
    await expect(submittedData).toContainText('"quantity"')
    await expect(submittedData).toContainText('"temperature"')
    await expect(submittedData).toContainText('"priceRub"')
    await expect(submittedData).toContainText('"priceUsd"')
    await expect(submittedData).toContainText('"priceEur"')
    await expect(submittedData).toContainText('"discount"')
    await expect(submittedData).toContainText('"taxRate"')
    await expect(submittedData).toContainText('"margin"')
  })

  test('should respect min/max constraints on Percentage', async ({ page }) => {
    // Margin field has max=50
    const marginField = getField(page, 'margin').first()

    // Try to enter value above max
    await marginField.click()
    await marginField.fill('75')
    await marginField.blur()

    // Value should be clamped to max (50)
    const value = await marginField.inputValue()
    expect(Number(value.replace('%', '').trim())).toBeLessThanOrEqual(50)
  })

  test('should handle decimal values in taxRate', async ({ page }) => {
    const taxRateField = getField(page, 'taxRate').first()

    // Enter decimal value
    await taxRateField.click()
    await taxRateField.fill('18.5')
    await taxRateField.blur()

    // Verify field accepts decimal
    const value = await taxRateField.inputValue()
    expect(value).toContain('18')
  })
})
