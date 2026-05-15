import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Form.When Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/when-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Form.When Demo' })).toBeVisible()
    await expect(page.getByText('Conditional field rendering based on other field values')).toBeVisible()
  })

  test.describe('Example 1: is - Exact value match', () => {
    test('should show individual fields by default', async ({ page }) => {
      // Default is 'individual', so individual fields should be visible
      await expect(page.getByText('Individual customer fields:')).toBeVisible()
      await expect(getField(page, 'firstName')).toBeVisible()
      await expect(getField(page, 'lastName')).toBeVisible()

      // Company fields should NOT be visible
      await expect(page.getByText('Company fields:')).toBeHidden()
    })

    test('should switch to company fields when selecting Company', async ({ page }) => {
      // Click on Company segment
      await page.getByRole('radio', { name: 'Company' }).click()

      // Company fields should now be visible
      await expect(page.getByText('Company fields:')).toBeVisible()
      await expect(getField(page, 'companyName')).toBeVisible()
      await expect(getField(page, 'inn')).toBeVisible()

      // Individual fields should NOT be visible
      await expect(page.getByText('Individual customer fields:')).toBeHidden()
    })

    test('should switch back to individual fields', async ({ page }) => {
      // Switch to company
      await page.getByRole('radio', { name: 'Company' }).click()
      await expect(getField(page, 'companyName')).toBeVisible()

      // Switch back to individual
      await page.getByRole('radio', { name: 'Individual' }).click()
      await expect(getField(page, 'firstName')).toBeVisible()
      await expect(getField(page, 'companyName')).toBeHidden()
    })
  })

  test.describe('Example 2: fallback - Alternative content', () => {
    test('should show upgrade message when premium is off', async ({ page }) => {
      // Premium is off by default
      await expect(page.getByText('Upgrade to Premium to access theme settings')).toBeVisible()
    })

    test('should show theme selector when premium is on', async ({ page }) => {
      // Enable premium subscription
      const premiumSwitch = getField(page, 'hasPremium')
      await premiumSwitch.click()

      // Theme selector should appear
      await expect(page.getByRole('radio', { name: 'Light' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'System' })).toBeVisible()

      // Upgrade message should disappear
      await expect(page.getByText('Upgrade to Premium to access theme settings')).toBeHidden()
    })

    test('should hide theme selector when premium is turned off', async ({ page }) => {
      // Enable premium
      const premiumSwitch = getField(page, 'hasPremium')
      await premiumSwitch.click()
      await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible()

      // Disable premium
      await premiumSwitch.click()
      await expect(page.getByRole('radio', { name: 'Dark' })).toBeHidden()
      await expect(page.getByText('Upgrade to Premium to access theme settings')).toBeVisible()
    })
  })

  test.describe('Example 3: condition - Custom function', () => {
    test('should show adult content checkbox for age >= 18', async ({ page }) => {
      // Default age is 25, so adult content checkbox should be visible
      await expect(getField(page, 'adultContent')).toBeVisible()
      await expect(page.getByText('Adult content settings are not available')).toBeHidden()
    })

    test('should hide adult content checkbox for age < 18', async ({ page }) => {
      // Change age to 17
      const ageField = getField(page, 'age')
      await ageField.clear()
      await ageField.fill('17')
      await ageField.blur()

      // Adult content checkbox should be hidden
      await expect(getField(page, 'adultContent')).toBeHidden()
      await expect(page.getByText('Adult content settings are not available for users under 18')).toBeVisible()
    })

    test('should show adult content when age becomes 18', async ({ page }) => {
      // First set age to 17
      const ageField = getField(page, 'age')
      await ageField.clear()
      await ageField.fill('17')
      await ageField.blur()

      await expect(page.getByText('Adult content settings are not available')).toBeVisible()

      // Change to 18
      await ageField.clear()
      await ageField.fill('18')
      await ageField.blur()

      // Adult content checkbox should now be visible
      await expect(getField(page, 'adultContent')).toBeVisible()
    })
  })

  test.describe('Example 4: in - Array of values', () => {
    test('should hide permissions for regular user', async ({ page }) => {
      // Default role is 'user', no permissions should be visible
      await expect(getField(page, 'canEditSettings')).toBeHidden()
      await expect(getField(page, 'canDeleteUsers')).toBeHidden()
    })

    test('should show edit settings for moderator', async ({ page }) => {
      // Select moderator
      await page.getByRole('radio', { name: 'Moderator' }).click()

      // Can edit settings should be visible (moderator or admin)
      await expect(getField(page, 'canEditSettings')).toBeVisible()

      // Can delete users should NOT be visible (admin only)
      await expect(getField(page, 'canDeleteUsers')).toBeHidden()
    })

    test('should show all permissions for admin', async ({ page }) => {
      // Select admin
      await page.getByRole('radio', { name: 'Admin' }).click()

      // Both permissions should be visible
      await expect(getField(page, 'canEditSettings')).toBeVisible()
      await expect(getField(page, 'canDeleteUsers')).toBeVisible()
    })

    test('should hide permissions when switching back to user', async ({ page }) => {
      // Select admin
      await page.getByRole('radio', { name: 'Admin' }).click()
      await expect(getField(page, 'canDeleteUsers')).toBeVisible()

      // Switch back to user
      await page.getByRole('radio', { name: 'User' }).click()
      await expect(getField(page, 'canEditSettings')).toBeHidden()
      await expect(getField(page, 'canDeleteUsers')).toBeHidden()
    })
  })

  test.describe('Example 5: Nested in Form.Group', () => {
    test('should hide frequency when notifications are off', async ({ page }) => {
      // Notifications are off by default
      await expect(page.getByRole('radio', { name: 'Daily' })).toBeHidden()
    })

    test('should show frequency when notifications are enabled', async ({ page }) => {
      // Enable notifications
      const notificationsSwitch = getField(page, 'settings.notifications')
      await notificationsSwitch.click()

      // Frequency selector should appear
      await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Weekly' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Monthly' })).toBeVisible()
    })

    test('should hide frequency when notifications are disabled again', async ({ page }) => {
      // Enable notifications
      const notificationsSwitch = getField(page, 'settings.notifications')
      await notificationsSwitch.click()
      await expect(page.getByRole('radio', { name: 'Weekly' })).toBeVisible()

      // Disable notifications
      await notificationsSwitch.click()
      await expect(page.getByRole('radio', { name: 'Weekly' })).toBeHidden()
    })
  })

  test.describe('Form Submission', () => {
    test('should submit form with conditional values', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Fill individual fields (default)
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')

      // Enable premium and select theme
      await getField(page, 'hasPremium').click()
      await page.getByRole('radio', { name: 'Dark' }).click()

      // Select admin role
      await page.getByRole('radio', { name: 'Admin' }).click()
      await getField(page, 'canEditSettings').click()
      await getField(page, 'canDeleteUsers').click()

      // Enable notifications
      await getField(page, 'settings.notifications').click()
      await page.getByRole('radio', { name: 'Weekly' }).click()

      // Submit form
      await page.getByRole('button', { name: 'Submit' }).click()

      // Verify submitted data
      const submittedData = page.getByTestId('submitted-data')
      await expect(submittedData).toBeVisible({ timeout: 10000 })

      // Check key values
      await expect(submittedData).toContainText('"firstName": "John"')
      await expect(submittedData).toContainText('"lastName": "Doe"')
      await expect(submittedData).toContainText('"hasPremium": true')
      await expect(submittedData).toContainText('"premiumTheme": "dark"')
      await expect(submittedData).toContainText('"role": "admin"')
      await expect(submittedData).toContainText('"canEditSettings": true')
      await expect(submittedData).toContainText('"canDeleteUsers": true')
      await expect(submittedData).toContainText('"notifications": true')
      await expect(submittedData).toContainText('"frequency": "weekly"')
    })
  })
})
