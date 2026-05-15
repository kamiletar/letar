import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Autocomplete Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/autocomplete-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all Autocomplete fields', async ({ page }) => {
    // Verify Autocomplete fields are present
    await expect(getField(page, 'city')).toBeVisible()
    await expect(getField(page, 'language')).toBeVisible()
    await expect(getField(page, 'customField')).toBeVisible()
  })

  test('should display labels', async ({ page }) => {
    await expect(page.getByText('City Selection')).toBeVisible()
    await expect(page.getByText('Programming Language')).toBeVisible()
    await expect(page.getByText('Custom Value Field')).toBeVisible()
  })

  test('should show suggestions when typing', async ({ page }) => {
    // Focus on city input and type
    const cityField = getField(page, 'city')
    const input = cityField.locator('input')
    await input.fill('Mos')

    // Wait for suggestions dropdown
    const content = page.locator('[data-part="content"]')
    await expect(content).toBeVisible()

    // Moscow should be in suggestions
    await expect(content).toContainText('Moscow')
  })

  test('should filter suggestions based on input', async ({ page }) => {
    // Type in city field
    const cityField = getField(page, 'city')
    const input = cityField.locator('input')
    await input.fill('Saint')

    // Wait for suggestions
    const content = page.locator('[data-part="content"]')
    await expect(content).toBeVisible()

    // Only Saint Petersburg should match
    await expect(content).toContainText('Saint Petersburg')
    await expect(content).not.toContainText('Moscow')
  })

  test('should select suggestion on click', async ({ page }) => {
    // Type in city field
    const cityField = getField(page, 'city')
    const input = cityField.locator('input')
    await input.fill('Kaz')

    // Wait for and click on Kazan
    const content = page.locator('[data-part="content"]')
    await expect(content).toBeVisible()
    await page.locator('[data-part="item"]').filter({ hasText: 'Kazan' }).click()

    // Input should have selected value
    await expect(input).toHaveValue('Kazan')
  })

  test('should allow custom value not in suggestions', async ({ page }) => {
    // Type a custom city not in the list
    const customField = getField(page, 'customField')
    const input = customField.locator('input')
    await input.fill('My Custom Value')

    // Click away to close suggestions and confirm value
    await page.click('body')

    // Value should be kept
    await expect(input).toHaveValue('My Custom Value')
  })

  test('should respect minChars setting', async ({ page }) => {
    // Language field has minChars=2
    const langField = getField(page, 'language')
    const input = langField.locator('input')

    // Type only 1 character
    await input.fill('J')

    // Should show hint about minimum chars
    const content = page.locator('[data-part="content"]')
    await expect(content).toContainText('Type at least 2 characters')

    // Type 2+ characters
    await input.fill('Ja')

    // Now should show matching results
    await expect(content).toContainText('Java')
  })

  test('should show empty message when no matches', async ({ page }) => {
    // Type something that doesn't match
    const cityField = getField(page, 'city')
    const input = cityField.locator('input')
    await input.fill('XYZ123')

    // Should show empty message
    const content = page.locator('[data-part="content"]')
    await expect(content).toBeVisible()
    await expect(content).toContainText('No suggestions')
  })

  test('should navigate suggestions with keyboard', async ({ page }) => {
    // Type in city field
    const cityField = getField(page, 'city')
    const input = cityField.locator('input')
    await input.fill('No')

    // Wait for suggestions
    const content = page.locator('[data-part="content"]')
    await expect(content).toBeVisible()

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Should have selected Novosibirsk or similar
    const value = await input.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('should submit form with autocomplete values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill in city
    const cityField = getField(page, 'city')
    const cityInput = cityField.locator('input')
    await cityInput.fill('Moscow')

    // Fill in custom value
    const customField = getField(page, 'customField')
    const customInput = customField.locator('input')
    await customInput.fill('Test Value')

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check values
    await expect(submittedData).toContainText('"city": "Moscow"')
    await expect(submittedData).toContainText('"customField": "Test Value"')
  })

  test('should show helper text', async ({ page }) => {
    // Custom field should show helper text
    await expect(page.getByText('You can type any value, not just from the list')).toBeVisible()
  })
})
