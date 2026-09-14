import type { EmailOTPOptions } from 'better-auth/plugins'

/** Общие дефолты `emailOTP` для всех потребителей (R1 PLAN_EMAIL_CODE.md) — не расходиться. */
export const EMAIL_CODE_DEFAULTS = {
  otpLength: 6,
  expiresInSec: 600,
  allowedAttempts: 5,
} as const

/**
 * Пути, которых не заказывал ни один потребитель (вход по коду и смена email по коду) —
 * `disabledPaths` отдаёт 404 до обработчика.
 */
export const EMAIL_CODE_DISABLED_PATHS = [
  '/sign-in/email-otp',
  '/email-otp/request-email-change',
  '/email-otp/change-email',
] as const

export interface CreateEmailCodeOptionsDeps {
  sendVerificationEmail: (params: { to: string; pin: string; pinExpiresInMinutes: number }) => Promise<unknown>
  sendPasswordResetEmail: (params: { to: string; pin: string; pinExpiresInMinutes: number }) => Promise<unknown>
}

/**
 * Собирает опции плагина `emailOTP` (R1/R2 PLAN_EMAIL_CODE.md) — общие для auth-hub и
 * приватного приложения-пилота, чтобы не разойтись в параметрах.
 *
 * `sendVerificationOTP` шлёт письмо сам через переданные `deps` — плагин `emailOTP` не хранит
 * шаблоны, только код. UI приложений вызывает не `email-otp/send-verification-otp`, а
 * `/send-verification-email` (R2), поэтому единственный тип, реально доходящий сюда через это
 * поле, — `email-verification` при прямом вызове API и `forget-password` при сбросе пароля;
 * `sign-in`/`change-email` закрыты `EMAIL_CODE_DISABLED_PATHS`.
 */
export function createEmailCodeOptions(deps: CreateEmailCodeOptionsDeps): EmailOTPOptions {
  const { sendVerificationEmail, sendPasswordResetEmail } = deps
  const pinExpiresInMinutes = EMAIL_CODE_DEFAULTS.expiresInSec / 60

  return {
    otpLength: EMAIL_CODE_DEFAULTS.otpLength,
    expiresIn: EMAIL_CODE_DEFAULTS.expiresInSec,
    allowedAttempts: EMAIL_CODE_DEFAULTS.allowedAttempts,
    storeOTP: 'hashed',
    disableSignUp: true,
    sendVerificationOnSignUp: false,
    sendVerificationOTP: async ({ email, otp, type }) => {
      switch (type) {
        case 'email-verification':
          await sendVerificationEmail({ to: email, pin: otp, pinExpiresInMinutes })
          return
        case 'forget-password':
          await sendPasswordResetEmail({ to: email, pin: otp, pinExpiresInMinutes })
          return
        default:
          throw new Error(`[email-code] Неожиданный type '${type}' — путь должен быть закрыт EMAIL_CODE_DISABLED_PATHS`)
      }
    },
  }
}

export interface CreateEmailVerificationCodeApi {
  createVerificationOTP: (args: { body: { email: string; type: 'email-verification' } }) => Promise<string>
}

/**
 * Хелпер для R2 — вызывается из `emailVerification.sendVerificationEmail` приложения, чтобы
 * создать код верификации тем же вызовом, которым Better Auth создаёт код внутри плагина
 * `emailOTP`. Принимает структурный тип `api`, а не `typeof auth` — иначе циклическая
 * зависимость типов в `lib/auth.ts` приложения.
 */
export async function createEmailVerificationCode(api: CreateEmailVerificationCodeApi, email: string): Promise<string> {
  return api.createVerificationOTP({ body: { email, type: 'email-verification' } })
}
