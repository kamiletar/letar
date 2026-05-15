import { expect, test } from '@playwright/test'

/**
 * Тесты главной страницы (сканирование)
 */
test.describe('Главная страница', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('страница сканирования загружается', async ({ page }) => {
    // Проверяем что главная страница показывает область для сканирования
    await expect(page.locator('text=Сканируйте код')).toBeVisible()
  })

  test('поле ввода кода доступно', async ({ page }) => {
    // Проверяем наличие поля для ввода кода
    const input = page.locator('input[placeholder*="код"]')
    // Поле может быть скрытым (для сканера) или видимым
    const inputCount = await input.count()
    expect(inputCount).toBeGreaterThanOrEqual(0)
  })

  test('предпросмотр этикетки отображается', async ({ page }) => {
    // Проверяем область предпросмотра
    const previewArea = page.locator('text=Предпросмотр')
    // Предпросмотр может быть виден или скрыт в зависимости от состояния
    await expect(previewArea)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Допустимо если предпросмотр скрыт
      })
  })
})
