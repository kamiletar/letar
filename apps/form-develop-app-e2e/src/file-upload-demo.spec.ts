import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('FileUpload Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/file-upload-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all FileUpload variants', async ({ page }) => {
    // Check page heading
    await expect(page.getByRole('heading', { name: 'FileUpload Demo' })).toBeVisible()

    // Verify all upload fields are present by their section headings
    await expect(page.getByRole('heading', { name: 'Button Variant (Single Image)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dropzone Variant (Multiple Images)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dropzone Variant (Documents)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Input Variant' })).toBeVisible()
  })

  test('should display button variant with upload button', async ({ page }) => {
    // Button variant should have an upload button
    await expect(page.getByRole('button', { name: /upload avatar/i })).toBeVisible()
  })

  test('should display dropzone with label and description', async ({ page }) => {
    // Dropzone should have label and description
    await expect(page.getByText('Drag and drop images here')).toBeVisible()
    await expect(page.getByText('PNG, JPG, WebP up to 5MB each')).toBeVisible()
  })

  test('should display input variant with placeholder', async ({ page }) => {
    // Input variant should have placeholder text
    // The placeholder is inside the file input trigger
    await expect(page.getByText('Select your resume...')).toBeVisible()
  })

  test('should upload file via button variant', async ({ page }) => {
    // Create a test file in memory
    const fileContent = Buffer.from('test image content')

    // Find the hidden file input within the avatar field
    const avatarField = getField(page, 'avatar')
    const fileInput = avatarField.locator('input[type="file"]')

    // Upload file
    await fileInput.setInputFiles({
      name: 'test-avatar.png',
      mimeType: 'image/png',
      buffer: fileContent,
    })

    // File should appear in the list
    await expect(page.getByText('test-avatar.png')).toBeVisible()
  })

  test('should upload multiple files via dropzone', async ({ page }) => {
    // Find the gallery dropzone file input
    const galleryField = getField(page, 'gallery')
    const fileInput = galleryField.locator('input[type="file"]')

    // Upload multiple files
    await fileInput.setInputFiles([
      {
        name: 'image1.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('image1 content'),
      },
      {
        name: 'image2.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('image2 content'),
      },
    ])

    // Files should appear in the list
    await expect(page.getByText('image1.jpg')).toBeVisible()
    await expect(page.getByText('image2.jpg')).toBeVisible()
  })

  test('should clear uploaded file when clearable', async ({ page }) => {
    // Upload a file to avatar field
    const avatarField = getField(page, 'avatar')
    const fileInput = avatarField.locator('input[type="file"]')

    await fileInput.setInputFiles({
      name: 'to-delete.png',
      mimeType: 'image/png',
      buffer: Buffer.from('delete me'),
    })

    // Verify file is shown
    await expect(page.getByText('to-delete.png')).toBeVisible()

    // Click clear/delete button for this file
    // The clear button is typically next to the file name
    const clearButton = avatarField.getByRole('button', { name: /delete|clear|remove/i })
    await clearButton.click()

    // File should be removed
    await expect(page.getByText('to-delete.png')).toBeHidden()
  })

  test('should show file sizes when showSize is enabled', async ({ page }) => {
    // Upload a file to gallery (which has showSize enabled)
    const galleryField = getField(page, 'gallery')
    const fileInput = galleryField.locator('input[type="file"]')

    await fileInput.setInputFiles({
      name: 'sized-file.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('a'.repeat(1024)), // 1KB file
    })

    // File size should be displayed (1 KB or similar)
    await expect(page.getByText(/\d+\s*(B|KB|MB)/)).toBeVisible()
  })

  test('should submit form with uploaded files', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with file uploads')

    // Upload a file to avatar (required)
    const avatarField = getField(page, 'avatar')
    const avatarInput = avatarField.locator('input[type="file"]')

    await avatarInput.setInputFiles({
      name: 'my-avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('avatar content'),
    })

    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Submit' })
    await submitButton.click()

    // Verify submitted data is displayed
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })
    await expect(submittedData).toContainText('my-avatar.png')
  })

  test('should show validation error when required file is missing', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with validation')

    // Try to submit without uploading avatar (which is required)
    const submitButton = page.getByRole('button', { name: 'Submit' })
    await submitButton.click()

    // Should show validation error for avatar
    await expect(page.locator('text=/required|avatar/i')).toBeVisible({ timeout: 10000 })
  })

  test('should upload document files to documents dropzone', async ({ page }) => {
    // Find the documents dropzone
    const documentsField = getField(page, 'documents')
    const fileInput = documentsField.locator('input[type="file"]')

    // Upload a PDF file
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf content'),
    })

    // File should appear
    await expect(page.getByText('document.pdf')).toBeVisible()
  })

  test('should allow selecting file via input variant', async ({ page }) => {
    // Find the resume input field
    const resumeField = getField(page, 'resume')
    const fileInput = resumeField.locator('input[type="file"]')

    // Upload a PDF file
    await fileInput.setInputFiles({
      name: 'my-resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('resume content'),
    })

    // File name should be shown
    await expect(page.getByText('my-resume.pdf')).toBeVisible()
  })
})
