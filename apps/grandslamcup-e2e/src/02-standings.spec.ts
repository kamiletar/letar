/**
 * Турнирная таблица — Round-Robin и Swiss форматы
 */

import { expect, test } from './fixtures/base-test'

test.describe('Таблица — Round-Robin', () => {
  test('СПб Сезон 1 — классический формат', async ({ page }) => {
    await page.goto('/standings?season=spb-s1')
    await expect(page.getByRole('heading', { name: /Турнирная таблица/i })).toBeVisible()

    // Заголовок "Основная" (лига)
    await expect(page.getByRole('heading', { name: 'Основная' })).toBeVisible()

    // Колонка "Команда" — признак Round-Robin таблицы
    await expect(page.getByText('Команда')).toBeVisible()
    await expect(page.getByText('Заб')).toBeVisible()
  })

  test('ссылки на команды кликабельны', async ({ page }) => {
    await page.goto('/standings?season=spb-s1')

    // Команда Шь должна быть ссылкой
    const teamLink = page.getByRole('link', { name: 'Шь' })
    await expect(teamLink).toBeVisible()
  })
})

test.describe('Таблица — Swiss', () => {
  test('Москва Сезон 2 — W/L формат', async ({ page }) => {
    await page.goto('/standings?season=moscow-s2')

    // Колонка "Разн" — признак Swiss таблицы
    await expect(page.getByText('Разн')).toBeVisible()
    await expect(page.getByText('Команда')).toBeVisible()
  })

  test('badge "Швейцарская система"', async ({ page }) => {
    await page.goto('/standings?season=moscow-s2')
    await expect(page.getByText('Швейцарская система')).toBeVisible()
  })
})

test.describe('Переключение сезонов', () => {
  test('кнопки сезонов отображаются', async ({ page }) => {
    await page.goto('/standings')
    await expect(page.getByText('КБС Москва Сезон 2')).toBeVisible()
    await expect(page.getByText('КБС СПб Сезон 1')).toBeVisible()
  })

  test('переключение между сезонами', async ({ page }) => {
    await page.goto('/standings')
    await page.getByText('КБС СПб Сезон 1').click()
    await expect(page).toHaveURL(/season=spb-s1/)
  })
})
