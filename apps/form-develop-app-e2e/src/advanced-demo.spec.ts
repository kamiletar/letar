import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Advanced Fields Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/advanced-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all advanced fields', async ({ page }) => {
    // Address fields
    await expect(getField(page, 'address')).toBeVisible()
    await expect(getField(page, 'addressSimple')).toBeVisible()

    // Duration fields
    await expect(getField(page, 'duration')).toBeVisible()
    await expect(getField(page, 'durationMinutes')).toBeVisible()

    // DateTimePicker fields
    await expect(getField(page, 'appointmentAt')).toBeVisible()
    await expect(getField(page, 'eventStart')).toBeVisible()
  })

  test('should display section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Address Fields' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Duration Fields' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'DateTimePicker Fields' })).toBeVisible()
  })

  // Address Tests
  test('should allow typing in address field', async ({ page }) => {
    const addressField = getField(page, 'address')

    await addressField.click()
    await addressField.fill('Moscow, Tverskaya')

    const value = addressField
    await expect(value).toHaveValue('Moscow, Tverskaya')
  })

  test('should allow typing in simple address field', async ({ page }) => {
    const addressField = getField(page, 'addressSimple')

    await addressField.click()
    await addressField.fill('123 Main Street, New York')

    const value = addressField
    await expect(value).toHaveValue('123 Main Street, New York')
  })

  // Duration Tests
  test('should display duration in HH:MM format', async ({ page }) => {
    const durationField = getField(page, 'duration')
    await expect(durationField).toBeVisible()

    // Default value is 60 minutes = "01:00"
    const value = await durationField.inputValue()
    expect(value).toMatch(/^\d{1,2}:\d{2}$/)
  })

  test('should allow editing duration', async ({ page }) => {
    const durationField = getField(page, 'duration')

    // Clear and type new value
    await durationField.click()
    await durationField.fill('')
    await durationField.fill('02:30')
    await durationField.blur()

    const value = await durationField.inputValue()
    expect(value).toContain('2')
    expect(value).toContain('30')
  })

  test('should display duration in minutes format', async ({ page }) => {
    const durationField = getField(page, 'durationMinutes')
    await expect(durationField).toBeVisible()

    // Default value is 30
    const value = await durationField.inputValue()
    expect(value).toMatch(/^\d+$/)
  })

  test('should allow editing duration in minutes', async ({ page }) => {
    const durationField = getField(page, 'durationMinutes')

    // Clear and type new value
    await durationField.click()
    await durationField.fill('')
    await durationField.fill('45')
    await durationField.blur()

    const value = durationField
    await expect(value).toHaveValue('45')
  })

  // DateTimePicker Tests
  test('should have date input in DateTimePicker', async ({ page }) => {
    // DateTimePicker has two inputs: date and time
    const appointmentContainer = getField(page, 'appointmentAt').locator('../..')
    const dateInput = appointmentContainer.locator('input[type="date"]')
    const timeInput = appointmentContainer.locator('input[type="time"]')

    await expect(dateInput).toBeVisible()
    await expect(timeInput).toBeVisible()
  })

  test('should allow selecting date and time', async ({ page }) => {
    // Find date and time inputs
    const appointmentContainer = getField(page, 'appointmentAt').locator('../..')
    const dateInput = appointmentContainer.locator('input[type="date"]')
    const timeInput = appointmentContainer.locator('input[type="time"]')

    // Set date
    await dateInput.fill('2025-01-15')
    // Set time
    await timeInput.fill('14:30')

    // Verify values
    await expect(dateInput).toHaveValue('2025-01-15')
    await expect(timeInput).toHaveValue('14:30')
  })

  // Form Submission Test
  test('should submit form with all values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill address
    await getField(page, 'addressSimple').fill('123 Test Street')

    // Duration fields already have default values

    // Fill appointment
    const appointmentContainer = getField(page, 'appointmentAt').locator('../..')
    const dateInput = appointmentContainer.locator('input[type="date"]')
    const timeInput = appointmentContainer.locator('input[type="time"]')
    await dateInput.fill('2025-01-15')
    await timeInput.fill('14:30')

    // Submit
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that key fields are in the output
    await expect(submittedData).toContainText('"duration"')
    await expect(submittedData).toContainText('"appointmentAt"')
  })

  // Validation Tests
  test('should show error for duration below minimum', async ({ page }) => {
    const durationField = getField(page, 'duration')

    // Try to enter value below min (15)
    await durationField.click()
    await durationField.fill('')
    await durationField.fill('00:10')
    await durationField.blur()

    // Submit to trigger validation
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Error message should appear
    await expect(page.getByText(/minimum/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show error for empty required appointment', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues')

    // appointmentAt is required
    // Try to submit without filling it
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Error should appear for the required field
    await expect(page.getByText(/select date and time/i)).toBeVisible({ timeout: 5000 })
  })
})
