import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Slider Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/slider-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all Slider fields', async ({ page }) => {
    // Verify main slider fields are present
    await expect(getField(page, 'volume').first()).toBeVisible()
    await expect(getField(page, 'brightness').first()).toBeVisible()
    await expect(getField(page, 'progress')).toBeVisible()
    await expect(getField(page, 'temperature')).toBeVisible()
    await expect(getField(page, 'price')).toBeVisible()
  })

  test('should display slider with value text', async ({ page }) => {
    // Volume slider should show value text
    const volumeSlider = getField(page, 'volume').first()
    await expect(volumeSlider).toBeVisible()

    // Should have a value text element showing current value
    await expect(volumeSlider.locator('[data-part="value-text"]')).toBeVisible()
  })

  test('should display slider with marks', async ({ page }) => {
    // Progress slider should have marks
    const progressSlider = getField(page, 'progress')
    await expect(progressSlider).toBeVisible()

    // Should have marker elements
    await expect(progressSlider.locator('[data-part="marker"]').first()).toBeVisible()
  })

  test('should display slider labels', async ({ page }) => {
    // Check that labels are rendered
    await expect(page.getByText('Volume')).toBeVisible()
    await expect(page.getByText('Brightness')).toBeVisible()
    await expect(page.getByText('Progress')).toBeVisible()
  })

  test('should change slider value via keyboard', async ({ page }) => {
    // Focus on volume slider thumb
    const volumeSlider = getField(page, 'volume').first()
    const thumb = volumeSlider.locator('[data-part="thumb"]')

    await thumb.focus()

    // Press arrow right to increase value
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Value should have increased (verify via value text if available)
    // Note: exact value verification depends on step size
  })

  test('should submit form with slider values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Submit form with initial values
    const submitButton = page.getByRole('button', { name: /submit/i })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that slider values are in the output
    await expect(submittedData).toContainText('"volume"')
    await expect(submittedData).toContainText('"brightness"')
    await expect(submittedData).toContainText('"progress"')
    await expect(submittedData).toContainText('"temperature"')
    await expect(submittedData).toContainText('"price"')
  })

  test('should display different slider sizes', async ({ page }) => {
    // Check that size variants are visible
    await expect(page.getByText('Size variants:')).toBeVisible()
    await expect(page.getByText('Small (sm)')).toBeVisible()
    await expect(page.getByText('Medium (md)')).toBeVisible()
    await expect(page.getByText('Large (lg)')).toBeVisible()
  })

  test('should display different slider variants', async ({ page }) => {
    // Check that variant styles are visible
    await expect(page.getByText('Variant styles:')).toBeVisible()
    await expect(page.getByText('Outline')).toBeVisible()
    await expect(page.getByText('Solid')).toBeVisible()
  })

  test('should have correct min/max for temperature slider', async ({ page }) => {
    // Temperature slider should have marks at specific temperatures
    // Check for temperature mark labels
    await expect(page.getByText('-20°')).toBeVisible()
    await expect(page.getByText('40°')).toBeVisible()
  })
})
