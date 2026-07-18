import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается без ошибок', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBeTruthy()
  })

  test('нет ошибок в консоли браузера', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    await page.goto('/')
    expect(errors).toEqual([])
  })
})
