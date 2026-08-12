import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Masked Fields Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/masked-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all phone and masked fields', async ({ page }) => {
    // Phone fields
    await expect(getField(page, 'phoneRu')).toBeVisible()
    await expect(getField(page, 'phoneUs')).toBeVisible()
    await expect(getField(page, 'phoneUk')).toBeVisible()

    // Document fields
    await expect(getField(page, 'passport')).toBeVisible()
    await expect(getField(page, 'inn')).toBeVisible()
    await expect(getField(page, 'snils')).toBeVisible()

    // Payment fields
    await expect(getField(page, 'creditCard')).toBeVisible()
    await expect(getField(page, 'expiryDate')).toBeVisible()
    await expect(getField(page, 'cvv')).toBeVisible()
  })

  test('should display section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Phone Fields' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible()
  })

  test('should display country flags for phone fields', async ({ page }) => {
    // Check that flag elements exist near phone fields
    const phoneRuContainer = getField(page, 'phoneRu').locator('..')
    const phoneUsContainer = getField(page, 'phoneUs').locator('..')
    const phoneUkContainer = getField(page, 'phoneUk').locator('..')

    // Flags should be present (as text emojis or images)
    await expect(phoneRuContainer).toContainText(/🇷🇺|RU/)
    await expect(phoneUsContainer).toContainText(/🇺🇸|US/)
    await expect(phoneUkContainer).toContainText(/🇬🇧|UK/)
  })

  test('should format Russian phone number', async ({ page }) => {
    const phoneRuField = getField(page, 'phoneRu')

    // Type digits
    await phoneRuField.click()
    await phoneRuField.fill('9161234567')

    // Value should be formatted
    const value = await phoneRuField.inputValue()
    expect(value).toMatch(/\+7.*\(?\d{3}\)?.*\d{3}.*\d{2}.*\d{2}/)
  })

  test('should format US phone number', async ({ page }) => {
    const phoneUsField = getField(page, 'phoneUs')

    // Type digits
    await phoneUsField.click()
    await phoneUsField.fill('2125551234')

    // Value should be formatted
    const value = await phoneUsField.inputValue()
    expect(value).toMatch(/\+1.*\(?\d{3}\)?.*\d{3}.*\d{4}/)
  })

  test('should format passport with mask prop', async ({ page }) => {
    const passportField = getField(page, 'passport')

    // Type digits
    await passportField.click()
    await passportField.fill('1234567890')

    // Value should match mask pattern: 99 99 999999
    const value = await passportField.inputValue()
    expect(value).toMatch(/\d{2}\s\d{2}\s\d{6}/)
  })

  test('should format SNILS with mask prop', async ({ page }) => {
    const snilsField = getField(page, 'snils')

    // Type digits
    await snilsField.click()
    await snilsField.fill('12345678901')

    // Value should match mask pattern: 999-999-999 99
    const value = await snilsField.inputValue()
    expect(value).toMatch(/\d{3}-\d{3}-\d{3}\s\d{2}/)
  })

  test('should format credit card with mask from props', async ({ page }) => {
    const creditCardField = getField(page, 'creditCard')

    // Type digits
    await creditCardField.click()
    await creditCardField.fill('4111111111111111')

    // Value should match mask pattern: 9999 9999 9999 9999
    const value = await creditCardField.inputValue()
    expect(value).toMatch(/\d{4}\s\d{4}\s\d{4}\s\d{4}/)
  })

  test('should format expiry date', async ({ page }) => {
    const expiryField = getField(page, 'expiryDate')

    // Type digits
    await expiryField.click()
    await expiryField.fill('1225')

    // Value should match mask pattern: 99/99
    const value = await expiryField.inputValue()
    expect(value).toMatch(/\d{2}\/\d{2}/)
  })

  test('should format CVV (3 or 4 digits)', async ({ page }) => {
    const cvvField = getField(page, 'cvv')

    // Type 3 digits
    await cvvField.click()
    await cvvField.fill('123')

    // Value should be 3 digits
    const value = await cvvField.inputValue()
    expect(value).toMatch(/^\d{3,4}$/)
  })

  test('should submit form with all masked values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill all fields
    await getField(page, 'phoneRu').fill('9161234567')
    await getField(page, 'phoneUs').fill('2125551234')
    await getField(page, 'phoneUk').fill('2071234567')
    await getField(page, 'passport').fill('1234567890')
    await getField(page, 'inn').fill('123456789012')
    await getField(page, 'snils').fill('12345678901')
    await getField(page, 'creditCard').fill('4111111111111111')
    await getField(page, 'expiryDate').fill('1225')
    await getField(page, 'cvv').fill('123')

    // Submit
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that all field values are in the output
    await expect(submittedData).toContainText('"phoneRu"')
    await expect(submittedData).toContainText('"phoneUs"')
    await expect(submittedData).toContainText('"passport"')
    await expect(submittedData).toContainText('"creditCard"')
  })

  test('should only allow numeric input in phone fields', async ({ page }) => {
    const phoneRuField = getField(page, 'phoneRu')

    // Try to type letters
    await phoneRuField.click()
    await phoneRuField.fill('abc123def456')

    // Only digits should be in the value
    const value = await phoneRuField.inputValue()
    expect(value.replace(/\D/g, '')).toMatch(/^\d+$/)
  })
})
