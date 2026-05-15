'use server'

import { randomUUID } from 'node:crypto'

// ==================== Типы ====================

/** Создание платежа */
export interface CreatePaymentParams {
  /** Сумма в рублях */
  amount: number
  /** Описание платежа */
  description: string
  /** URL возврата после оплаты */
  returnUrl: string
  /** Ключ идемпотентности */
  idempotenceKey?: string
  /** Метаданные (orderId, orderNumber и т.д.) */
  metadata?: Record<string, string>
  /** Capture: true = одностадийный, false = двухстадийный (холд) */
  capture?: boolean
}

/** Ответ ЮKassa при создании платежа */
export interface YooKassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: { value: string; currency: string }
  description?: string
  confirmation?: {
    type: string
    confirmation_url?: string
    return_url?: string
  }
  metadata?: Record<string, string>
  paid: boolean
  created_at: string
  expires_at?: string
  cancellation_details?: {
    party: string
    reason: string
  }
}

/** Создание возврата */
export interface CreateRefundParams {
  paymentId: string
  amount: number
  description?: string
  idempotenceKey?: string
}

/** Ответ ЮKassa при создании возврата */
export interface YooKassaRefund {
  id: string
  status: 'succeeded' | 'canceled'
  payment_id: string
  amount: { value: string; currency: string }
  created_at: string
  description?: string
}

/** Webhook уведомление от ЮKassa */
export interface YooKassaNotification {
  type: 'notification'
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded'
  object: YooKassaPayment | YooKassaRefund
}

// ==================== Конфигурация ====================

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

function getCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    throw new Error('YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть заданы в .env')
  }

  return { shopId, secretKey }
}

function getAuthHeader(): string {
  const { shopId, secretKey } = getCredentials()
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
}

// ==================== API методы ====================

/**
 * Создать платёж в ЮKassa.
 * Возвращает объект платежа с confirmation_url для редиректа.
 *
 * @see https://yookassa.ru/developers/api#create_payment
 */
export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
  const idempotenceKey = params.idempotenceKey ?? randomUUID()

  const body = {
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    capture: params.capture ?? true,
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    description: params.description,
    metadata: params.metadata,
  }

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[ЮKassa] Ошибка создания платежа:', response.status, errorText)
    throw new Error(`ЮKassa API error: ${response.status} ${errorText}`)
  }

  return (await response.json()) as YooKassaPayment
}

/**
 * Получить информацию о платеже.
 *
 * @see https://yookassa.ru/developers/api#get_payment
 */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ЮKassa API error: ${response.status} ${errorText}`)
  }

  return (await response.json()) as YooKassaPayment
}

/**
 * Создать возврат платежа.
 *
 * @see https://yookassa.ru/developers/api#create_refund
 */
export async function createRefund(params: CreateRefundParams): Promise<YooKassaRefund> {
  const idempotenceKey = params.idempotenceKey ?? randomUUID()

  const body = {
    payment_id: params.paymentId,
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    description: params.description,
  }

  const response = await fetch(`${YOOKASSA_API_URL}/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ЮKassa Refund API error: ${response.status} ${errorText}`)
  }

  return (await response.json()) as YooKassaRefund
}

// ==================== Верификация IP ====================

/**
 * Разрешённые IP-адреса ЮKassa для webhook'ов.
 * @see https://yookassa.ru/developers/using-api/webhooks#ip
 */
const YOOKASSA_ALLOWED_CIDRS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '77.75.154.128/25',
]

/**
 * Проверить IP на вхождение в CIDR (IPv4).
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/')
  const mask = ~(2 ** (32 - Number(bits)) - 1) >>> 0

  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0

  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Проверить, является ли IP допустимым для ЮKassa webhook.
 */
export async function isYooKassaIp(ip: string): Promise<boolean> {
  // В development режиме разрешаем localhost
  if (process.env.NODE_ENV === 'development') {
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return true
    }
  }

  // Убрать IPv6 prefix если есть
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip

  return YOOKASSA_ALLOWED_CIDRS.some((cidr) => ipInCidr(ipv4, cidr))
}
