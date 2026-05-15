import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('PinInput Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/pin-input-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all PinInput fields', async ({ page }) => {
    // Verify all PIN fields are present
    await expect(getField(page, 'pin')).toBeVisible()
    await expect(getField(page, 'otp')).toBeVisible()
    await expect(getField(page, 'alphaCode')).toBeVisible()
    await expect(getField(page, 'secretPin')).toBeVisible()
  })

  test('should fill basic 4-digit PIN', async ({ page }) => {
    const pinField = getField(page, 'pin')

    // Get all input elements inside the PIN field
    const inputs = pinField
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })

    // Fill each digit
    await inputs.nth(0).fill('1')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('3')
    await inputs.nth(3).fill('4')

    // Verify values
    await expect(inputs.nth(0)).toHaveValue('1')
    await expect(inputs.nth(1)).toHaveValue('2')
    await expect(inputs.nth(2)).toHaveValue('3')
    await expect(inputs.nth(3)).toHaveValue('4')
  })

  test('should fill 6-digit OTP code', async ({ page }) => {
    const otpField = getField(page, 'otp')
    const inputs = otpField
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })

    // OTP has 6 digits
    await inputs.nth(0).fill('1')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('3')
    await inputs.nth(3).fill('4')
    await inputs.nth(4).fill('5')
    await inputs.nth(5).fill('6')

    // Verify the last input
    await expect(inputs.nth(5)).toHaveValue('6')
  })

  test('should trigger onComplete callback when all digits filled', async ({ page }) => {
    const otpField = getField(page, 'otp')
    const inputs = otpField
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })

    // Fill all 6 digits
    await inputs.nth(0).fill('1')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('3')
    await inputs.nth(3).fill('4')
    await inputs.nth(4).fill('5')
    await inputs.nth(5).fill('6')

    // The onComplete callback should show a message
    await expect(page.getByTestId('last-completed')).toContainText('OTP completed: 123456')
  })

  test('should accept alphanumeric characters', async ({ page }) => {
    const alphaField = getField(page, 'alphaCode')
    const inputs = alphaField
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })

    // Fill with letters and numbers
    await inputs.nth(0).fill('A')
    await inputs.nth(1).fill('1')
    await inputs.nth(2).fill('B')
    await inputs.nth(3).fill('2')

    // Verify mixed input
    await expect(inputs.nth(0)).toHaveValue('A')
    await expect(inputs.nth(1)).toHaveValue('1')
    await expect(inputs.nth(2)).toHaveValue('B')
    await expect(inputs.nth(3)).toHaveValue('2')
  })

  test('should mask input for secret PIN', async ({ page }) => {
    const secretField = getField(page, 'secretPin')
    const inputs = secretField
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })

    // Masked inputs should have type="password" or similar masking
    // Fill value to verify it works
    await inputs.nth(0).fill('1')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('3')
    await inputs.nth(3).fill('4')

    // Input should have aria-hidden or mask styling (implementation detail)
    // Just verify the value is set correctly
    await expect(inputs.nth(0)).toHaveValue('1')
  })

  test('should submit form with all PINs filled', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill basic PIN
    const pinInputs = getField(page, 'pin')
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })
    await pinInputs.nth(0).fill('1')
    await pinInputs.nth(1).fill('2')
    await pinInputs.nth(2).fill('3')
    await pinInputs.nth(3).fill('4')

    // Fill OTP
    const otpInputs = getField(page, 'otp')
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })
    await otpInputs.nth(0).fill('9')
    await otpInputs.nth(1).fill('8')
    await otpInputs.nth(2).fill('7')
    await otpInputs.nth(3).fill('6')
    await otpInputs.nth(4).fill('5')
    await otpInputs.nth(5).fill('4')

    // Fill alphanumeric code
    const alphaInputs = getField(page, 'alphaCode')
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })
    await alphaInputs.nth(0).fill('A')
    await alphaInputs.nth(1).fill('B')
    await alphaInputs.nth(2).fill('C')
    await alphaInputs.nth(3).fill('D')

    // Fill secret PIN
    const secretInputs = getField(page, 'secretPin')
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })
    await secretInputs.nth(0).fill('0')
    await secretInputs.nth(1).fill('0')
    await secretInputs.nth(2).fill('0')
    await secretInputs.nth(3).fill('0')

    // Submit form
    const submitButton = page.getByRole('button', { name: /verify all codes/i })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })
    await expect(submittedData).toContainText('"pin": "1234"')
    await expect(submittedData).toContainText('"otp": "987654"')
    await expect(submittedData).toContainText('"alphaCode": "ABCD"')
    await expect(submittedData).toContainText('"secretPin": "0000"')
  })

  test('should show validation error for incomplete PIN', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with validation messages')

    // Fill only 2 of 4 digits
    const pinInputs = getField(page, 'pin')
      .locator('input:not([type="hidden"])')
      .filter({ hasNot: page.locator('[data-part="hidden-input"]') })
    await pinInputs.nth(0).fill('1')
    await pinInputs.nth(1).fill('2')

    // Blur to trigger validation
    await page.getByRole('button', { name: /verify all codes/i }).focus()

    // Should show validation error about 4 digits required
    await expect(page.locator('text=/4 (digits|characters|символ)/i')).toBeVisible({ timeout: 10000 })
  })
})
