'use server'

import { auth } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/resolve-login-email'
import { headers } from 'next/headers'

/**
 * `auth.api.<метод>` для эндпоинтов плагина `emailOTP` структурно не виден в выведенном типе
 * `auth.api` — то же ограничение типизации `plugins` фабрики `createAuth`, что уже
 * задокументировано в `src/lib/auth-email.ts` (см. комментарий там же и
 * PLAN_EMAIL_CODE.md A.1): `buildHubProviderAuth` приводит результат к standalone-сигнатуре,
 * которая типизирует `plugins` как generic-массив без литеральных типов конкретных плагинов.
 * Методы реально существуют в рантайме (плагин зарегистрирован в `auth.ts`) — приводим структурно.
 */
interface EmailOTPServerApi {
  requestPasswordResetEmailOTP: (a: { body: { email: string }; headers: Headers }) => Promise<{ success: boolean }>
  resetPasswordEmailOTP: (a: {
    body: { email: string; otp: string; password: string }
    headers: Headers
  }) => Promise<{ success: boolean }>
}

const emailOTPApi = () => auth.api as unknown as EmailOTPServerApi

interface RequestResetResult {
  success: boolean
}

/**
 * Шаг 1 сброса пароля кодом (PLAN_EMAIL_CODE.md, A.4).
 *
 * Всегда отвечает `{ success: true }` — как и сам better-auth `/email-otp/request-password-reset`,
 * не выдаёт наличие аккаунта по email. `resolveLoginEmail` резолвит linked-адрес (Этап 8.5) в
 * основной email ДО вызова Better Auth — иначе для пользователя, вошедшего по дополнительному
 * адресу, код ушёл бы в никуда (better-auth ищет строго по `User.email`).
 */
export async function requestPasswordReset(email: string): Promise<RequestResetResult> {
  const { email: resolvedEmail } = await resolveLoginEmail(email)

  try {
    await emailOTPApi().requestPasswordResetEmailOTP({
      body: { email: resolvedEmail },
      headers: await headers(),
    })
  } catch (error) {
    console.error('[auth-hub] requestPasswordResetEmailOTP error:', error)
  }

  return { success: true }
}

interface ResetPasswordInput {
  email: string
  otp: string
  password: string
}

interface ResetPasswordResult {
  success: boolean
  error?: string
}

/**
 * Шаг 2 сброса пароля кодом. Тот же `resolveLoginEmail`, что и в шаге 1 — код был отправлен на
 * основной адрес, проверять его нужно тем же адресом, иначе `USER_NOT_FOUND`/несовпадение OTP.
 */
export async function resetPasswordWithCode(data: ResetPasswordInput): Promise<ResetPasswordResult> {
  const { email: resolvedEmail } = await resolveLoginEmail(data.email)

  try {
    await emailOTPApi().resetPasswordEmailOTP({
      body: { email: resolvedEmail, otp: data.otp, password: data.password },
      headers: await headers(),
    })

    return { success: true }
  } catch (error) {
    // Коды плагина emailOTP — email-otp/error-codes.mjs; PASSWORD_TOO_SHORT/LONG — общие BASE_ERROR_CODES.
    const apiBody = (error as Record<string, unknown> | null)?.body as Record<string, unknown> | undefined
    const apiCode = (apiBody?.code as string | undefined) ?? ''
    const message = (apiBody?.message as string | undefined) || (error instanceof Error ? error.message : '')
      || 'Неизвестная ошибка'

    if (apiCode === 'INVALID_OTP') {
      return { success: false, error: 'Неверный код' }
    }
    if (apiCode === 'OTP_EXPIRED') {
      return { success: false, error: 'Код истёк — отправьте новый' }
    }
    if (apiCode === 'TOO_MANY_ATTEMPTS') {
      return { success: false, error: 'Слишком много попыток — отправьте новый код' }
    }
    if (apiCode === 'USER_NOT_FOUND') {
      return { success: false, error: 'Аккаунт не найден' }
    }
    if (apiCode === 'PASSWORD_TOO_SHORT' || apiCode === 'PASSWORD_TOO_LONG') {
      return { success: false, error: 'Пароль слишком короткий (минимум 8 символов)' }
    }

    console.error('[auth-hub] resetPasswordEmailOTP error:', message)
    return { success: false, error: 'Не удалось сбросить пароль. Попробуйте ещё раз' }
  }
}
