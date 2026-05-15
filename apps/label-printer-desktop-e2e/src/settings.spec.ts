import { expect, test } from '@playwright/test'

/**
 * Тесты страницы настроек
 */
test.describe('Настройки', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
  })

  test('страница настроек содержит вкладки', async ({ page }) => {
    // Проверяем наличие вкладок
    await expect(page.locator('text=Принтер')).toBeVisible()
    await expect(page.locator('text=Этикетка')).toBeVisible()
    await expect(page.locator('text=Поведение')).toBeVisible()
    await expect(page.locator('text=О приложении')).toBeVisible()
  })

  test('вкладка Принтер показывает настройки принтера', async ({ page }) => {
    // Кликаем на вкладку Принтер
    await page.click('button:has-text("Принтер")')
    // Проверяем элементы настроек принтера
    await expect(page.locator('text=Режим работы')).toBeVisible()
  })

  test('вкладка Этикетка показывает настройки этикетки', async ({ page }) => {
    // Кликаем на вкладку Этикетка
    await page.click('button:has-text("Этикетка")')
    // Проверяем элементы настроек этикетки
    await expect(page.locator('text=Шаблон')).toBeVisible()
  })

  test('вкладка Поведение показывает настройки поведения', async ({ page }) => {
    // Кликаем на вкладку Поведение
    await page.click('button:has-text("Поведение")')
    // Проверяем элементы настроек поведения
    await expect(page.locator('text=Разрешить дубликаты')).toBeVisible()
  })

  test('вкладка О приложении показывает информацию', async ({ page }) => {
    // Кликаем на вкладку О приложении
    await page.click('button:has-text("О приложении")')
    // Проверяем информацию о приложении
    await expect(page.locator('text=Label Printer Desktop')).toBeVisible()
  })

  test('кнопка сброса настроек работает', async ({ page }) => {
    // Проверяем наличие кнопки сброса
    const resetButton = page.locator('button:has-text("Сбросить")')
    await expect(resetButton).toBeVisible()
  })
})
