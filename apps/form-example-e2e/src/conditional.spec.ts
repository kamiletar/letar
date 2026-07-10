import { expect, test } from '@playwright/test'

test.describe('Conditional Form', () => {
  test('загружает страницу conditional', async ({ page }) => {
    await page.goto('/examples/conditional')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('содержит элементы формы', async ({ page }) => {
    await page.goto('/examples/conditional')
    // Форма должна содержать элементы управления
    const inputs = page.getByRole('textbox')
    const radios = page.getByRole('radio')
    const selects = page.getByRole('combobox')
    // Хотя бы один тип элемента должен быть на странице
    const count = (await inputs.count()) + (await radios.count()) + (await selects.count())
    expect(count).toBeGreaterThan(0)
  })
})
