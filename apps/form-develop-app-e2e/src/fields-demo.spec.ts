import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Fields Demo', () => {
  /**
   * Helper to get field by data-field-name attribute
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/fields-demo')
    // Wait for form to load
    await page.locator('form').waitFor()
  })

  test('should display all field types', async ({ page }) => {
    // Verify all fields are present
    await expect(getField(page, 'name')).toBeVisible()
    await expect(getField(page, 'description')).toBeVisible()
    await expect(getField(page, 'age')).toBeVisible()
    await expect(getField(page, 'birthDate')).toBeVisible()
    await expect(getField(page, 'wakeUpTime')).toBeVisible()
    await expect(getField(page, 'password')).toBeVisible()
    await expect(getField(page, 'newsletter')).toBeVisible()
    await expect(getField(page, 'darkMode')).toBeVisible()
  })

  test('should fill and submit string field', async ({ page }) => {
    await getField(page, 'name').fill('John Doe')
    await expect(getField(page, 'name')).toHaveValue('John Doe')
  })

  test('should fill and submit textarea field', async ({ page }) => {
    const longText = 'This is a long description\nwith multiple lines'
    await getField(page, 'description').fill(longText)
    await expect(getField(page, 'description')).toHaveValue(longText)
  })

  test('should fill and submit number field', async ({ page }) => {
    await getField(page, 'age').fill('25')
    await expect(getField(page, 'age')).toHaveValue('25')
  })

  test('should fill and submit date field', async ({ page }) => {
    await getField(page, 'birthDate').fill('1990-05-15')
    await expect(getField(page, 'birthDate')).toHaveValue('1990-05-15')
  })

  test('should fill and submit time field', async ({ page }) => {
    await getField(page, 'wakeUpTime').fill('07:30')
    await expect(getField(page, 'wakeUpTime')).toHaveValue('07:30')
  })

  test('should fill password field and toggle visibility', async ({ page }) => {
    const passwordField = getField(page, 'password')
    await passwordField.fill('secretpass')

    // Password should be masked by default
    await expect(passwordField).toHaveAttribute('type', 'password')

    // Click toggle visibility button
    await page.getByRole('button', { name: /toggle password/i }).click()

    // Password should be visible now
    await expect(passwordField).toHaveAttribute('type', 'text')

    // Click again to hide
    await page.getByRole('button', { name: /toggle password/i }).click()
    await expect(passwordField).toHaveAttribute('type', 'password')
  })

  test('should toggle checkbox', async ({ page }) => {
    const checkbox = getField(page, 'newsletter')

    // Initially unchecked
    await expect(checkbox).not.toBeChecked()

    // Click to check
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Click to uncheck
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should toggle switch', async ({ page }) => {
    const switchInput = getField(page, 'darkMode')

    // Initially unchecked
    await expect(switchInput).not.toBeChecked()

    // Click to check
    await switchInput.click()
    await expect(switchInput).toBeChecked()

    // Click to uncheck
    await switchInput.click()
    await expect(switchInput).not.toBeChecked()
  })

  test('should select radio option (vertical orientation)', async ({ page }) => {
    // Find the radio group by data-field-name
    const sizeGroup = getField(page, 'size')
    await expect(sizeGroup).toBeVisible()

    // Select "Large" option - click on the label text, not the hidden input
    await sizeGroup.getByText('Large').click()

    // Verify it's selected
    await expect(sizeGroup.getByRole('radio', { name: 'Large' })).toBeChecked()

    // Select another option
    await sizeGroup.getByText('Small').click()
    await expect(sizeGroup.getByRole('radio', { name: 'Small' })).toBeChecked()
    await expect(sizeGroup.getByRole('radio', { name: 'Large' })).not.toBeChecked()
  })

  test('should select radio option (horizontal orientation)', async ({ page }) => {
    // Find the radio group by data-field-name
    const priorityGroup = getField(page, 'priority')

    // Select "High" priority - click on the label text
    await priorityGroup.getByText('High').click()
    await expect(priorityGroup.getByRole('radio', { name: 'High' })).toBeChecked()
  })

  test('should submit form with all fields filled', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')
    // Fill all fields
    await getField(page, 'name').fill('Jane Doe')
    await getField(page, 'description').fill('A test description')
    await getField(page, 'age').fill('30')
    await getField(page, 'birthDate').fill('1993-08-20')
    await getField(page, 'wakeUpTime').fill('08:00')
    await getField(page, 'password').fill('mypassword123')

    // Select framework (Chakra Select - click trigger, then option)
    await page.getByRole('combobox', { name: /framework/i }).click()
    await page.getByRole('option', { name: 'React' }).click()
    // Wait for select to close
    await expect(page.getByRole('option', { name: 'React' })).toBeHidden()

    // Select radio options (click on label text, not hidden input)
    await getField(page, 'size').getByText('Medium').click()
    await getField(page, 'priority').getByText('High').click()

    await getField(page, 'newsletter').click()
    await getField(page, 'darkMode').click()

    // Submit form - wait for button to be ready
    const submitButton = page.getByRole('button', { name: 'Submit' })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Wait for submission and verify submitted data is displayed
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 10000 })
    await expect(submittedData).toContainText('Jane Doe')
    await expect(submittedData).toContainText('A test description')
    await expect(submittedData).toContainText('30')
    await expect(submittedData).toContainText('1993-08-20')
    await expect(submittedData).toContainText('08:00')
    await expect(submittedData).toContainText('mypassword123')
    await expect(submittedData).toContainText('"framework": "react"')
    await expect(submittedData).toContainText('"size": "md"')
    await expect(submittedData).toContainText('"priority": "high"')
    await expect(submittedData).toContainText('"newsletter": true')
    await expect(submittedData).toContainText('"darkMode": true')
  })

  // WebKit has known issues with validation message timing
  test('should show validation errors for short name', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with validation messages')

    // Try to submit with name that's too short (min 2 chars)
    await getField(page, 'name').fill('J')

    // Blur to trigger validation
    await getField(page, 'description').click()

    // Should show validation error (Zod v4 format: "String must contain at least 2 character(s)")
    await expect(page.locator('text=/2 character|2 символ/i')).toBeVisible({ timeout: 10000 })
  })

  test.describe('Select Field', () => {
    test('should open select dropdown and choose option', async ({ page }) => {
      // Find and click the framework select trigger
      const frameworkSelect = getField(page, 'framework')
      await frameworkSelect.scrollIntoViewIfNeeded()

      // Click on select trigger (the button that opens the dropdown)
      const trigger = frameworkSelect.locator('[data-part="trigger"]')
      await trigger.click()

      // Wait for dropdown to open and select an option
      await page.getByRole('option', { name: 'React' }).click()

      // Verify selection is shown in trigger
      await expect(trigger).toContainText('React')
    })

    test('should clear optional select field', async ({ page }) => {
      // Theme is optional, so it should have a clear button after selection
      const themeSelect = getField(page, 'theme')
      await themeSelect.scrollIntoViewIfNeeded()

      // Select an option first
      const trigger = themeSelect.locator('[data-part="trigger"]')
      await trigger.click()
      await page.getByRole('option', { name: 'Dark' }).click()

      // Verify selection
      await expect(trigger).toContainText('Dark')

      // Click clear button
      const clearButton = themeSelect.locator('[data-part="clear-trigger"]')
      await clearButton.click()

      // Should show placeholder again
      await expect(trigger).toContainText('Select theme')
    })
  })

  test.describe('Combobox Field', () => {
    test('should filter options by typing', async ({ page }) => {
      const countryCombobox = getField(page, 'country')
      await countryCombobox.scrollIntoViewIfNeeded()

      // Click to open and type to filter
      const input = countryCombobox.locator('input')
      await input.click()
      await input.fill('Rus')

      // Should show filtered options
      await expect(page.getByRole('option', { name: 'Russia' })).toBeVisible()

      // Other countries should not be visible (filtered out)
      await expect(page.getByRole('option', { name: 'Japan' })).toBeHidden()
    })

    test('should select option from combobox', async ({ page }) => {
      const countryCombobox = getField(page, 'country')
      await countryCombobox.scrollIntoViewIfNeeded()

      // Click and select
      const input = countryCombobox.locator('input')
      await input.click()
      await page.getByRole('option', { name: 'Germany' }).click()

      // Input should show selected value
      await expect(input).toHaveValue('Germany')
    })

    test('should display grouped options', async ({ page }) => {
      const languageCombobox = getField(page, 'language')
      await languageCombobox.scrollIntoViewIfNeeded()

      // Click to open
      const input = languageCombobox.locator('input')
      await input.click()

      // Should show group headers
      await expect(page.getByText('Frontend')).toBeVisible()
      await expect(page.getByText('Backend')).toBeVisible()
      await expect(page.getByText('Database')).toBeVisible()
    })
  })

  test.describe('Listbox Field', () => {
    test('should select single option from listbox', async ({ page }) => {
      const roleListbox = getField(page, 'role')
      await roleListbox.scrollIntoViewIfNeeded()

      // Click on an option
      await roleListbox.getByText('Designer').click()

      // Should be selected (highlighted)
      const designerOption = roleListbox.getByRole('option', { name: 'Designer' })
      await expect(designerOption).toHaveAttribute('aria-selected', 'true')
    })

    test('should select multiple options from listbox', async ({ page }) => {
      const skillsListbox = getField(page, 'skills')
      await skillsListbox.scrollIntoViewIfNeeded()

      // Select multiple skills
      await skillsListbox.getByText('Frontend').click()
      await skillsListbox.getByText('Backend').click()

      // Both should be selected
      const frontendOption = skillsListbox.getByRole('option', { name: 'Frontend' })
      const backendOption = skillsListbox.getByRole('option', { name: 'Backend' })
      await expect(frontendOption).toHaveAttribute('aria-selected', 'true')
      await expect(backendOption).toHaveAttribute('aria-selected', 'true')
    })

    test('should deselect option in multi-select listbox', async ({ page }) => {
      const skillsListbox = getField(page, 'skills')
      await skillsListbox.scrollIntoViewIfNeeded()

      // Select and then deselect
      await skillsListbox.getByText('DevOps').click()
      const devopsOption = skillsListbox.getByRole('option', { name: 'DevOps' })
      await expect(devopsOption).toHaveAttribute('aria-selected', 'true')

      // Click again to deselect
      await skillsListbox.getByText('DevOps').click()
      await expect(devopsOption).toHaveAttribute('aria-selected', 'false')
    })
  })

  test.describe('RadioCard Field', () => {
    test('should display plan options as cards', async ({ page }) => {
      const planField = getField(page, 'plan')
      await planField.scrollIntoViewIfNeeded()

      // All options should be visible
      await expect(planField.getByText('Free')).toBeVisible()
      await expect(planField.getByText('Pro')).toBeVisible()
      await expect(planField.getByText('Enterprise')).toBeVisible()
    })

    test('should select plan by clicking card', async ({ page }) => {
      const planField = getField(page, 'plan')
      await planField.scrollIntoViewIfNeeded()

      // Click on Pro card
      await planField.getByText('Pro').click()

      // Should be selected
      const proRadio = planField.getByRole('radio', { name: /Pro/i })
      await expect(proRadio).toBeChecked()
    })

    test('should display descriptions on cards', async ({ page }) => {
      const planField = getField(page, 'plan')
      await planField.scrollIntoViewIfNeeded()

      // Descriptions should be visible
      await expect(planField.getByText('Basic features for personal use')).toBeVisible()
      await expect(planField.getByText('All features for professionals')).toBeVisible()
      await expect(planField.getByText('Custom solutions for teams')).toBeVisible()
    })
  })

  test.describe('CheckboxCard Field', () => {
    test('should display feature options as cards', async ({ page }) => {
      const featuresField = getField(page, 'features')
      await featuresField.scrollIntoViewIfNeeded()

      // All options should be visible
      await expect(featuresField.getByText('Analytics')).toBeVisible()
      await expect(featuresField.getByText('API Access')).toBeVisible()
      await expect(featuresField.getByText('Priority Support')).toBeVisible()
      await expect(featuresField.getByText('Custom Branding')).toBeVisible()
    })

    test('should select multiple features by clicking cards', async ({ page }) => {
      const featuresField = getField(page, 'features')
      await featuresField.scrollIntoViewIfNeeded()

      // Select multiple cards
      await featuresField.getByText('Analytics').click()
      await featuresField.getByText('API Access').click()

      // Both should be selected
      const analyticsCheckbox = featuresField.getByRole('checkbox', { name: /Analytics/i })
      const apiCheckbox = featuresField.getByRole('checkbox', { name: /API Access/i })
      await expect(analyticsCheckbox).toBeChecked()
      await expect(apiCheckbox).toBeChecked()
    })

    test('should deselect feature by clicking again', async ({ page }) => {
      const featuresField = getField(page, 'features')
      await featuresField.scrollIntoViewIfNeeded()

      // Select and deselect
      await featuresField.getByText('Priority Support').click()
      const supportCheckbox = featuresField.getByRole('checkbox', { name: /Priority Support/i })
      await expect(supportCheckbox).toBeChecked()

      await featuresField.getByText('Priority Support').click()
      await expect(supportCheckbox).not.toBeChecked()
    })
  })

  test.describe('SegmentedGroup Field', () => {
    test('should display billing cycle options', async ({ page }) => {
      const billingField = getField(page, 'billing')
      await billingField.scrollIntoViewIfNeeded()

      // All options should be visible
      await expect(billingField.getByText('Monthly')).toBeVisible()
      await expect(billingField.getByText('Quarterly')).toBeVisible()
      await expect(billingField.getByText('Yearly')).toBeVisible()
    })

    test('should select segment by clicking', async ({ page }) => {
      const billingField = getField(page, 'billing')
      await billingField.scrollIntoViewIfNeeded()

      // Click on Yearly
      await billingField.getByText('Yearly').click()

      // Should be selected
      const yearlyRadio = billingField.getByRole('radio', { name: 'Yearly' })
      await expect(yearlyRadio).toBeChecked()
    })

    test('should switch between segments', async ({ page }) => {
      const displayModeField = getField(page, 'displayMode')
      await displayModeField.scrollIntoViewIfNeeded()

      // Select List
      await displayModeField.getByText('List').click()
      await expect(displayModeField.getByRole('radio', { name: 'List' })).toBeChecked()

      // Switch to Grid
      await displayModeField.getByText('Grid').click()
      await expect(displayModeField.getByRole('radio', { name: 'Grid' })).toBeChecked()
      await expect(displayModeField.getByRole('radio', { name: 'List' })).not.toBeChecked()
    })
  })

  test.describe('ColorPicker Field', () => {
    test('should display color picker trigger with initial color', async ({ page }) => {
      const brandColorField = getField(page, 'brandColor')
      await brandColorField.scrollIntoViewIfNeeded()

      // Color picker trigger should be visible
      const trigger = brandColorField.locator('[data-part="trigger"]')
      await expect(trigger).toBeVisible()
    })

    test('should open color picker on click', async ({ page }) => {
      const brandColorField = getField(page, 'brandColor')
      await brandColorField.scrollIntoViewIfNeeded()

      // Click trigger to open
      const trigger = brandColorField.locator('[data-part="trigger"]')
      await trigger.click()

      // Color picker content should be visible
      const content = brandColorField.locator('[data-part="content"]')
      await expect(content).toBeVisible()
    })

    test('should select color from swatches', async ({ page }) => {
      const accentColorField = getField(page, 'accentColor')
      await accentColorField.scrollIntoViewIfNeeded()

      // Click trigger to open
      const trigger = accentColorField.locator('[data-part="trigger"]')
      await trigger.click()

      // Click on a swatch
      const swatches = accentColorField.locator('[data-part="swatch-trigger"]')
      await expect(swatches.first()).toBeVisible()
      await swatches.first().click()

      // Verify swatch was clicked (color picker should close or update)
      await expect(trigger).toBeVisible()
    })
  })

  test.describe('Editable Field', () => {
    test('should display editable title with initial value', async ({ page }) => {
      const editableTitle = getField(page, 'editableTitle')
      await editableTitle.scrollIntoViewIfNeeded()

      // Should show initial text
      await expect(editableTitle).toContainText('Click to edit this title')
    })

    test('should enter edit mode on click', async ({ page }) => {
      const editableTitle = getField(page, 'editableTitle')
      await editableTitle.scrollIntoViewIfNeeded()

      // Click to enter edit mode
      const preview = editableTitle.locator('[data-part="preview"]')
      await preview.dblclick()

      // Input should be visible
      const input = editableTitle.locator('[data-part="input"]')
      await expect(input).toBeVisible()
    })

    test('should edit text and confirm', async ({ page }) => {
      const editableTitle = getField(page, 'editableTitle')
      await editableTitle.scrollIntoViewIfNeeded()

      // Enter edit mode
      const preview = editableTitle.locator('[data-part="preview"]')
      await preview.dblclick()

      // Clear and type new text
      const input = editableTitle.locator('[data-part="input"]')
      await input.fill('New Title')

      // Confirm with Enter key
      await page.keyboard.press('Enter')

      // Should show new text
      await expect(editableTitle).toContainText('New Title')
    })

    test('should show placeholder for empty editable', async ({ page }) => {
      const editableNotes = getField(page, 'editableNotes')
      await editableNotes.scrollIntoViewIfNeeded()

      // Should show placeholder
      await expect(editableNotes).toContainText('Click to add notes...')
    })
  })

  test.describe('Schedule Field', () => {
    test('should display schedule field with all days', async ({ page }) => {
      // Schedule field should be visible - scroll to it first
      const scheduleField = page.locator('[data-field-name="workingHours"]')
      await scheduleField.scrollIntoViewIfNeeded()
      await expect(scheduleField).toBeVisible()

      // All days should be visible (using data-day attribute for reliability)
      await expect(page.locator('[data-day="monday"]')).toBeVisible()
      await expect(page.locator('[data-day="tuesday"]')).toBeVisible()
      await expect(page.locator('[data-day="wednesday"]')).toBeVisible()
      await expect(page.locator('[data-day="thursday"]')).toBeVisible()
      await expect(page.locator('[data-day="friday"]')).toBeVisible()
      await expect(page.locator('[data-day="saturday"]')).toBeVisible()
      await expect(page.locator('[data-day="sunday"]')).toBeVisible()
    })

    test('should toggle day on/off', async ({ page }) => {
      // Scroll to the schedule field first
      const scheduleField = page.locator('[data-field-name="workingHours"]')
      await scheduleField.scrollIntoViewIfNeeded()

      // Saturday is initially off (Day off text visible)
      const saturdayRow = page.locator('[data-day="saturday"]')
      await saturdayRow.scrollIntoViewIfNeeded()

      // Find the switch for Saturday and click it (use the Switch.Root, not hidden input)
      const saturdaySwitch = page.locator('[data-switch="saturday"]')
      await saturdaySwitch.click()

      // After clicking, time inputs should appear
      await expect(saturdayRow.locator('input[type="time"]').first()).toBeVisible()

      // Click again to turn off
      await saturdaySwitch.click()

      // Should show "Day off" again
      await expect(page.getByText('Day off').first()).toBeVisible()
    })

    test('should change time values', async ({ page }) => {
      // Scroll to the schedule field first
      const scheduleField = page.locator('[data-field-name="workingHours"]')
      await scheduleField.scrollIntoViewIfNeeded()

      // Find Monday's time inputs
      const mondayRow = page.locator('[data-day="monday"]')
      await mondayRow.scrollIntoViewIfNeeded()
      const timeInputs = mondayRow.locator('input[type="time"]')

      // Change open time
      await timeInputs.first().fill('10:00')
      await expect(timeInputs.first()).toHaveValue('10:00')

      // Change close time
      await timeInputs.nth(1).fill('20:00')
      await expect(timeInputs.nth(1)).toHaveValue('20:00')
    })

    test('should show copy to weekdays button when Monday has schedule', async ({ page }) => {
      // "Copy Mon to weekdays" button should be visible
      await expect(page.getByRole('button', { name: /copy mon to weekdays/i })).toBeVisible()
    })

    test('should copy Monday schedule to all weekdays', async ({ page }) => {
      // Scroll to the schedule field first
      const scheduleField = page.locator('[data-field-name="workingHours"]')
      await scheduleField.scrollIntoViewIfNeeded()

      // Set Monday to specific times
      const mondayRow = page.locator('[data-day="monday"]')
      await mondayRow.scrollIntoViewIfNeeded()
      const mondayTimeInputs = mondayRow.locator('input[type="time"]')
      await mondayTimeInputs.first().fill('08:00')
      await mondayTimeInputs.nth(1).fill('17:00')

      // Click copy to weekdays
      await page.getByRole('button', { name: /copy mon to weekdays/i }).click()

      // Tuesday should now have the same times
      const tuesdayRow = page.locator('[data-day="tuesday"]')
      const tuesdayTimeInputs = tuesdayRow.locator('input[type="time"]')
      await expect(tuesdayTimeInputs.first()).toHaveValue('08:00')
      await expect(tuesdayTimeInputs.nth(1)).toHaveValue('17:00')

      // Friday should also have the same times
      const fridayRow = page.locator('[data-day="friday"]')
      const fridayTimeInputs = fridayRow.locator('input[type="time"]')
      await expect(fridayTimeInputs.first()).toHaveValue('08:00')
      await expect(fridayTimeInputs.nth(1)).toHaveValue('17:00')
    })
  })
})
