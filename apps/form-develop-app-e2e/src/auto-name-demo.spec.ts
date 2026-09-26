import { expect, test } from '@playwright/test'

/**
 * Автоподбор по имени модели: в схеме у `categoryId` нет `form.fieldType`, но связь `@relation` на `Category`, а в
 * реестре `createForm` есть `Select.Category`. Базовый Select пункта «Добавить…» не имеет, поэтому он и доказывает,
 * что нарисован именно компонент реестра, подобранный по имени.
 */
test.describe('Auto Name Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auto-name-demo')
    await page.locator('form').waitFor()
  })

  test('поле categoryId — компонент из реестра: есть пункт создания без ключа в схеме', async ({ page }) => {
    const field = page.locator('[data-field-name="categoryId"]')
    await expect(field).toBeVisible()
    await field.click()
    await expect(page.getByRole('option', { name: /Добавить/ }).first()).toBeVisible()
  })

  test('в форме два поля: набор не изменился (название + категория)', async ({ page }) => {
    await expect(page.getByLabel('Название работы')).toBeVisible()
    await expect(page.locator('[data-field-name="categoryId"]')).toHaveCount(1)
  })
})
