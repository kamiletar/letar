import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('i18n Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/i18n-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test.describe('Russian locale (default)', () => {
    test('should display form fields in Russian', async ({ page }) => {
      // Russian should be selected by default
      const russianButton = page.getByRole('button', { name: 'Русский' })
      await expect(russianButton).toHaveCSS('background-color', /blue|rgb\(59, 130, 246\)|rgb\(66, 153, 225\)/)

      // Check Russian labels (use exact match to avoid multiple matches)
      await expect(page.locator('label').filter({ hasText: 'Название товара' }).first()).toBeVisible()
      await expect(page.locator('label').filter({ hasText: 'Цена' }).first()).toBeVisible()

      // Check placeholder in Russian
      const nameInput = getField(page, 'name')
      await expect(nameInput).toHaveAttribute('placeholder', 'Введите название')

      // Check helper text in Russian
      await expect(page.getByText('Уникальное название товара', { exact: true })).toBeVisible()
    })

    test('should display select options in Russian', async ({ page }) => {
      // Find and click the category select trigger
      const categorySelect = getField(page, 'category')
      const trigger = categorySelect.locator('[data-part="trigger"]')
      await trigger.click()

      // Russian options should be visible
      await expect(page.getByRole('option', { name: 'Электроника' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Одежда' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Еда' })).toBeVisible()

      // Close dropdown
      await page.keyboard.press('Escape')
    })

    test('should show submit button in Russian', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible()
    })
  })

  test.describe('English locale', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()
    })

    test('should display form fields in English', async ({ page }) => {
      // English should now be selected
      const englishButton = page.getByRole('button', { name: 'English' })
      await expect(englishButton).toHaveCSS('background-color', /blue|rgb\(59, 130, 246\)|rgb\(66, 153, 225\)/)

      // Check English labels (use label locator to be specific)
      await expect(page.locator('label').filter({ hasText: 'Product Name' }).first()).toBeVisible()
      await expect(page.locator('label').filter({ hasText: 'Price' }).first()).toBeVisible()

      // Check placeholder in English
      const nameInput = getField(page, 'name')
      await expect(nameInput).toHaveAttribute('placeholder', 'Enter name')

      // Check helper text in English
      await expect(page.getByText('Unique product name', { exact: true })).toBeVisible()
    })

    test('should display select options in English', async ({ page }) => {
      // Find and click the category select trigger
      const categorySelect = getField(page, 'category')
      const trigger = categorySelect.locator('[data-part="trigger"]')
      await trigger.click()

      // English options should be visible
      await expect(page.getByRole('option', { name: 'Electronics' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Clothing' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Food' })).toBeVisible()

      // Close dropdown
      await page.keyboard.press('Escape')
    })

    test('should show submit button in English', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
    })
  })

  test.describe('Locale switching', () => {
    test('should switch from Russian to English', async ({ page }) => {
      // Initially in Russian - check label
      const nameLabel = page.locator('label').filter({ hasText: 'Название товара' }).first()
      await expect(nameLabel).toBeVisible()

      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Should now be in English - label should change
      await expect(page.locator('label').filter({ hasText: 'Product Name' }).first()).toBeVisible()
      // Russian label should no longer exist
      await expect(page.locator('label').filter({ hasText: /^Название товара/ })).toBeHidden()
    })

    test('should switch from English back to Russian', async ({ page }) => {
      // Switch to English first
      await page.getByRole('button', { name: 'English' }).click()
      await expect(page.locator('label').filter({ hasText: 'Product Name' }).first()).toBeVisible()

      // Switch back to Russian
      await page.getByRole('button', { name: 'Русский' }).click()

      // Should be back to Russian
      await expect(page.locator('label').filter({ hasText: 'Название товара' }).first()).toBeVisible()
      await expect(page.locator('label').filter({ hasText: /^Product Name/ })).toBeHidden()
    })
  })

  test.describe('Form submission', () => {
    test('should submit form data correctly regardless of locale', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Fill the form
      await getField(page, 'name').fill('Test Product')
      await getField(page, 'email').fill('test@example.com')

      // Fill price using spinbutton
      const priceInput = page.getByRole('spinbutton')
      await priceInput.fill('100')

      // Select category
      const categorySelect = getField(page, 'category')
      const trigger = categorySelect.locator('[data-part="trigger"]')
      await trigger.click()
      await page.getByRole('option', { name: 'Электроника' }).click()

      // Submit form
      await page.getByRole('button', { name: 'Отправить' }).click()

      // Verify submitted data
      const submittedData = page.getByTestId('submitted-data')
      await expect(submittedData).toBeVisible({ timeout: 10000 })
      await expect(submittedData).toContainText('Test Product')
      await expect(submittedData).toContainText('100')
      await expect(submittedData).toContainText('ELECTRONICS')
    })

    test('should submit form in English locale', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Fill the form
      await getField(page, 'name').fill('Test Product EN')
      await getField(page, 'email').fill('test@example.com')

      // Fill price
      const priceInput = page.getByRole('spinbutton')
      await priceInput.fill('200')

      // Select category in English
      const categorySelect = getField(page, 'category')
      const trigger = categorySelect.locator('[data-part="trigger"]')
      await trigger.click()
      await page.getByRole('option', { name: 'Clothing' }).click()

      // Submit form
      await page.getByRole('button', { name: 'Submit' }).click()

      // Verify submitted data (values are the same regardless of display language)
      const submittedData = page.getByTestId('submitted-data')
      await expect(submittedData).toBeVisible({ timeout: 10000 })
      await expect(submittedData).toContainText('Test Product EN')
      await expect(submittedData).toContainText('200')
      await expect(submittedData).toContainText('CLOTHING')
    })
  })

  test.describe('i18nKey display', () => {
    test('should show usage hints and error structure', async ({ page }) => {
      // The demo page shows usage hints for validation errors
      await expect(page.getByText(/Попробуй ввести 1 символ/)).toBeVisible()
      await expect(page.getByText(/Введи невалидный email/)).toBeVisible()
      // Shows i18nKey for select options
      await expect(page.getByText(/i18nKey.*Category\.VALUE/)).toBeVisible()
    })
  })

  test.describe('Validation error translation (Фаза 14)', () => {
    test('should show string min validation error in Russian', async ({ page }) => {
      // Enter 1 character (min is 2)
      const nameInput = getField(page, 'name')
      await nameInput.click()
      await nameInput.fill('a')
      await nameInput.blur()

      // Check Russian error message with interpolation
      await expect(page.getByText('Минимум 2 символов')).toBeVisible()
    })

    test('should show string min validation error in English', async ({ page }) => {
      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Enter 1 character (min is 2)
      const nameInput = getField(page, 'name')
      await nameInput.click()
      await nameInput.fill('a')
      await nameInput.blur()

      // Check English error message with interpolation
      await expect(page.getByText('Minimum 2 characters')).toBeVisible()
    })

    test('should show email validation error in Russian on submit', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Fill valid name to pass first validation
      await getField(page, 'name').fill('Valid Name')

      // Enter invalid email
      const emailInput = getField(page, 'email')
      await emailInput.click()
      await emailInput.fill('invalid-email')

      // Submit form to trigger validation
      await page.getByRole('button', { name: 'Отправить' }).click()

      // Check Russian error for invalid email format (use role to avoid matching code examples)
      await expect(page.locator('[data-part="error-text"]').filter({ hasText: 'Некорректный email' })).toBeVisible({
        timeout: 10000,
      })
    })

    test('should show email validation error in English on submit', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Fill valid name
      await getField(page, 'name').fill('Valid Name')

      // Enter invalid email
      const emailInput = getField(page, 'email')
      await emailInput.click()
      await emailInput.fill('invalid-email')

      // Submit form
      await page.getByRole('button', { name: 'Submit' }).click()

      // Check English error for invalid email format (use data-part to avoid matching code examples)
      await expect(page.locator('[data-part="error-text"]').filter({ hasText: 'Invalid email address' })).toBeVisible({
        timeout: 10000,
      })
    })

    test('should show number validation error in Russian', async ({ page }) => {
      // Price has min(1), so 0 should trigger error
      const priceInput = page.getByRole('spinbutton')
      await priceInput.click()
      await priceInput.fill('0')
      await priceInput.blur()

      // Check Russian error
      await expect(page.getByText('Минимум 1')).toBeVisible()
    })

    test('should show number validation error in English', async ({ page }) => {
      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Price has min(1), so 0 should trigger error
      const priceInput = page.getByRole('spinbutton')
      await priceInput.click()
      await priceInput.fill('0')
      await priceInput.blur()

      // Check English error
      await expect(page.getByText('Minimum 1')).toBeVisible()
    })

    test('should switch validation error language with locale', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with validation')

      // Enter invalid data in Russian
      const nameInput = getField(page, 'name')
      await nameInput.click()
      await nameInput.fill('a')
      await nameInput.blur()

      // Russian error visible
      await expect(page.getByText('Минимум 2 символов')).toBeVisible()

      // Switch to English
      await page.getByRole('button', { name: 'English' }).click()

      // Trigger validation again by re-entering
      await nameInput.click()
      await nameInput.fill('')
      await nameInput.fill('b')
      await nameInput.blur()

      // English error visible
      await expect(page.getByText('Minimum 2 characters')).toBeVisible()
    })
  })
})
