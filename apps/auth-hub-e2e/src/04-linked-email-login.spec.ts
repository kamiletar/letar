/**
 * Вход по подтверждённому linked-email → сессия ОСНОВНОГО аккаунта (Этап 8.5, v0.6.4).
 *
 * Бэклог auth-hub/PLAN.md отмечал этот сценарий как непокрытый e2e-тестами. Ручная проверка
 * и скрипт-матрица резолва на dev-БД были сделаны при разработке, но регрессионного теста
 * не было — эта спека закрывает пробел на локальном dev-раннере.
 *
 * Основной аккаунт создаём через реальный `/api/auth/sign-up/email` (пароль хешируется штатным
 * scrypt Better Auth — подделывать хеш вручную было бы хрупко). Linked-email вставляем напрямую
 * в БД через helpers/db.helpers.ts, минуя реальную отправку письма-подтверждения — это
 * эквивалентно состоянию после self-service подтверждения в /profile/emails/.
 *
 * ⚠️ Требует dev-БД auth-hub (docker-compose.dev.yml, порт 5440) и NODE_ENV=development
 * (requireEmailVerification=false в dev — см. libs/auth/src/server/create-auth/index.ts
 * buildHubProviderAuth). На staging/production сборке (NODE_ENV=production) эта спека
 * работать не будет — она не запускается в staging-раннере (см. driving-school-e2e's
 * stagingGlobalSetup для образца, как разделять локальный/staging прогон).
 */

import { expect, test } from './fixtures/base-test'
import { deleteUserEmail, disconnectDb, ensureVerifiedLinkedEmail, findUserByEmail } from './helpers/db.helpers'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3014'

const runId = Date.now()
const PRIMARY_EMAIL = `e2e-linked-primary-${runId}@auth.letar.best`
const PRIMARY_PASSWORD = 'E2e-Test-Password-123!'
const LINKED_EMAIL = `e2e-linked-secondary-${runId}@auth.letar.best`

test.describe('Вход по linked-email → сессия primary-аккаунта', () => {
  test.use({ storageState: undefined })

  test.beforeAll(async () => {
    const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PRIMARY_EMAIL, password: PRIMARY_PASSWORD, name: 'E2E Linked Primary' }),
    })
    if (!signUpRes.ok) {
      throw new Error(`[beforeAll] sign-up primary account failed: ${signUpRes.status} ${await signUpRes.text()}`)
    }

    const primaryUser = await findUserByEmail(PRIMARY_EMAIL)
    if (!primaryUser) {
      throw new Error('[beforeAll] primary user не найден после sign-up')
    }

    await ensureVerifiedLinkedEmail(primaryUser.id, LINKED_EMAIL)
  })

  test.afterAll(async () => {
    await deleteUserEmail(LINKED_EMAIL)
    await disconnectDb()
  })

  test('вход по linked-адресу авторизует под primary-аккаунтом', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })

    await page.locator('input[name="email"]').fill(LINKED_EMAIL)
    await page.locator('input[name="password"]').fill(PRIMARY_PASSWORD)
    await page.getByRole('button', { name: 'Войти' }).click()

    // Успешный вход уводит с /sign-in (redirectTo по умолчанию '/', см. login.action.ts)
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 15_000 })

    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(PRIMARY_EMAIL)).toBeVisible()
    await expect(page.getByText(LINKED_EMAIL, { exact: true })).toHaveCount(0)
  })

  test('неверный пароль по linked-адресу — «Неверный пароль», без дубль-регистрации', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })

    await page.locator('input[name="email"]').fill(LINKED_EMAIL)
    await page.locator('input[name="password"]').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page.getByText('Неверный пароль')).toBeVisible()

    // resolved=true в loginUser() должен блокировать trySignUp — дубль-аккаунт с linked-адресом
    // как основным email не должен появиться (см. login.action.ts, Этап 8.5).
    const duplicate = await findUserByEmail(LINKED_EMAIL)
    expect(duplicate).toBeNull()
  })
})
