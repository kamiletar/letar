import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Recipe CRUDL', () => {
  /**
   * Helper to get field by data-field-name attribute
   * Declarative Form components add data-field-name with full path
   * Array indices use dot notation: "components.0.title", NOT "components[0].title"
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  /**
   * Generate unique recipe name for parallel test isolation
   */
  function uniqueName(prefix: string) {
    return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  /**
   * Helper to fill recipe form fields using data-field-name selectors
   */
  async function fillRecipeForm(
    page: Page,
    data: {
      title: string
      portions: number
      componentTitle?: string
      componentWeight?: number
    }
  ) {
    // Fill title field
    await getField(page, 'title').fill(data.title)

    // Fill portions field
    await getField(page, 'portions').fill(String(data.portions))

    // Fill first component if provided
    // Note: paths use dots for array indices (components.0.title), not brackets
    if (data.componentTitle !== undefined) {
      await getField(page, 'components.0.title').fill(data.componentTitle)
    }

    if (data.componentWeight !== undefined) {
      await getField(page, 'components.0.weightGrams').fill(String(data.componentWeight))
    }
  }

  test('should create a new recipe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')
    const recipeName = uniqueName('Create Test')

    // Navigate to create page
    await page.goto('/recipes/new')

    // Wait for form to load
    await page.locator('form').waitFor()

    // Fill in the form using helper
    await fillRecipeForm(page, {
      title: recipeName,
      portions: 4,
      componentTitle: 'Test Ingredient',
      componentWeight: 100,
    })

    // Submit the form
    await page.getByRole('button', { name: 'Submit' }).click()

    // Should redirect to recipes list
    await page.waitForURL('/recipes')

    // Verify recipe appears in list
    await expect(page.locator(`text=${recipeName}`)).toBeVisible()
  })

  test('should edit an existing recipe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')
    const originalName = uniqueName('Edit Test')
    const updatedName = uniqueName('Updated')

    // First, create a recipe to edit
    await page.goto('/recipes/new')
    await page.locator('form').waitFor()

    await fillRecipeForm(page, {
      title: originalName,
      portions: 2,
      componentTitle: 'Ingredient',
      componentWeight: 50,
    })

    // Submit to create
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForURL('/recipes')

    // Click edit on the created recipe
    // Wait for recipe to appear in list
    await expect(page.getByRole('heading', { name: originalName })).toBeVisible()
    // Find the edit link that follows this heading (they're in the same card row)
    await page
      .getByRole('heading', { name: originalName })
      .locator('xpath=ancestor::div[contains(@class, "chakra-card")]//a[contains(text(), "Редактировать")]')
      .click()

    // Wait for edit form to load and data to populate
    await page.locator('form').waitFor()
    const titleField = getField(page, 'title')
    await expect(titleField).toHaveValue(originalName)

    // Update the title
    await titleField.clear()
    await titleField.fill(updatedName)

    // Submit the update
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForURL('/recipes')

    // Verify updated recipe appears in list
    await expect(page.locator(`text=${updatedName}`)).toBeVisible()
  })

  test('should delete a recipe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')
    const recipeName = uniqueName('Delete Test')

    // First, create a recipe to delete
    await page.goto('/recipes/new')
    await page.locator('form').waitFor()

    await fillRecipeForm(page, {
      title: recipeName,
      portions: 1,
      componentTitle: 'Ingredient',
      componentWeight: 50,
    })

    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForURL('/recipes')

    // Confirm recipe exists
    await expect(page.locator(`text=${recipeName}`)).toBeVisible()

    // Handle confirm dialog
    page.on('dialog', (dialog) => dialog.accept())

    // Click delete button
    // Find the card containing recipe name and click its delete button
    await page
      .getByRole('heading', { name: recipeName })
      .locator('xpath=ancestor::div[contains(@class, "chakra-card")]//button[contains(text(), "Удалить")]')
      .click()

    // Wait for deletion by checking element is hidden
    await expect(page.locator(`text=${recipeName}`)).toBeHidden()
  })

  test('should add and remove components', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')
    const recipeName = uniqueName('Components Test')

    await page.goto('/recipes/new')
    await page.locator('form').waitFor()

    // Fill basic info and first component
    await fillRecipeForm(page, {
      title: recipeName,
      portions: 4,
      componentTitle: 'Ingredient 1',
      componentWeight: 100,
    })

    // Add second component (click first + button - components section)
    // There are 2 "Add item" buttons: one for components, one for tags
    await page.getByRole('button', { name: 'Add item' }).first().click()

    // Fill second component
    await getField(page, 'components.1.title').fill('Ingredient 2')
    await getField(page, 'components.1.weightGrams').fill('200')

    // Add third component
    await page.getByRole('button', { name: 'Add item' }).first().click()
    await getField(page, 'components.2.title').fill('Ingredient 3')
    await getField(page, 'components.2.weightGrams').fill('300')

    // Remove second component (index 1)
    const removeButtons = page.getByRole('button', { name: 'Remove item' })
    await removeButtons.nth(1).click()

    // Submit
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForURL('/recipes')

    // Verify recipe was created
    await expect(page.locator(`text=${recipeName}`)).toBeVisible()
  })
})
