import { expect, test } from '@playwright/test'

/**
 * Тесты страницы статистики
 */
test.describe('Статистика', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stats')
  })

  test('страница статистики показывает метрики', async ({ page }) => {
    // Проверяем наличие карточек метрик
    await expect(page.locator('text=Всего напечатано')).toBeVisible()
    await expect(page.locator('text=Сегодня')).toBeVisible()
    await expect(page.locator('text=Дубликаты')).toBeVisible()
    await expect(page.locator('text=Последняя печать')).toBeVisible()
  })

  test('страница статистики показывает график', async ({ page }) => {
    // Проверяем наличие графика
    await expect(page.locator('text=Печать за последние 7 дней')).toBeVisible()
  })

  test('переключатель сравнения периодов', async ({ page }) => {
    // Проверяем наличие переключателя сравнения
    const compareSwitch = page.locator('text=Сравнить').locator('..')
    await expect(compareSwitch).toBeVisible()

    // Включаем режим сравнения
    await compareSwitch.click()

    // Проверяем что появились поля для второго периода
    await expect(page.locator('text=Период 2: начало')).toBeVisible()
    await expect(page.locator('text=Период 2: конец')).toBeVisible()
  })

  test('экспорт в PDF доступен', async ({ page }) => {
    // Проверяем наличие кнопки экспорта
    await expect(page.locator('button:has-text("Экспорт в PDF")')).toBeVisible()
  })
})
