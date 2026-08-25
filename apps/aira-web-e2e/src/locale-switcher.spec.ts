import { expect, test } from '@playwright/test'

test('переключатель языка не роняет страницу при повторном выборе текущей локали', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.goto('/ru')

  const trigger = page.getByRole('button', { name: 'Change language' })
  await trigger.click()
  await page.getByRole('option', { name: 'Русский' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('переключатель языка переключает локаль без ошибок React-контекста', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.goto('/ru')

  const trigger = page.getByRole('button', { name: 'Change language' })
  await trigger.click()
  await page.getByRole('option', { name: 'English' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak freely')

  await trigger.click()
  await page.getByRole('option', { name: 'Русский' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Общайся свободно')
  expect(pageErrors).toEqual([])
})
