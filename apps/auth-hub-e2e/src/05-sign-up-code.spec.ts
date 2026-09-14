/**
 * Регистрация → код из письма (PLAN_EMAIL_CODE.md, Фаза A.2/A.3/A.6).
 *
 * Успешный ввод настоящего кода этот сьют не покрывает — код хранится хешем
 * (`storeOTP: 'hashed'`), прочитать его из БД нельзя. Вместо этого два независимых сценария —
 * каждый на своём аккаунте, а не один сплошной флоу:
 * - неверный код → «Неверный код» (реальный вызов `/email-otp/verify-email`);
 * - подтверждение «в другой вкладке» симулируется прямой пометкой `User.emailVerified`
 *   в БД (как переход по ссылке из письма на другом устройстве) — SSE-поток
 *   (`/api/auth/verification-stream`) должен сам обнаружить это и переключить экран.
 *
 * ⚠️ Оба сценария в одном флоу не проверить: `useEmailCodeVerification.submitCode` закрывает
 * SSE-соединение перед КАЖДЫМ submit (успешным или нет) и осознанно не переоткрывает его при
 * ошибке (см. комментарий в `libs/pin-auth/src/client/use-email-code-verification.ts`) — попытка
 * неверного кода до пометки в БД навсегда глушит стрим для этой вкладки. Найдено эмпирически:
 * тест «неверный код, затем пометка в БД» стабильно не видел «Email подтверждён» никогда.
 *
 * ⚠️ Требует dev-БД auth-hub (docker-compose.dev.yml, порт 5440) — как 04-*.
 */

import { expect, test } from './fixtures/base-test'
import { deleteUser, disconnectDb, markEmailVerified } from './helpers/db.helpers'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3014'
const isLocalDev = BASE_URL.includes('localhost')

const runId = Date.now()
const EMAIL_WRONG_CODE = `e2e-sign-up-wrong-code-${runId}@auth.letar.best`
const EMAIL_SSE = `e2e-sign-up-sse-${runId}@auth.letar.best`
const PASSWORD = 'E2e-Test-Password-123!'

async function registerAndReachCodeScreen(page: import('@playwright/test').Page, email: string) {
  await page.goto('/sign-up', { waitUntil: 'domcontentloaded' })
  // Первый заход на /sign-up в процессе Playwright — dev-сервер компилирует роут "на лету"
  // (см. `Compiling...` в UI), гидратация может не успеть до клика по сабмиту: без ожидания
  // клик по кнопке уходит нативным `POST /sign-up` вместо React-обработчика, страница
  // перезагружается пустой. `load` (не `networkidle` — запрещён `playwright/no-networkidle`)
  // даёт JS-бандлу дозагрузиться и гидратации — дойти.
  await page.waitForLoadState('load')

  await page.locator('input[data-field-name="name"]').fill('E2E Sign-up Code')
  await page.locator('input[data-field-name="email"]').fill(email)
  await page.locator('input[data-field-name="password"]').fill(PASSWORD)
  // data-field-name висит на Checkbox.Root (обёртка), не на скрытом нативном input
  // (Checkbox.HiddenInput) — см. libs/forms/src/lib/declarative/form-fields/base/uikit-chakra.tsx.
  await page.locator('[data-field-name="acceptPrivacy"]').click()
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  // Экран кода — заголовок "Код подтверждения" + email
  await expect(page.getByText('Код подтверждения')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(email)).toBeVisible()
}

test.describe('Регистрация → код из письма', () => {
  test.use({ storageState: undefined })

  test.skip(!isLocalDev, 'Требует dev-БД auth-hub — не запускается на staging/production')

  test.afterAll(async () => {
    await deleteUser(EMAIL_WRONG_CODE)
    await deleteUser(EMAIL_SSE)
    await disconnectDb()
  })

  test('регистрация показывает экран кода; неверный код — ошибка', async ({ page }) => {
    await registerAndReachCodeScreen(page, EMAIL_WRONG_CODE)

    // Неверный код — 6 нулей гарантированно не совпадает с реально отправленным
    await page.getByRole('textbox', { name: 'pin code 1 of 6' }).click()
    await page.keyboard.type('000000')
    await expect(page.getByText('Неверный код')).toBeVisible({ timeout: 10_000 })
  })

  test('пометка emailVerified в БД (переход по ссылке в другой вкладке) переключает экран через SSE', async ({ page }) => {
    await registerAndReachCodeScreen(page, EMAIL_SSE)

    // Симулируем переход по ссылке из письма на другом устройстве — прямая пометка в БД, без
    // единой попытки ввода кода в этой вкладке (иначе submitCode закрыл бы SSE-стрим, см. шапку
    // файла). SSE-поток (poll ~2с) должен сам обнаружить и переключить экран без перезагрузки.
    await markEmailVerified(EMAIL_SSE)

    await expect(page.getByText('Email подтверждён')).toBeVisible({ timeout: 10_000 })
  })
})
