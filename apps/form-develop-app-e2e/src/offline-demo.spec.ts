import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Offline Forms', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/offline-demo')
    await page.locator('form').waitFor()
  })

  test('should display offline demo page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Offline Forms Demo' })).toBeVisible()
    await expect(getField(page, 'name')).toBeVisible()
    await expect(getField(page, 'email')).toBeVisible()
    await expect(getField(page, 'message')).toBeVisible()
  })

  test('should show SyncStatus component with showWhenEmpty', async ({ page }) => {
    // SyncStatus should be visible because showWhenEmpty=true
    await expect(page.getByTestId('sync-status')).toBeVisible()
    // Should show "Синхронизировано" when queue is empty
    await expect(page.getByTestId('sync-status')).toContainText(/синхронизировано/i)
  })

  test('should not show OfflineIndicator when online', async ({ page }) => {
    // OfflineIndicator should be hidden when online
    await expect(page.getByTestId('offline-indicator')).toBeHidden()
  })

  test('should toggle simulated offline mode', async ({ page }) => {
    // Click "Simulate Offline" button
    await page.getByRole('button', { name: 'Simulate Offline' }).click()

    // Should show "Simulated Offline" badge
    await expect(page.getByText('Simulated Offline')).toBeVisible()

    // Button text should change to "Go Online"
    await expect(page.getByRole('button', { name: 'Go Online' })).toBeVisible()

    // Event log should show the action
    await expect(page.getByText('Simulated offline mode enabled')).toBeVisible()

    // Click "Go Online" button
    await page.getByRole('button', { name: 'Go Online' }).click()

    // Badge should disappear
    await expect(page.getByText('Simulated Offline')).toBeHidden()

    // Event log should show the action
    await expect(page.getByText('Simulated offline mode disabled')).toBeVisible()
  })

  test('should submit form successfully when online', async ({ page }) => {
    // Fill in the form
    await getField(page, 'name').fill('John Doe')
    await getField(page, 'email').fill('john@example.com')
    await getField(page, 'message').fill('This is a test message for online submission.')

    // Submit the form
    await page.getByRole('button', { name: 'Submit' }).click()

    // Event log should show submission
    await expect(page.getByText('Submitting form...')).toBeVisible()

    // Wait for success
    await expect(page.getByText('Form submitted successfully!')).toBeVisible({ timeout: 5000 })

    // Last Submitted Data should be visible
    await expect(page.getByText('Last Submitted Data')).toBeVisible()
    await expect(page.getByText('"name": "John Doe"')).toBeVisible()
  })

  test('should save to queue when simulated offline', async ({ page }) => {
    // Enable simulated offline mode
    await page.getByRole('button', { name: 'Simulate Offline' }).click()
    await expect(page.getByText('Simulated Offline')).toBeVisible()

    // Fill in the form
    await getField(page, 'name').fill('Offline User')
    await getField(page, 'email').fill('offline@example.com')
    await getField(page, 'message').fill('This message was submitted offline.')

    // Submit button should show "Save Offline"
    await expect(page.getByRole('button', { name: 'Save Offline' })).toBeVisible()

    // Submit the form
    await page.getByRole('button', { name: 'Save Offline' }).click()

    // Should show queued message
    await expect(page.getByText('Form saved to offline queue')).toBeVisible({ timeout: 5000 })

    // Sync Queue should show the item
    await expect(page.getByText('FORM_SUBMIT')).toBeVisible()
    await expect(page.getByText('PENDING')).toBeVisible()

    // SyncStatus should show pending count
    await expect(page.getByTestId('sync-status')).toContainText(/ожидает|pending/i)
  })

  test('should display technical details', async ({ page }) => {
    // Technical details section should be visible
    await expect(page.getByText('Technical Details:')).toBeVisible()
    await expect(page.getByText('Real offline status: false')).toBeVisible()
    await expect(page.getByText('Simulated offline: false')).toBeVisible()
    await expect(page.getByText('Queue length: 0')).toBeVisible()
  })

  test('should update queue length after offline submit', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with IndexedDB')

    // Enable simulated offline mode
    await page.getByRole('button', { name: 'Simulate Offline' }).click()

    // Fill and submit form
    await getField(page, 'name').fill('Queue Test')
    await getField(page, 'email').fill('queue@test.com')
    await getField(page, 'message').fill('Testing queue length update.')
    await page.getByRole('button', { name: 'Save Offline' }).click()

    // Wait for queue to update
    await page.waitForTimeout(500)

    // Technical details should show queue length = 1
    await expect(page.getByText('Queue length: 1')).toBeVisible()
    await expect(page.getByText('Pending count: 1')).toBeVisible()
  })

  test('should show event log entries', async ({ page }) => {
    // Initially event log should be empty
    await expect(page.getByText('No events yet')).toBeVisible()

    // Perform an action (toggle offline)
    await page.getByRole('button', { name: 'Simulate Offline' }).click()

    // Event log should now have entries
    await expect(page.getByText('No events yet')).toBeHidden()
    await expect(page.getByText('Simulated offline mode enabled')).toBeVisible()
  })

  test('should show queue is empty initially', async ({ page }) => {
    await expect(page.getByText('Queue is empty')).toBeVisible()
    await expect(page.getByText('Sync Queue (0)')).toBeVisible()
  })

  test('should show how it works section', async ({ page }) => {
    await expect(page.getByText('How Offline Forms Work:')).toBeVisible()
    await expect(page.getByText(/Fill in the form above/)).toBeVisible()
    await expect(page.getByText(/Simulate Offline/)).toBeVisible()
  })
})
