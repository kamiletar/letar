import { expect, test } from '@playwright/test'

test.describe('Server Errors Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/server-errors-demo')
    await page.locator('h1, h2').first().waitFor()
  })

  test('страница загружается', async ({ page }) => {
    await expect(page.getByText('mapServerErrors()')).toBeVisible()
  })

  test('Prisma P2002 выбран по умолчанию', async ({ page }) => {
    // Результат маппинга должен содержать fieldErrors с email
    await expect(page.getByText('email')).toBeVisible()
    await expect(page.getByText('уже зарегистрирован')).toBeVisible()
  })

  test('переключение на ZenStack policy', async ({ page }) => {
    await page.getByText('ZenStack policy').click()
    await expect(page.getByText('rejected-by-policy')).toBeVisible()
    await expect(page.getByText('Нет доступа')).toBeVisible()
  })

  test('переключение на Zod flatten', async ({ page }) => {
    await page.getByText('Zod flatten').click()
    await expect(page.getByText('Некорректный')).toBeVisible()
    await expect(page.getByText('Пароли не совпадают')).toBeVisible()
  })

  test('переключение на ActionResult', async ({ page }) => {
    await page.getByRole('button', { name: 'ActionResult' }).click()
    await expect(page.getByText('Email уже занят')).toBeVisible()
  })

  test('все типы ошибок переключаются без ошибок', async ({ page }) => {
    const buttons = ['Prisma P2002 (unique)', 'Prisma P2003 (FK)', 'ZenStack policy', 'Zod flatten']
    for (const btn of buttons) {
      await page.getByText(btn, { exact: false }).click()
      // Не должно быть ошибок — страница не падает
      await expect(page.getByText('mapServerErrors()')).toBeVisible()
    }
  })
})
