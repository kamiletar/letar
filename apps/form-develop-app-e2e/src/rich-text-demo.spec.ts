import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('RichText Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  /**
   * Helper to get Tiptap editor within a field
   */
  function getEditor(page: Page, fieldName: string) {
    return getField(page, fieldName).locator('.tiptap')
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/rich-text-demo')
    // Wait for form and editors to load
    await page.locator('form').waitFor()
    // Wait for Tiptap editors to initialize
    await page.waitForSelector('.tiptap')
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Rich Text Demo' })).toBeVisible()
    await expect(page.getByText('WYSIWYG rich text editor based on Tiptap')).toBeVisible()
  })

  test('should display multiple RichText editors', async ({ page }) => {
    // Should have multiple Tiptap editors
    const editors = page.locator('.tiptap')
    await expect(editors).toHaveCount(4) // content, comment, jsonContent, read-only preview
  })

  test('should display initial content in editor', async ({ page }) => {
    const contentEditor = getEditor(page, 'content')
    // Initial content has bold and italic text
    await expect(contentEditor.locator('strong')).toContainText('bold')
    await expect(contentEditor.locator('em')).toContainText('italic')
  })

  test('should allow typing in editor', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')

    // Focus and type
    await commentEditor.click()
    await page.keyboard.type('This is a test comment')

    // Verify text is present
    await expect(commentEditor).toContainText('This is a test comment')
  })

  test('should display toolbar with formatting buttons', async ({ page }) => {
    // First editor should have full toolbar
    const contentField = getField(page, 'content')

    // Check for common formatting buttons
    await expect(contentField.getByRole('button', { name: /bold/i })).toBeVisible()
    await expect(contentField.getByRole('button', { name: /italic/i })).toBeVisible()
  })

  test('should apply bold formatting', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')
    const commentField = getField(page, 'comment')

    // Type some text
    await commentEditor.click()
    await page.keyboard.type('normal ')

    // Click bold button
    const boldButton = commentField.getByRole('button', { name: /bold/i })
    await boldButton.click()

    // Type bold text
    await page.keyboard.type('bold text')

    // Verify bold formatting was applied
    await expect(commentEditor.locator('strong')).toContainText('bold text')
  })

  test('should apply italic formatting', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')
    const commentField = getField(page, 'comment')

    // Type some text
    await commentEditor.click()
    await page.keyboard.type('normal ')

    // Click italic button
    const italicButton = commentField.getByRole('button', { name: /italic/i })
    await italicButton.click()

    // Type italic text
    await page.keyboard.type('italic text')

    // Verify italic formatting was applied
    await expect(commentEditor.locator('em')).toContainText('italic text')
  })

  test('should apply bold via keyboard shortcut', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')

    // Focus and type
    await commentEditor.click()
    await page.keyboard.type('normal ')

    // Use Ctrl+B shortcut
    await page.keyboard.press('Control+b')
    await page.keyboard.type('bold')

    // Verify bold formatting
    await expect(commentEditor.locator('strong')).toContainText('bold')
  })

  test('should have limited toolbar for comment editor', async ({ page }) => {
    // Comment editor should have only limited buttons: bold, italic, underline, link
    const commentField = getField(page, 'comment')

    // Should have these buttons
    await expect(commentField.getByRole('button', { name: /bold/i })).toBeVisible()
    await expect(commentField.getByRole('button', { name: /italic/i })).toBeVisible()

    // Should NOT have heading buttons (full toolbar feature)
    const h1Button = commentField.getByRole('button', { name: /^h1$/i })
    await expect(h1Button).toHaveCount(0)
  })

  test('should show read-only editor', async ({ page }) => {
    // The read-only preview should not be editable
    // Find the read-only editor (the one with label "Read-only preview")
    const readOnlyLabel = page.getByText('Read-only preview')
    await expect(readOnlyLabel).toBeVisible()

    // The editor following this label should have readonly attribute
    const readOnlyEditor = readOnlyLabel.locator('..').locator('.tiptap')
    await expect(readOnlyEditor).toHaveAttribute('contenteditable', 'false')
  })

  test('should not show toolbar for read-only editor', async ({ page }) => {
    // Find the read-only section
    const readOnlyLabel = page.getByText('Read-only preview')
    const readOnlySection = readOnlyLabel.locator('..')

    // Should not have toolbar buttons in read-only section
    const toolbarButtons = readOnlySection.getByRole('button')
    await expect(toolbarButtons).toHaveCount(0)
  })

  test('should submit form with rich text content', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with rich text submission')

    const commentEditor = getEditor(page, 'comment')

    // Type in comment editor
    await commentEditor.click()
    await page.keyboard.type('My test comment')

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit content/i })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })

    // Content should include the initial HTML
    await expect(submittedData).toContainText('HTML Content')
    await expect(submittedData).toContainText('bold')
    await expect(submittedData).toContainText('italic')
  })

  test('should handle undo/redo', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')

    // Type text
    await commentEditor.click()
    await page.keyboard.type('First text')

    // Verify text
    await expect(commentEditor).toContainText('First text')

    // Undo (Ctrl+Z)
    await page.keyboard.press('Control+z')

    // Text should be removed or partially undone
    // Note: Tiptap may undo character by character or word by word
    const textAfterUndo = await commentEditor.textContent()
    expect(textAfterUndo?.length).toBeLessThan('First text'.length)
  })

  test('should clear editor content', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')

    // Type text
    await commentEditor.click()
    await page.keyboard.type('Some content')
    await expect(commentEditor).toContainText('Some content')

    // Select all and delete
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')

    // Editor should be empty (or have just a paragraph placeholder)
    const text = await commentEditor.textContent()
    expect(text?.trim()).toBe('')
  })

  test('should handle line breaks', async ({ page }) => {
    const commentEditor = getEditor(page, 'comment')

    // Type with line breaks
    await commentEditor.click()
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')

    // Should have multiple paragraphs
    const paragraphs = commentEditor.locator('p')
    await expect(paragraphs).toHaveCount(2)
  })
})
