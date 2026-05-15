import { expect, test } from '@playwright/test'

test.describe('Groups Form', () => {
  test('загружает страницу groups', async ({ page }) => {
    await page.goto('/examples/groups')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('содержит кнопку добавления элемента', async ({ page }) => {
    await page.goto('/examples/groups')
    // Массивная группа должна иметь кнопку добавления
    const addButton = page.getByRole('button', { name: /add|добавить|\+/i })
    await expect(addButton.first()).toBeVisible()
  })

  test('добавляет элемент в массив', async ({ page }) => {
    await page.goto('/examples/groups')
    // Считаем элементы до добавления
    const addButton = page.getByRole('button', { name: /add|добавить|\+/i }).first()
    const inputsBefore = await page.getByRole('textbox').count()
    // Добавляем элемент
    await addButton.click()
    // Должно стать больше полей
    const inputsAfter = await page.getByRole('textbox').count()
    expect(inputsAfter).toBeGreaterThan(inputsBefore)
  })
})
