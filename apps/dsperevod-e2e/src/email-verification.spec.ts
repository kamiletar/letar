import { expect, test } from '@playwright/test'
import { SignJWT } from 'jose'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Этап 2 (PLAN.md) — Resend email-верификации, тираж эталона aboi на dsperevod.
 * Полный флоу: регистрация → тупик EMAIL_NOT_VERIFIED → resend → cooldown → верификация.
 *
 * Особенности окружения:
 * - SMTP в тестах не настроен → @letar/email возвращает { success:false } (не бросает),
 *   sign-up всё равно проходит, а эндпоинт /send-verification-email отвечает 200
 *   (провал SMTP логируется на сервере через reportEmailFailure) → cooldown стартует.
 * - dsperevod не использует i18n — селекторы по плейсхолдерам/тексту (русские строки).
 * - Токен верификации в Better Auth 1.6.x — это stateless HS256 JWT (в БД его нет),
 *   поэтому для шага «верификация» мы генерируем такой же токен тем же секретом и
 *   обращаемся к /api/auth/verify-email. Если BETTER_AUTH_SECRET недоступен — шаг
 *   пропускается (test.skip), а детерминированный UI-флоу всё равно проверяется.
 */

/** Читает BETTER_AUTH_SECRET из окружения или из apps/dsperevod/.env.local. */
function readBetterAuthSecret(): string | null {
  if (process.env.BETTER_AUTH_SECRET) {
    return process.env.BETTER_AUTH_SECRET
  }
  const candidates = [
    join(process.cwd(), 'apps', 'dsperevod', '.env.local'),
    join(__dirname, '..', '..', 'dsperevod', '.env.local'),
  ]
  for (const path of candidates) {
    try {
      const content = readFileSync(path, 'utf8')
      const line = content.split(/\r?\n/).find((l) => l.trim().startsWith('BETTER_AUTH_SECRET='))
      if (line) {
        return line
          .slice(line.indexOf('=') + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
      }
    } catch {
      // следующий кандидат
    }
  }
  return null
}

/** Генерирует verification-JWT, совместимый с better-auth createEmailVerificationToken. */
async function mintVerificationToken(email: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ email: email.toLowerCase() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(secret))
}

test.describe.serial('email-верификация: resend + verify (Этап 2)', () => {
  // Уникальный email на прогон — чтобы регистрация не упиралась в существующего юзера
  const email = `e2e-verify-${Date.now()}@example.com`
  const password = 'Password123!'

  test('регистрация → тупик EMAIL_NOT_VERIFIED → resend → cooldown', async ({ page, browserName }) => {
    // webkit: POST /api/auth/sign-up/email не покидает клиент — воспроизведено дважды идентично
    // (30с полный таймаут ответа, без единого запроса). Проверено на обоих уровнях: контейнер
    // dsperevod-staging-app молчит всё тестовое окно, Traefik тоже не логирует ни одного POST —
    // запрос не доходит даже до edge. Не связано с фиксом outputFileTracingIncludes (тот про
    // статические ассеты, не про auth-флоу), не rate-limit (тест уже отличает 429 выше), не
    // серверный хэнг. chromium/firefox стабильно зелёные. Диагностика — deploy-agent-dev,
    // тред agent-mail `hard-gate-remaining-4`, сообщение 540, 2026-08-25.
    test.skip(browserName === 'webkit', 'webkit-специфичный сетевой артефакт — see comment above')

    // 1. Регистрация нового пользователя
    await page.goto('/sign-up')
    await page.getByPlaceholder('Иван Иванов').fill('E2E Тестов')
    await page.getByPlaceholder('ivan@dsperevod.ru').fill(email)
    await page.getByPlaceholder('Минимум 8 символов').fill(password)

    // customRules['/sign-up/email'] = { window: 300, max: 3 } (дефолт createAuth() factory,
    // libs/auth/src/server/create-auth/index.ts) — общий IP-лимит на реальный сервис, не
    // тестовый артефакт. Повторные прогоны сьюта за короткое время (отладка, staging redeploy +
    // run_e2e несколько раз подряд) могут исчерпать лимит ДО этого теста — тогда sign-up
    // отвечает 429, и экран «Проверьте почту» не появляется, хотя это лимит, а не баг UI.
    // Различаем явно, чтобы не гонять E2E_GATED_APPS по ложному сигналу (тот же паттерн, что уже
    // в apps/aboi-e2e/src/email-verification.spec.ts).
    const signUpResponse = page.waitForResponse((r) => r.url().includes('/api/auth/sign-up/email'), {
      timeout: 30000,
    })
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    const response = await signUpResponse
    test.skip(
      response.status() === 429,
      'sign-up rate-limited (customRules /sign-up/email: 3/5мин на IP) — не баг, повторить прогон позже',
    )

    // Экран «Проверьте почту» — письмо отправлено (sendOnSignUp), сессии нет
    // (requireEmailVerification: true).
    await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible({ timeout: 15000 })

    // 2. Попытка входа без верификации → тупик EMAIL_NOT_VERIFIED
    await page.goto('/sign-in')
    await page.getByPlaceholder('admin@dsperevod.ru').fill(email)
    await page.getByPlaceholder('••••••••').fill(password)
    await page.getByRole('button', { name: 'Войти' }).click()

    // Блок повторной отправки появляется только при EMAIL_NOT_VERIFIED
    await expect(page.getByText('Подтвердите email — мы отправили письмо со ссылкой')).toBeVisible({
      timeout: 15000,
    })
    const resendButton = page.getByRole('button', { name: 'Отправить письмо повторно' })
    await expect(resendButton).toBeVisible()

    // 3. Resend → cooldown стартует (200 от эндпоинта) ИЛИ нейтральная ошибка (§13.4)
    await resendButton.click()
    await expect(
      page
        .getByRole('button', { name: /Отправить повторно через \d+ с/ })
        .or(page.getByText('Не удалось отправить письмо. Попробуйте ещё раз.')),
    ).toBeVisible({ timeout: 10000 })
  })

  test('верификация по токену → автологин', async ({ page }) => {
    const secret = readBetterAuthSecret()
    test.skip(!secret, 'BETTER_AUTH_SECRET недоступен — пропускаем шаг верификации по токену')

    const token = await mintVerificationToken(email, secret as string)
    await page.goto(`/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/')}`)

    // autoSignInAfterVerification: true → создаётся сессия и редирект на callbackURL.
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
  })
})
