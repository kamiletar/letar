import { expect, test } from '@playwright/test'

test.describe('Basic Form', () => {
  test('загружает страницу basic', async ({ page }) => {
    await page.goto('/examples/basic')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('рендерит форму с полями', async ({ page }) => {
    await page.goto('/examples/basic')
    // Форма должна содержать текстовое поле
    await expect(page.getByRole('textbox').first()).toBeVisible()
    // И кнопку submit
    await expect(page.getByRole('button', { name: /save|submit|сохранить|отправить/i })).toBeVisible()
  })

  test('заполняет и отправляет форму', async ({ page }) => {
    await page.goto('/examples/basic')
    // Заполняем первое текстовое поле
    const input = page.getByRole('textbox').first()
    await input.fill('Тестовое значение')
    // Нажимаем submit
    await page.getByRole('button', { name: /save|submit|сохранить|отправить/i }).click()
  })
})
