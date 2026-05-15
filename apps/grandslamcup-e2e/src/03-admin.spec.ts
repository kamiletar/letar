/**
 * Админка — требует авторизации
 */

import { expect, test } from './fixtures/base-test'
import { ADMIN_STORAGE_STATE } from './global-setup'

test.describe('Админка — без авторизации', () => {
  test('редирект на /sign-in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('Админка — авторизованный', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE })

  test('дашборд загружается', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Claude Admin')).toBeVisible()
  })

  test('sidebar навигация видна', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: 'Города' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Площадки' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Сезоны' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Команды' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Матчи' })).toBeVisible()
  })

  test('список городов загружается', async ({ page }) => {
    await page.goto('/admin/cities')
    await expect(page.getByRole('heading', { name: /Города/i })).toBeVisible()
    // Должны быть СПб и Москва (из seed-v2)
    await expect(page.getByText('Санкт-Петербург')).toBeVisible()
    await expect(page.getByText('Москва')).toBeVisible()
  })

  test('список площадок загружается', async ({ page }) => {
    await page.goto('/admin/venues')
    await expect(page.getByRole('heading', { name: /Площадки/i })).toBeVisible()
  })

  test('список сезонов загружается', async ({ page }) => {
    await page.goto('/admin/seasons')
    await expect(page.getByRole('heading', { name: /Сезоны/i })).toBeVisible()
    await expect(page.getByText('КБС СПб Сезон 1')).toBeVisible()
  })

  test('список команд загружается', async ({ page }) => {
    await page.goto('/admin/teams')
    await expect(page.getByRole('heading', { name: /Команды/i })).toBeVisible()
  })

  test('список матчей загружается', async ({ page }) => {
    await page.goto('/admin/matches')
    await expect(page.getByRole('heading', { name: /Матчи/i })).toBeVisible()
  })
})
