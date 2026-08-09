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
  smartcaptcha: 'https://smartcaptcha.cloud.yandex.ru/validate',
}

/**
 * Ответ Yandex SmartCaptcha не совпадает по форме с Turnstile/reCAPTCHA/hCaptcha
 * (`{ status: 'ok' | 'failed', message, host }` вместо `{ success, 'error-codes', hostname }`)
 * и имена полей запроса тоже другие (`secret`+`token`+`ip` вместо `secret`+`response`+`remoteip`).
 * См. https://yandex.cloud/en/docs/smartcaptcha/concepts/validation
 */
function buildRequestBody(provider: CaptchaProvider, secretKey: string, token: string, remoteIp?: string) {
  if (provider === 'smartcaptcha') {
    return new URLSearchParams({
      secret: secretKey,
      token,
      ...(remoteIp ? { ip: remoteIp } : {}),
    })
  }
  return new URLSearchParams({
    secret: secretKey,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  })
}

function parseResponse(provider: CaptchaProvider, data: Record<string, unknown>): CaptchaVerifyResult {
  if (provider === 'smartcaptcha') {
    const status = data.status
    return {
      success: status === 'ok',
      errorCodes: typeof data.message === 'string' && data.message ? [data.message] : undefined,
      hostname: typeof data.host === 'string' ? data.host : undefined,
    }
  }
  return {
    success: Boolean(data.success),
    errorCodes: (data['error-codes'] ?? data.errorCodes) as string[] | undefined,
    hostname: data.hostname as string | undefined,
    challengeTs: (data.challenge_ts ?? data.challengeTs) as string | undefined,
  }
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

  const body = buildRequestBody(provider, secretKey, token, remoteIp)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    return { success: false, errorCodes: ['network-error'] }
  }

  const data = await response.json()
  return parseResponse(provider, data)
}
