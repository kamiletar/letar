/**
 * Поиск и сортировка в каталоге — без БД-мутаций.
 * Поиск дебаунсится 400мс (см. anime-catalog-client.tsx) и обновляет query-параметр `q` в URL.
 */

import { expect, test } from './fixtures/base-test'

test.describe('Каталог — поиск', () => {
  test.use({ storageState: undefined })

  test('ввод в поле поиска обновляет URL query "q"', async ({ page }) => {
    await page.goto('/anime')

    const searchInput = page.getByPlaceholder('Поиск аниме...')
    await searchInput.click()
    await searchInput.fill('naruto-e2e-search-query')

    // Дебаунс 400мс — ждём обновления URL, а не фиксированную задержку
    await page.waitForURL(/[?&]q=naruto-e2e-search-query/, { timeout: 5000 })
  })

  test('несуществующий запрос показывает "Ничего не найдено"', async ({ page }) => {
    await page.goto('/anime?q=zzz-no-such-anime-title-e2e-zzz')
    await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
  })

  test('переключение сортировки не ломает страницу', async ({ page }) => {
    await page.goto('/anime')
    await page.getByRole('button', { name: 'Популярные' }).click()
    await page.waitForURL(/[?&]sort=popular/)
    await expect(page.getByRole('heading', { name: 'Каталог аниме' })).toBeVisible()
  })
})
