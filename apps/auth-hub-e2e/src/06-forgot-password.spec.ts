/**
 * Сброс пароля кодом (PLAN_EMAIL_CODE.md, R3/A.4/A.6) — без ссылки в письме сброса.
 *
 * Шаг 1 не должен выдавать существование аккаунта — этот сьют проверяет именно это:
 * несуществующий email ведёт на шаг 2 так же, как существующий.
 */

import { expect, test } from './fixtures/base-test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3014'
const isLocalDev = BASE_URL.includes('localhost')

test.describe('/forgot-password', () => {
  test.use({ storageState: undefined })

  test.skip(!isLocalDev, 'Требует dev-БД auth-hub — не запускается на staging/production')

  test('шаг 1 → шаг 2 виден и для несуществующего email (без утечки наличия аккаунта)', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' })
    // Первый заход на /forgot-password в процессе Playwright — dev-сервер компилирует роут
    // "на лету", гидратация может не успеть до клика по сабмиту: см. тот же фикс и разбор
    // в 05-sign-up-code.spec.ts. `load`, не `networkidle` (запрещён `playwright/no-networkidle`).
    await page.waitForLoadState('load')

    await expect(page.getByRole('heading', { name: 'Забыли пароль?' })).toBeVisible()

    await page.locator('input[data-field-name="email"]').fill(`no-such-user-${Date.now()}@auth.letar.best`)
    await page.getByRole('button', { name: 'Отправить код' }).click()

    await expect(page.getByRole('heading', { name: 'Введите код' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('зарегистрирован, мы отправили на него 6-значный код')).toBeVisible()
  })

  test('ссылка «Забыли пароль?» на /sign-in ведёт на /forgot-password', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Забыли пароль?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})
