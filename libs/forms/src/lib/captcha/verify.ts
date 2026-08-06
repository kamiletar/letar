/**
 * Серверная верификация CAPTCHA токена.
 *
 * ⚠️ ТОЛЬКО для серверного кода (Server Actions, API routes).
 * Секретный ключ НИКОГДА не должен попадать на клиент.
 *
 * @example В Server Action
 * ```typescript
 * 'use server'
 * import { verifyCaptcha } from '@letar/forms/captcha/server'
 *
 * export async function submitForm(data: FormData) {
 *   const result = await verifyCaptcha(data.__captchaToken, {
 *     provider: 'turnstile',
 *     secretKey: process.env.TURNSTILE_SECRET_KEY!,
 *   })
 *   if (!result.success) {
 *     throw new Error('Верификация CAPTCHA не пройдена')
 *   }
 *   // ... обработка формы
 * }
 * ```
 */

import type { CaptchaProvider, CaptchaVerifyOptions, CaptchaVerifyResult } from './types'

/** URL-ы для серверной верификации по провайдерам */
const VERIFY_URLS: Record<CaptchaProvider, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
  hcaptcha: 'https://api.hcaptcha.com/siteverify',
}

/**
 * Верифицирует токен CAPTCHA на сервере.
 *
 * @param token - Токен, полученный от клиентского виджета CAPTCHA
 * @param options - Настройки провайдера (provider, secretKey)
 * @returns Результат верификации
 */
export async function verifyCaptcha(
  token: string | undefined | null,
  options: CaptchaVerifyOptions,
): Promise<CaptchaVerifyResult> {
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] }
  }

  const { provider, secretKey, remoteIp } = options
  const url = VERIFY_URLS[provider]

  if (!url) {
    return { success: false, errorCodes: ['unknown-provider'] }
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    return { success: false, errorCodes: ['network-error'] }
  }

  const data = await response.json()

  // Все три провайдера возвращают { success: boolean, ... }
  return {
    success: Boolean(data.success),
    errorCodes: data['error-codes'] ?? data.errorCodes,
    hostname: data.hostname,
    challengeTs: data.challenge_ts ?? data.challengeTs,
  }
}
