import { createEmailVerificationCode } from '@letar/auth/server'
import { reportEmailFailure, sendVerificationEmail as sendVerificationEmailProvider } from '@letar/email'

/**
 * Колбэк `emailVerification.sendVerificationEmail` (PLAN_EMAIL_CODE.md R2) — одно письмо со
 * ссылкой и 6-значным кодом сразу. Код создаётся тем же вызовом, которым Better Auth создаёт
 * его внутри плагина `emailOTP` (`auth.api.createVerificationOTP`).
 *
 * Вынесено в отдельный модуль с ленивым `import('./auth')`, а не колбэком прямо внутри
 * `createAuth(...)` в auth.ts — иначе циклическая зависимость типов (`auth` ссылается на себя
 * же в своём собственном инициализаторе).
 */
export async function sendVerificationEmailWithCode(params: {
  to: string
  userName?: string
  verificationUrl: string
}) {
  const { to, userName, verificationUrl } = params
  let pin: string | undefined

  try {
    const { auth } = await import('./auth')
    // `createAuth({ mode: 'hub-provider' })` типизирован кастом на standalone-тип (oauthProvider
    // непортабелен для .d.ts, см. комментарий в libs/auth/src/server/create-auth/index.ts) —
    // конкретные плагины (emailOTP) теряют литеральный тип эндпоинтов в auth.api. Метод реально
    // существует в рантайме (плагин зарегистрирован в auth.ts), приводим структурно.
    pin = await createEmailVerificationCode(
      auth.api as unknown as Parameters<typeof createEmailVerificationCode>[0],
      to,
    )
  } catch (error) {
    // Провал создания кода не должен ронять письмо со ссылкой — отправляем без pin.
    reportEmailFailure({
      type: 'email-verification-code',
      to,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return sendVerificationEmailProvider({ to, userName, verificationUrl, pin, pinExpiresInMinutes: 10 })
}
