import { expect, test } from '@playwright/test'
import {
  createTestAdmin,
  createTestTranslationRequest,
  deleteTranslationRequest,
  disconnectDb,
} from './helpers/db.helpers'

/**
 * Регрессия: logAudit() (src/lib/action-helpers.ts) писал JS `null` в nullable Json-поле
 * AuditLog.metadata вместо JsonNull — ZenStack падал с invalid_union на ЛЮБОМ вызове, роняя
 * 500-кой каждую admin-страницу, которая пишет audit-лог (редактирование контента, просмотр
 * заявки и т.д.). Диагностировано по прод-логам 2026-08-27, digest 2020397801, фикс —
 * apps/dsperevod/src/lib/action-helpers.ts (JsonNull из @zenstackhq/orm).
 */

test.describe.serial('admin: audit-log регрессия (AuditLog.metadata JsonNull)', () => {
  const adminEmail = `e2e-admin-audit-${Date.now()}@dsperevod.ru`
  const adminPassword = 'Password123!'
  let requestId: string

  test.beforeAll(async () => {
    await createTestAdmin({ email: adminEmail, password: adminPassword, name: 'E2E Admin Audit' })
    requestId = await createTestTranslationRequest()
  })

  test.afterAll(async () => {
    await deleteTranslationRequest(requestId)
    await disconnectDb()
  })

  test('редактирование блока контента и просмотр заявки не падают 500', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByPlaceholder('admin@dsperevod.ru').fill(adminEmail)
    await page.getByPlaceholder('••••••••').fill(adminPassword)
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15000 })

    // Раньше здесь падало: updateContentBlock() → logAudit() → invalid_union на data.metadata.
    await page.goto('/admin/content/urgent.badge_courier')
    await expect(page.getByRole('heading', { name: 'Редактировать блок' })).toBeVisible({ timeout: 15000 })
    await page.locator('textarea[name="content"]').fill('Курьер по Москве (e2e)')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page).toHaveURL(/\/admin\/content\/?$/, { timeout: 15000 })

    // Раньше здесь падало: страница просмотра заявки → logAudit({ action: 'VIEW_REQUEST' }).
    await page.goto(`/admin/requests/${requestId}`)
    await expect(page.getByText(/Заявка #/)).toBeVisible({ timeout: 15000 })
  })
})
