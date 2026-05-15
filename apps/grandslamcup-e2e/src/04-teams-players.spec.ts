/**
 * Детальные страницы команд и поэтов
 */

import { expect, test } from './fixtures/base-test'

test.describe('Страница команды', () => {
  test('профиль команды загружается по slug', async ({ page }) => {
    // Переходим напрямую к команде Чумные
    await page.goto('/teams/chumnye')
    await expect(page.getByRole('heading', { name: 'Чумные' })).toBeVisible()
  })

  test('страница команды Шь с матчами', async ({ page }) => {
    await page.goto('/teams/sh')
    await expect(page.getByRole('heading', { name: 'Шь' })).toBeVisible()
  })
})

test.describe('Страница поэта', () => {
  test('список поэтов загружается с данными', async ({ page }) => {
    await page.goto('/players')

    // Должны быть поэты из seed (1136 в БД)
    const playerLinks = page.getByRole('link').filter({ hasText: /\w{3,}/ })
    const count = await playerLinks.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Страница расписания', () => {
  test('расписание загружается с матчами', async ({ page }) => {
    await page.goto('/schedule')
    await expect(page.getByRole('heading', { name: /Расписание/i })).toBeVisible()

    // Должны быть карточки матчей (vs повторяется — берём первый)
    await expect(page.getByText('vs').first()).toBeVisible()
  })
})
