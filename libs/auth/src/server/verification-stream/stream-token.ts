import { createHmac, timingSafeEqual } from 'node:crypto'

const HMAC_INFO = 'letar:verification-stream:v1'
const DEFAULT_TTL_SEC = 1800

interface TokenPayload {
  /** email (lowercase) */
  e: string
  /** unix seconds, момент истечения */
  x: number
}

function deriveKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(HMAC_INFO).digest()
}

function base64url(input: Buffer): string {
  return input.toString('base64url')
}

export interface CreateVerificationStreamTokenInput {
  email: string
  secret: string
  /** Срок жизни токена, секунды. По умолчанию 1800 (30 минут). */
  ttlSec?: number
  /** Текущее unix-время в секундах — для тестов. По умолчанию `Date.now() / 1000`. */
  now?: number
}

/**
 * Подписанный токен SSE-потока подтверждения email (§13.1/R5 PLAN_EMAIL_CODE.md).
 *
 * Формат: `base64url(JSON{e,x})` + `.` + `base64url(HMAC-SHA256)`. Ключ HMAC — не сам `secret`,
 * а производный (`HMAC-SHA256(secret, 'letar:verification-stream:v1')`), чтобы утечка этого
 * токена не давала прямой ключ для подделки других значений, подписанных тем же `secret`.
 */
export function createVerificationStreamToken(input: CreateVerificationStreamTokenInput): string {
  const { email, secret, ttlSec = DEFAULT_TTL_SEC, now = Math.floor(Date.now() / 1000) } = input

  const payload: TokenPayload = { e: email.toLowerCase(), x: now + ttlSec }
  const payloadJson = base64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const signature = base64url(createHmac('sha256', deriveKey(secret)).update(payloadJson).digest())

  return `${payloadJson}.${signature}`
}

export interface ReadVerificationStreamTokenInput {
  secret: string
  /** Текущее unix-время в секундах — для тестов. По умолчанию `Date.now() / 1000`. */
  now?: number
}

/**
 * Разбирает и проверяет токен из {@link createVerificationStreamToken}.
 * Любая проблема (мусор, истёк, подпись не совпала) → `null`, без `throw`.
 */
export function readVerificationStreamToken(
  token: string,
  input: ReadVerificationStreamTokenInput,
): { email: string } | null {
  const { secret, now = Math.floor(Date.now() / 1000) } = input

  const dotIndex = token.indexOf('.')
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return null
  }

  const payloadJson = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)

  let expectedSignature: Buffer
  let actualSignature: Buffer
  try {
    expectedSignature = createHmac('sha256', deriveKey(secret)).update(payloadJson).digest()
    actualSignature = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }

  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    return null
  }

  let payload: TokenPayload
  try {
    payload = JSON.parse(Buffer.from(payloadJson, 'base64url').toString('utf8')) as TokenPayload
  } catch {
    return null
  }

  if (typeof payload.e !== 'string' || typeof payload.x !== 'number' || !payload.e) {
    return null
  }

  if (payload.x <= now) {
    return null
  }

  return { email: payload.e }
}
