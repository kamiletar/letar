import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Tags Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/tags-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all Tags fields', async ({ page }) => {
    // Verify Tags fields are present
    await expect(getField(page, 'tags')).toBeVisible()
    await expect(getField(page, 'categories')).toBeVisible()
    await expect(getField(page, 'skills')).toBeVisible()
    await expect(getField(page, 'emails')).toBeVisible()
  })

  test('should display initial tags', async ({ page }) => {
    // Basic tags field should show initial values
    const tagsField = getField(page, 'tags')
    await expect(tagsField).toContainText('react')
    await expect(tagsField).toContainText('typescript')
  })

  test('should display labels', async ({ page }) => {
    await expect(page.getByText('Basic Tags')).toBeVisible()
    await expect(page.getByText('Limited Tags (max 5)')).toBeVisible()
    await expect(page.getByText('Editable Tags')).toBeVisible()
    await expect(page.getByText('Custom Delimiter')).toBeVisible()
  })

  test('should add tag on Enter', async ({ page }) => {
    // Focus on the basic tags input
    const tagsField = getField(page, 'tags')
    const input = tagsField.locator('input')
    await input.focus()

    // Type a new tag
    await input.fill('chakra')
    await page.keyboard.press('Enter')

    // New tag should appear
    await expect(tagsField).toContainText('chakra')
  })

  test('should remove tag on delete button click', async ({ page }) => {
    // Initial state: should have 'react' tag
    const tagsField = getField(page, 'tags')
    await expect(tagsField).toContainText('react')

    // Find and click delete button on 'react' tag
    const reactTagItem = tagsField.locator('[data-part="item"]').filter({ hasText: 'react' })
    const deleteButton = reactTagItem.locator('[data-part="item-delete-trigger"]')
    await deleteButton.click()

    // 'react' tag should be removed
    await expect(tagsField).not.toContainText('react')
  })

  test('should respect maxTags limit', async ({ page }) => {
    // Categories field has maxTags=5
    const categoriesField = getField(page, 'categories')
    const input = categoriesField.locator('input')

    // Add 5 tags
    for (let i = 1; i <= 5; i++) {
      await input.fill(`cat${i}`)
      await page.keyboard.press('Enter')
    }

    // Try to add 6th tag - should not be added
    await input.fill('cat6')
    await page.keyboard.press('Enter')

    // Verify only 5 tags exist
    const tagItems = categoriesField.locator('[data-part="item"]')
    await expect(tagItems).toHaveCount(5)
  })

  test('should show clear button on clearable field', async ({ page }) => {
    // Skills field is clearable
    const skillsField = getField(page, 'skills')

    // Should have clear trigger button
    const clearButton = skillsField.locator('[data-part="clear-trigger"]')
    await expect(clearButton).toBeVisible()
  })

  test('should clear all tags on clear button click', async ({ page }) => {
    // Skills field should have initial tags
    const skillsField = getField(page, 'skills')
    await expect(skillsField).toContainText('JavaScript')

    // Click clear button
    const clearButton = skillsField.locator('[data-part="clear-trigger"]')
    await clearButton.click()

    // All tags should be removed
    const tagItems = skillsField.locator('[data-part="item"]')
    await expect(tagItems).toHaveCount(0)
  })

  test('should add multiple tags with delimiter', async ({ page }) => {
    // Emails field uses comma/semicolon as delimiter
    const emailsField = getField(page, 'emails')
    const input = emailsField.locator('input')

    // Type multiple values with comma
    await input.fill('test1@email.com')
    await page.keyboard.press('Enter')
    await input.fill('test2@email.com')
    await page.keyboard.press('Enter')

    // Both tags should be added
    await expect(emailsField).toContainText('test1@email.com')
    await expect(emailsField).toContainText('test2@email.com')
  })

  test('should submit form with tags values', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // Add a new tag to basic tags
    const tagsField = getField(page, 'tags')
    const input = tagsField.locator('input')
    await input.fill('nextjs')
    await page.keyboard.press('Enter')

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Check that tags values are in the output
    await expect(submittedData).toContainText('"tags"')
    await expect(submittedData).toContainText('react')
    await expect(submittedData).toContainText('typescript')
    await expect(submittedData).toContainText('nextjs')
  })

  test('should validate minimum tag length', async ({ page }) => {
    // Emails field has minTagLength=3
    const emailsField = getField(page, 'emails')
    const input = emailsField.locator('input')

    // Try to add a too-short tag
    await input.fill('ab')
    await page.keyboard.press('Enter')

    // Tag should not be added (validation failed)
    const tagItems = emailsField.locator('[data-part="item"]')
    await expect(tagItems).toHaveCount(0)
  })
})
