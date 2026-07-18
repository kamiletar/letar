/**
 * Админка — требует роль MODERATOR/ADMIN (см. src/app/admin/page.tsx).
 * Авторизация admin через dev-session, см. global-setup.ts.
 */

import { expect, test } from './fixtures/base-test'
import { ADMIN_STORAGE_STATE } from './global-setup'

test.describe('Админка — без авторизации', () => {
  test.use({ storageState: undefined })

  test('редирект на /sign-in', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('Админка — авторизованный ADMIN', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE })

  test('дашборд загружается', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /Админ-панель/ })).toBeVisible()
  })

  test('список пользователей загружается', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: /Пользователи/ })).toBeVisible()
    // Сам admin-пользователь (создан dev-session роутом при первом логине) должен быть в списке
    await expect(page.getByText('admin@animatrona-tracker.letar.best')).toBeVisible()
  })

  test('вкладка "Пин-серверы" открывается', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('tab', { name: /Пин-серверы/ }).click()
    await expect(page.getByRole('tabpanel')).toBeVisible()
  })
})
