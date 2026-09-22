import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Form.Steps Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/steps-demo')
    // Wait for forms to load (страница рендерит две формы: Linear и Non-linear)
    await page.locator('form').first().waitFor()
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Form.Steps Demo' })).toBeVisible()
    await expect(page.getByText('Multi-step form with validation on each step')).toBeVisible()
  })

  test.describe('Linear Steps Form', () => {
    test('should display step indicator', async ({ page }) => {
      // Step indicator should show all three steps
      await expect(page.getByText('Personal').first()).toBeVisible()
      await expect(page.getByText('Contact').first()).toBeVisible()
      await expect(page.getByText('Account').first()).toBeVisible()
    })

    test('should show first step content by default', async ({ page }) => {
      // First step heading
      await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible()

      // First step fields should be visible
      await expect(getField(page, 'firstName')).toBeVisible()
      await expect(getField(page, 'lastName')).toBeVisible()
      await expect(getField(page, 'birthDate')).toBeVisible()

      // Other step fields should NOT be visible
      await expect(getField(page, 'email')).toBeHidden()
      await expect(getField(page, 'username')).toBeHidden()
    })

    test('should display navigation buttons', async ({ page }) => {
      // Обе формы на странице используют дефолтную подпись "Back" — сужаем до Linear-формы
      // (первая на странице), иначе strict mode violation Playwright
      const linearForm = page.locator('form').first()

      // Back button should be disabled on first step
      const backButton = linearForm.getByRole('button', { name: 'Back' })
      await expect(backButton).toBeDisabled()

      // Continue button should be visible
      await expect(linearForm.getByRole('button', { name: 'Continue' })).toBeVisible()
    })

    test('should show validation error when trying to proceed with empty fields', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with validation')

      // Try to click Continue without filling required fields
      await page.getByRole('button', { name: 'Continue' }).click()

      // Should show validation error (firstName is required with min 2 chars). lastName пустой
      // тоже, даёт ту же самую ошибку — сужаем до группы "First Name", иначе несколько совпадений
      const firstNameGroup = page.getByRole('group').filter({ hasText: 'First Name' })
      await expect(firstNameGroup.getByText(/2 character|required/i)).toBeVisible({ timeout: 10000 })
    })

    test('should proceed to next step after filling required fields', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with step transitions')

      // Fill required fields
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')

      // Click Continue
      await page.getByRole('button', { name: 'Continue' }).click()

      // Should show step 2 content
      await expect(page.getByRole('heading', { name: 'Contact Information' })).toBeVisible()
      await expect(getField(page, 'email')).toBeVisible()

      // Step 1 fields should not be visible
      await expect(getField(page, 'firstName')).toBeHidden()
    })

    test('should navigate back to previous step', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with step transitions')

      // Обе формы используют дефолтную подпись "Back" — сужаем до Linear-формы
      const linearForm = page.locator('form').first()

      // Fill step 1 and proceed
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Wait for step 2
      await expect(getField(page, 'email')).toBeVisible()

      // Click Back
      await linearForm.getByRole('button', { name: 'Back' }).click()

      // Should be back on step 1
      await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible()
      await expect(getField(page, 'firstName')).toBeVisible()

      // Previously filled values should be preserved
      await expect(getField(page, 'firstName')).toHaveValue('John')
    })

    test('should complete all steps and show completion content', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with step transitions')

      // Step 1: Personal info
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Step 2: Contact info
      await expect(getField(page, 'email')).toBeVisible()
      await getField(page, 'email').fill('john@example.com')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Step 3: Account settings
      await expect(getField(page, 'username')).toBeVisible()
      await getField(page, 'username').fill('johndoe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Should show completion content
      await expect(page.getByRole('heading', { name: 'All steps complete!' })).toBeVisible()
      await expect(page.getByText('Review your information and click Submit')).toBeVisible()
    })

    test('should submit form after completing all steps', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

      // Complete all steps
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')
      await page.getByRole('button', { name: 'Continue' }).click()

      await getField(page, 'email').fill('john@example.com')
      await page.getByRole('button', { name: 'Continue' }).click()

      await getField(page, 'username').fill('johndoe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Wait for completion and submit
      await expect(page.getByRole('heading', { name: 'All steps complete!' })).toBeVisible()

      // Handle the alert dialog for submission
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Registration complete!')
        await dialog.accept()
      })

      // Click submit button
      await page.getByRole('button', { name: 'Create Account' }).click()
    })

    test('should validate email format on step 2', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with validation')

      // Complete step 1
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Enter invalid email
      await getField(page, 'email').fill('invalid-email')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Should show validation error. text=/invalid email|email/i матчил ещё и лейбл "Email*" —
      // сужаем до точного текста ошибки (по образцу коммита e478ee62e в file-upload-demo)
      await expect(page.getByText('Invalid email')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Non-linear Steps Form', () => {
    test('should display non-linear form heading', async ({ page }) => {
      // Заголовок страницы — "Non-linear Steps (with animation)", не "(clickable)": контент
      // разъехался с тестом при добавлении опции animated (v0.7.0+), обнаружено этим прогоном
      await expect(page.getByRole('heading', { name: 'Non-linear Steps (with animation)' })).toBeVisible()
      await expect(page.getByText('Click on any step to navigate directly')).toBeVisible()
    })

    test('should allow clicking on any step indicator', async ({ page }) => {
      // Find the non-linear form (second Card on the page)
      const nonLinearForm = page.locator('form').nth(1)

      // Initially on step 1
      await expect(nonLinearForm.getByLabel('Step 1 Field')).toBeVisible()

      // Click on Step 3 in the indicator
      // The step indicators are clickable in non-linear mode
      const step3Trigger = nonLinearForm.locator('[data-part="trigger"]').nth(2)
      await step3Trigger.click()

      // Should navigate to step 3
      await expect(nonLinearForm.getByLabel('Step 3 Field')).toBeVisible()
    })

    test('should preserve data when navigating between steps', async ({ page }) => {
      const nonLinearForm = page.locator('form').nth(1)

      // Fill step 1
      const step1Field = nonLinearForm.locator('[data-field-name="step1Field"]')
      await step1Field.fill('Step 1 data')

      // Navigate to step 2 via indicator
      const step2Trigger = nonLinearForm.locator('[data-part="trigger"]').nth(1)
      await step2Trigger.click()

      // Fill step 2
      const step2Field = nonLinearForm.locator('[data-field-name="step2Field"]')
      await expect(step2Field).toBeVisible()
      await step2Field.fill('Step 2 data')

      // Go back to step 1
      const step1Trigger = nonLinearForm.locator('[data-part="trigger"]').nth(0)
      await step1Trigger.click()

      // Data should be preserved
      await expect(step1Field).toHaveValue('Step 1 data')
    })
  })

  test.describe('Step Indicator States', () => {
    test('should mark completed steps', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit has timing issues with step transitions')

      // Complete step 1
      await getField(page, 'firstName').fill('John')
      await getField(page, 'lastName').fill('Doe')
      await page.getByRole('button', { name: 'Continue' }).click()

      // Wait for step 2
      await expect(getField(page, 'email')).toBeVisible()

      // First step should be marked as complete. @zag-js/steps кодирует это отдельным булевым
      // атрибутом data-complete (пусто = true), а не значением "complete" в data-state — тот
      // хранит только "open"/"closed" текущей панели (steps.connect.mjs, getTriggerProps).
      //
      // ⚠️ Раньше здесь стоял комментарий про якобы «залипающий» [data-part="trigger"] — расследование
      // #1922 (2026-09-22) показало, что реального бага в Chakra/zag-js нет: линейная форма на этой
      // странице рендерится с `linear` (isClickable=false в FormStepsIndicator), поэтому
      // `Steps.Trigger` для неё вообще не монтируется — на странице ЕСТЬ [data-part="trigger"],
      // но ТОЛЬКО у второй, non-linear формы. Документ-wide локатор [data-part="trigger"] без
      // scope на форму молча матчил чужой (нетронутый) виджет — классический паттерн из
      // e2e-testing.md «unscoped-ассерты матчат чужой виджет». Используем [data-part="indicator"]
      // не как обходной путь бага, а потому что это единственный part, который вообще существует
      // в линейной форме.
      const firstStepIndicator = page.locator('[data-part="indicator"]').first()
      await expect(firstStepIndicator).toHaveAttribute('data-complete', '')
    })

    test('should show current step as active', async ({ page }) => {
      // First step should be active/current — тот же механизм: текущий шаг помечен булевым
      // атрибутом data-current, не значением "active" в data-state. Используем
      // [data-part="indicator"] — см. комментарий в предыдущем тесте про причину.
      const firstStepIndicator = page.locator('[data-part="indicator"]').first()
      await expect(firstStepIndicator).toHaveAttribute('data-current', '')
    })
  })
})
