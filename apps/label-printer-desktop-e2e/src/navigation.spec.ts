import { expect, test } from '@playwright/test'

/**
 * Тесты навигации по приложению Label Printer Desktop
 */
test.describe('Навигация', () => {
  test('главная страница загружается', async ({ page }) => {
    await page.goto('/')
    // Проверяем что главная страница загружена
    await expect(page.locator('text=Сканируйте код')).toBeVisible({ timeout: 10000 })
  })

  test('переход на страницу истории', async ({ page }) => {
    await page.goto('/')
    // Кликаем на ссылку истории в навигации
    await page.click('a[href="/history"]')
    // Проверяем что страница истории загружена
    await expect(page.locator('text=История печати')).toBeVisible()
  })

  test('переход на страницу статистики', async ({ page }) => {
    await page.goto('/')
    // Кликаем на ссылку статистики
    await page.click('a[href="/stats"]')
    // Проверяем что страница статистики загружена
    await expect(page.locator('text=Статистика')).toBeVisible()
  })

  test('переход на страницу настроек', async ({ page }) => {
    await page.goto('/')
    // Кликаем на ссылку настроек
    await page.click('a[href="/settings"]')
    // Проверяем что страница настроек загружена
    await expect(page.locator('text=Настройки')).toBeVisible()
  })

  test('переход на страницу товаров', async ({ page }) => {
    await page.goto('/')
    // Кликаем на ссылку товаров
    await page.click('a[href="/products"]')
    // Проверяем что страница товаров загружена
    await expect(page.locator('text=База товаров')).toBeVisible()
  })
})
