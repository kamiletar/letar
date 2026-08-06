import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Form Persistence', () => {
  const STORAGE_KEY = 'form-persistence:persistence-demo-form'

  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  /**
   * Clear localStorage before each test
   */
  test.beforeEach(async ({ page }) => {
    await page.goto('/persistence-demo')
    // Clear localStorage
    await page.evaluate((key) => {
      localStorage.removeItem(key)
    }, STORAGE_KEY)
    // Reload to start fresh
    await page.reload()
    await page.locator('form').waitFor()
  })

  test('should display persistence demo page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Persistence Demo' })).toBeVisible()
    await expect(getField(page, 'title')).toBeVisible()
    await expect(getField(page, 'description')).toBeVisible()
    await expect(getField(page, 'priority')).toBeVisible()
    await expect(getField(page, 'category')).toBeVisible()
  })

  test('should save form data to localStorage on change', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with localStorage')
    // Fill in some fields
    await getField(page, 'title').fill('Test Title')
    await getField(page, 'description').fill('Test Description')

    // Wait for debounced save (500ms + buffer)
    await page.waitForTimeout(700)

    // Verify localStorage has data
    const savedData = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, STORAGE_KEY)

    expect(savedData).not.toBeNull()
    const parsed = JSON.parse(savedData!)
    expect(parsed.title).toBe('Test Title')
    expect(parsed.description).toBe('Test Description')
  })

  test('should show restore dialog on page load with saved data', async ({ page }) => {
    // First, save some data
    await getField(page, 'title').fill('Saved Title')
    await getField(page, 'description').fill('Saved Description')

    // Wait for save
    await page.waitForTimeout(700)

    // Reload the page
    await page.reload()

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Restore saved data?')).toBeVisible()
    await expect(page.getByText('You have unsaved changes from a previous session')).toBeVisible()
  })

  test('should restore data when clicking Restore button', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with restore')
    // First, save some data
    await getField(page, 'title').fill('Restored Title')
    await getField(page, 'description').fill('Restored Description')

    // Wait for save
    await page.waitForTimeout(700)

    // Reload the page
    await page.reload()

    // Click Restore button
    await page.getByRole('button', { name: 'Restore' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).toBeHidden()

    // Wait for form to update
    await page.waitForTimeout(100)

    // Fields should have restored values
    await expect(getField(page, 'title')).toHaveValue('Restored Title')
    await expect(getField(page, 'description')).toHaveValue('Restored Description')
  })

  test('should discard data when clicking Start fresh button', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit' || browserName === 'firefox',
      'Portal/Dialog timing issues on non-chromium browsers',
    )
    // First, save some data
    await getField(page, 'title').fill('Discarded Title')

    // Wait for save
    await page.waitForTimeout(700)

    // Reload the page
    await page.reload()

    // Click Start fresh button
    await page.getByRole('button', { name: 'Start fresh' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).toBeHidden()

    // Fields should be empty (initial values)
    await expect(getField(page, 'title')).toHaveValue('')

    // localStorage should be cleared
    const savedData = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, STORAGE_KEY)
    expect(savedData).toBeNull()
  })

  test('should clear localStorage on successful submit', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Fill in valid form data
    await getField(page, 'title').fill('Submit Test Title')
    await getField(page, 'description').fill('Submit Test Description')

    // Select priority
    await getField(page, 'priority').getByText('High').click()

    // Select category
    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Work' }).click()

    // Wait for save
    await page.waitForTimeout(700)

    // Verify data is saved
    let savedData = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, STORAGE_KEY)
    expect(savedData).not.toBeNull()

    // Submit the form
    await page.getByRole('button', { name: 'Submit' }).click()

    // Wait for success message
    await expect(page.getByText('Form submitted successfully!')).toBeVisible({ timeout: 10000 })

    // localStorage should be cleared
    savedData = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, STORAGE_KEY)
    expect(savedData).toBeNull()
  })

  test('should not show dialog when no saved data exists', async ({ page }) => {
    // Make sure localStorage is clear
    await page.evaluate((key) => {
      localStorage.removeItem(key)
    }, STORAGE_KEY)

    // Reload page
    await page.reload()
    await page.locator('form').waitFor()

    // Dialog should NOT appear
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('should close dialog when clicking close button', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' || browserName === 'chromium', 'Portal/Dialog timing issues')
    // First, save some data
    await getField(page, 'title').fill('Close Button Test')

    // Wait for save
    await page.waitForTimeout(700)

    // Reload the page
    await page.reload()

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click close button (X)
    await page.getByRole('dialog').getByRole('button', { name: /close/i }).click()

    // Dialog should close and data should be discarded
    await expect(page.getByRole('dialog')).toBeHidden()

    // localStorage should be cleared
    const savedData = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, STORAGE_KEY)
    expect(savedData).toBeNull()
  })
})
