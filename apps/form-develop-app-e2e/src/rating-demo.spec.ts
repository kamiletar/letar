import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Rating Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/rating-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all Rating fields', async ({ page }) => {
    // Verify main rating fields are present
    await expect(getField(page, 'productRating').first()).toBeVisible()
    await expect(getField(page, 'serviceQuality').first()).toBeVisible()
    await expect(getField(page, 'movieScore')).toBeVisible()
    await expect(getField(page, 'difficulty')).toBeVisible()
  })

  test('should display correct number of stars', async ({ page }) => {
    // Movie score should have 10 stars
    const movieRating = getField(page, 'movieScore')
    const movieStars = movieRating.locator('[data-part="item"]')
    await expect(movieStars).toHaveCount(10)

    // Product rating should have 5 stars (first instance)
    const productRating = getField(page, 'productRating').first()
    const productStars = productRating.locator('[data-part="item"]')
    await expect(productStars).toHaveCount(5)
  })

  test('should select rating by clicking', async ({ page }) => {
    const productRating = getField(page, 'productRating').first()
    const stars = productRating.locator('[data-part="item"]')

    // Click on the 4th star
    await stars.nth(3).click()

    // The 4th star should be highlighted (checked)
    await expect(stars.nth(3)).toHaveAttribute('data-state', 'checked')
  })

  test('should display rating labels', async ({ page }) => {
    // Check that labels are rendered
    await expect(page.getByText('Product Rating').first()).toBeVisible()
    await expect(page.getByText('Service Quality').first()).toBeVisible()
    await expect(page.getByText('Movie Score')).toBeVisible()
    await expect(page.getByText('Difficulty Level')).toBeVisible()
  })

  test('should display size variants', async ({ page }) => {
    // Check size variant labels
    await expect(page.getByText('Size variants:')).toBeVisible()
    await expect(page.getByText('Extra Small (xs)')).toBeVisible()
    await expect(page.getByText('Small (sm)')).toBeVisible()
    await expect(page.getByText('Medium (md)')).toBeVisible()
    await expect(page.getByText('Large (lg)')).toBeVisible()
  })

  test('should display color variants', async ({ page }) => {
    // Check color palette labels
    await expect(page.getByText('Color palettes:')).toBeVisible()
    await expect(page.getByText('Yellow')).toBeVisible()
    await expect(page.getByText('Orange')).toBeVisible()
    await expect(page.getByText('Red')).toBeVisible()
    await expect(page.getByText('Pink')).toBeVisible()
    await expect(page.getByText('Purple')).toBeVisible()
    await expect(page.getByText('Blue')).toBeVisible()
  })

  test('should submit form with rating values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Select a rating for the required field (productRating)
    const productRating = getField(page, 'productRating').first()
    const stars = productRating.locator('[data-part="item"]')
    await stars.nth(4).click() // Select 5 stars

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit ratings/i })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that rating values are in the output
    await expect(submittedData).toContainText('"productRating"')
    await expect(submittedData).toContainText('"serviceQuality"')
    await expect(submittedData).toContainText('"movieScore"')
    await expect(submittedData).toContainText('"difficulty"')
  })

  test('should show validation error for missing required rating', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with validation messages')

    // Try to submit without selecting productRating (which is required)
    // First, we need to interact with the form to trigger validation
    const submitButton = page.getByRole('button', { name: /submit ratings/i })
    await submitButton.click()

    // Should show validation error
    await expect(page.locator('text=/rating|required/i')).toBeVisible({ timeout: 10000 })
  })

  test('should change rating via keyboard', async ({ page }) => {
    const productRating = getField(page, 'productRating').first()
    const stars = productRating.locator('[data-part="item"]')

    // Focus on first star
    await stars.first().focus()

    // Navigate using arrow keys
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')

    // Third star should be selected
    await expect(stars.nth(2)).toHaveAttribute('data-state', 'checked')
  })
})
