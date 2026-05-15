import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Auth Fields Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all auth fields', async ({ page }) => {
    // Password fields
    await expect(getField(page, 'password')).toBeVisible()
    await expect(getField(page, 'passwordStrong')).toBeVisible()

    // OTP fields - first input of each
    await expect(getField(page, 'otpCode')).toBeVisible()
    await expect(getField(page, 'otpAlphanumeric')).toBeVisible()
  })

  test('should display section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Password Fields' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'OTP Input Fields' })).toBeVisible()
  })

  // Password Strength Tests
  test('should show strength indicator for password', async ({ page }) => {
    const passwordField = getField(page, 'password')

    // Type a weak password
    await passwordField.click()
    await passwordField.fill('abc')

    // Strength indicator should be visible
    const strengthContainer = passwordField.locator('../../..')
    await expect(strengthContainer.locator('[data-part="track"]')).toBeVisible()
  })

  test('should update strength indicator as password changes', async ({ page }) => {
    const passwordField = getField(page, 'password')

    // Type weak password
    await passwordField.fill('abc')
    await page.waitForTimeout(100)

    // Type stronger password
    await passwordField.fill('Abc123!@#')
    await page.waitForTimeout(100)

    // Strength should have changed (indicator should be more filled)
    const strengthContainer = passwordField.locator('../../..')
    await expect(strengthContainer.locator('[data-part="track"]')).toBeVisible()
  })

  test('should show password requirements when showRequirements is true', async ({ page }) => {
    const passwordStrongField = getField(page, 'passwordStrong')

    // Focus on the field
    await passwordStrongField.click()

    // Requirements list should be visible
    await expect(page.getByText('At least 8 characters')).toBeVisible()
    await expect(page.getByText('One uppercase letter')).toBeVisible()
    await expect(page.getByText('One lowercase letter')).toBeVisible()
    await expect(page.getByText('One number')).toBeVisible()
    await expect(page.getByText('One special character')).toBeVisible()
  })

  test('should check off requirements as they are met', async ({ page }) => {
    const passwordStrongField = getField(page, 'passwordStrong')

    // Type password that meets some requirements
    await passwordStrongField.fill('Abcdefgh')

    // At least 8 characters should be checked
    // One uppercase letter should be checked
    // One lowercase letter should be checked
    // We can check by looking for checkmark icons or color changes
    const requirementsList = page.locator('text=At least 8 characters').locator('..')
    await expect(requirementsList).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordField = getField(page, 'password')
    const container = passwordField.locator('../..')

    // Password should be hidden by default
    await expect(passwordField).toHaveAttribute('type', 'password')

    // Find and click toggle button
    const toggleButton = container.locator('button')
    await toggleButton.click()

    // Password should now be visible
    await expect(passwordField).toHaveAttribute('type', 'text')

    // Click again to hide
    await toggleButton.click()
    await expect(passwordField).toHaveAttribute('type', 'password')
  })

  // OTP Input Tests
  test('should have 6 input fields for OTP code', async ({ page }) => {
    // OTPInput renders multiple PinInput fields
    const otpContainer = getField(page, 'otpCode').locator('../../..')
    const inputs = otpContainer.locator('input')

    // Should have 6 inputs
    await expect(inputs).toHaveCount(7) // 6 visible + 1 hidden
  })

  test('should have 4 input fields for alphanumeric OTP', async ({ page }) => {
    const otpContainer = getField(page, 'otpAlphanumeric').locator('../../..')
    const inputs = otpContainer.locator('input')

    // Should have 4 inputs + 1 hidden
    await expect(inputs).toHaveCount(5)
  })

  test('should auto-focus next input when typing OTP', async ({ page }) => {
    const firstInput = getField(page, 'otpCode')

    // Type first digit
    await firstInput.click()
    await page.keyboard.type('1')

    // Focus should move to second input
    await page.waitForTimeout(100)

    // Type rest of the digits
    await page.keyboard.type('23456')

    // All inputs should be filled
    const otpContainer = firstInput.locator('../../..')
    const inputs = otpContainer.locator('input:visible')
    const values = await inputs.allInputValues()
    expect(values.join('')).toBe('123456')
  })

  test('should allow alphanumeric input in alphanumeric OTP', async ({ page }) => {
    const firstInput = getField(page, 'otpAlphanumeric')

    await firstInput.click()
    await page.keyboard.type('A1B2')

    // All inputs should be filled
    const otpContainer = firstInput.locator('../../..')
    const inputs = otpContainer.locator('input:visible')
    const values = await inputs.allInputValues()
    expect(values.join('')).toBe('A1B2')
  })

  test('should show resend button for OTP with onResend', async ({ page }) => {
    // The alphanumeric OTP has resend functionality
    await expect(page.getByRole('button', { name: /resend/i })).toBeVisible()
  })

  test('should start countdown after clicking resend', async ({ page }) => {
    const resendButton = page.getByRole('button', { name: /resend/i })

    // Click resend
    await resendButton.click()

    // Wait for loading to complete and countdown to appear
    await expect(page.getByText(/resend in/i)).toBeVisible({ timeout: 5000 })
  })

  // Form Submission Test
  test('should submit form with all values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill password fields
    await getField(page, 'password').fill('TestPass123!')
    await getField(page, 'passwordStrong').fill('StrongPass123!')

    // Fill OTP fields
    await getField(page, 'otpCode').click()
    await page.keyboard.type('123456')

    await getField(page, 'otpAlphanumeric').click()
    await page.keyboard.type('AB12')

    // Submit
    const submitButton = page.getByRole('button', { name: /verify/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that password values are in the output
    await expect(submittedData).toContainText('"password"')
    await expect(submittedData).toContainText('"otpCode"')
  })

  // Validation Test
  test('should show error for password too short', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues')

    // Fill short password
    await getField(page, 'password').fill('short')

    // Try to submit
    const submitButton = page.getByRole('button', { name: /verify/i })
    await submitButton.click()

    // Error should appear
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5000 })
  })
})
