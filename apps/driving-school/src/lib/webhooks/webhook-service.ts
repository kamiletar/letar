/**
 * Webhook Service
 *
 * Утилиты для работы с webhooks:
 * - Генерация HMAC подписи
 * - Генерация секретного ключа
 * - Валидация подписи
 *
 * НЕ использует 'use server' — это чистые утилитные функции,
 * которые импортируются в server actions файлы.
 */

import { createHmac, randomBytes } from 'crypto'

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Алгоритм хеширования для HMAC */
const HMAC_ALGORITHM = 'sha256'

/** Длина секретного ключа в байтах (32 байта = 256 бит) */
const SECRET_LENGTH = 32

/** Префикс для секретного ключа (whsec_ как у Stripe) */
const SECRET_PREFIX = 'whsec_'

// ============================================================================
// ГЕНЕРАЦИЯ СЕКРЕТА
// ============================================================================

/**
 * Генерирует криптографически стойкий секретный ключ для webhook
 *
 * @returns Секретный ключ в формате whsec_<base64>
 *
 * @example
 * const secret = generateWebhookSecret()
 * // "whsec_abc123..."
 */
export function generateWebhookSecret(): string {
  const bytes = randomBytes(SECRET_LENGTH)
  const base64 = bytes.toString('base64url')
  return `${SECRET_PREFIX}${base64}`
}

// ============================================================================
// HMAC ПОДПИСЬ
// ============================================================================

/**
 * Создаёт HMAC подпись для payload
 *
 * @param payload - JSON строка для подписи
 * @param secret - Секретный ключ webhook
 * @param timestamp - Unix timestamp в секундах
 * @returns Подпись в формате sha256=<hex>
 *
 * @example
 * const signature = createWebhookSignature(
 *   JSON.stringify({ event: 'LESSON_CONFIRMED', data: {...} }),
 *   'whsec_abc123...',
 *   Math.floor(Date.now() / 1000)
 * )
 * // "sha256=abcdef123456..."
 */
export function createWebhookSignature(payload: string, secret: string, timestamp: number): string {
  // Подписываем timestamp.payload для защиты от replay attacks
  const signedPayload = `${timestamp}.${payload}`

  // Убираем префикс whsec_ если есть
  const rawSecret = secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret

  const hmac = createHmac(HMAC_ALGORITHM, rawSecret)
  hmac.update(signedPayload, 'utf8')
  const signature = hmac.digest('hex')

  return `${HMAC_ALGORITHM}=${signature}`
}

/**
 * Валидирует HMAC подпись webhook
 *
 * @param payload - JSON строка payload
 * @param signature - Подпись из заголовка X-Webhook-Signature
 * @param secret - Секретный ключ webhook
 * @param timestamp - Timestamp из заголовка X-Webhook-Timestamp
 * @param toleranceSec - Допустимое отклонение времени в секундах (default: 300 = 5 минут)
 * @returns true если подпись валидна
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSec = 300
): boolean {
  // Проверяем timestamp (защита от replay attacks)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > toleranceSec) {
    return false
  }

  // Проверяем формат подписи
  if (!signature.startsWith(`${HMAC_ALGORITHM}=`)) {
    return false
  }

  // Вычисляем ожидаемую подпись
  const expectedSignature = createWebhookSignature(payload, secret, timestamp)

  // Сравниваем с защитой от timing attacks
  return timingSafeEqual(signature, expectedSignature)
}

/**
 * Сравнение строк с защитой от timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// ============================================================================
// HTTP ЗАГОЛОВКИ
// ============================================================================

/** Структура заголовков webhook запроса */
export type WebhookHeaders = Record<string, string> & {
  'X-Webhook-Signature': string
  'X-Webhook-Event': string
  'X-Webhook-Delivery': string
  'X-Webhook-Timestamp': string
  'Content-Type': 'application/json'
}

/**
 * Создаёт заголовки для webhook запроса
 *
 * @param eventType - Тип события (LESSON_CONFIRMED, PAYMENT_RECEIVED и т.д.)
 * @param deliveryId - ID доставки (обычно ID лога)
 * @param signature - HMAC подпись
 * @param timestamp - Unix timestamp
 */
export function createWebhookHeaders(
  eventType: string,
  deliveryId: string,
  signature: string,
  timestamp: number
): WebhookHeaders {
  return {
    'X-Webhook-Signature': signature,
    'X-Webhook-Event': eventType,
    'X-Webhook-Delivery': deliveryId,
    'X-Webhook-Timestamp': String(timestamp),
    'Content-Type': 'application/json',
  }
}
