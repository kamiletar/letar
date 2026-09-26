import { expect, test } from '@playwright/test'

/**
 * Ключ реестра createForm в схеме (`@meta("form.fieldType", "Select.Category")`): `Form.AutoFields` рисует компонент
 * `DevelopAppForm.Select.Category` — справочник на хуках ZenStack с созданием из поля. Базовый Select из схемы
 * пункта «Добавить…» не имеет, поэтому он и доказывает, что нарисован именно компонент реестра.
 */
test.describe('Registry Key Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registry-key-demo')
    await page.locator('form').waitFor()
  })

  test('поле categoryId — компонент из реестра: есть пункт создания с текстом из form.props', async ({ page }) => {
    const field = page.locator('[data-field-name="categoryId"]')
    await expect(field).toBeVisible()
    await field.click()
    await expect(page.getByRole('option', { name: /Добавить категорию/ })).toBeVisible()
  })

  test('создание категории из поля: выбрана, отправка уходит с настоящим id', async ({ page }) => {
    const name = `Реестр-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))

    const field = page.locator('[data-field-name="categoryId"]')
    await field.click()
    await page.getByRole('option', { name: /Добавить категорию/ }).click()
    await expect(field).toContainText(name)

    await page.getByLabel('Название работы').fill('Кровля')
    await page.getByRole('button', { name: 'Отправить' }).click()
    const preview = page.getByText(/"categoryId"/)
    await expect(preview).toBeVisible()
    await expect(preview).not.toContainText('__letar_pending')
  })
})
