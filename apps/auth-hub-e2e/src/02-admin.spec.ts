/**
 * Админка — требует авторизации (admin через dev-session, см. global-setup.ts)
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

test.describe('Админка — авторизованный', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE })

  test('дашборд загружается', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Администрирование' })).toBeVisible()
    // "Пользователи"/"OAuth клиенты" встречаются дважды на странице (Stat.Label статистики +
    // текст ссылки навигации) — скоупим через role=link, чтобы не словить strict-mode violation.
    await expect(page.getByRole('link', { name: /Пользователи/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /OAuth клиенты/ })).toBeVisible()
  })

  test('список пользователей загружается', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Пользователи' })).toBeVisible()
    // Сам admin-пользователь (создан dev-session роутом при первом логине) должен быть в списке
    await expect(page.getByText('admin@auth.letar.best')).toBeVisible()
  })

  test('список OAuth клиентов загружается', async ({ page }) => {
    await page.goto('/admin/clients')
    await expect(page.getByRole('heading', { name: 'OAuth клиенты' })).toBeVisible()
  })
})
