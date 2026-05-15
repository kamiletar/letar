import { createHash } from 'crypto'

const TBANK_API = 'https://securepay.tinkoff.ru/v2'

export interface TBankReceiptItem {
  Name: string
  Price: number // копейки за единицу
  Quantity: number // количество (метры — допускает дробное)
  Amount: number // итог в копейках = Price * Quantity
  Tax: 'none' | 'vat0' | 'vat10' | 'vat20'
  PaymentMethod: string
  PaymentObject: string
}

export interface TBankReceipt {
  Email: string
  Taxation: 'usn_income' | 'usn_income_outcome' | 'osn' | 'patent'
  Items: TBankReceiptItem[]
}

export interface InitPaymentInput {
  orderNumber: string
  totalKopecks: number
  customerEmail: string
  description: string
  successUrl: string
  failUrl: string
  receipt: TBankReceipt
}

export interface InitPaymentResult {
  ok: true
  paymentId: string
  paymentUrl: string
}

export interface InitPaymentError {
  ok: false
  error: string
}

// SHA-256 HMAC по правилам T-Bank:
// - добавить Password в набор параметров
// - исключить Token, Receipt, Shops, DATA (вложенные объекты/массивы)
// - отсортировать ключи по алфавиту
// - конкатенировать только значения (без ключей, без разделителей)
// - SHA-256 от строки
function buildToken(params: Record<string, unknown>, password: string): string {
  const copy: Record<string, unknown> = { ...params, Password: password }
  delete copy.Token
  delete copy.Receipt
  delete copy.Shops
  delete copy.DATA

  const str = Object.keys(copy)
    .sort()
    .map((k) => String(copy[k]))
    .join('')

  return createHash('sha256').update(str).digest('hex')
}

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult | InitPaymentError> {
  const terminalKey = process.env.TBANK_TERMINAL_KEY
  const password = process.env.TBANK_PASSWORD

  if (!terminalKey || !password) {
    return { ok: false, error: 'T-Bank credentials not configured' }
  }

  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    Amount: input.totalKopecks,
    OrderId: input.orderNumber,
    Description: input.description,
    SuccessURL: input.successUrl,
    FailURL: input.failUrl,
    NotificationURL: process.env.TBANK_NOTIFICATION_URL ?? '',
    Receipt: input.receipt,
  }

  body.Token = buildToken(body, password)

  const res = await fetch(`${TBANK_API}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    return { ok: false, error: `T-Bank HTTP ${res.status}` }
  }

  const data = (await res.json()) as {
    Success: boolean
    ErrorCode: string
    Message?: string
    PaymentId?: string
    PaymentURL?: string
  }

  if (!data.Success || !data.PaymentId || !data.PaymentURL) {
    return { ok: false, error: data.Message ?? `T-Bank error ${data.ErrorCode}` }
  }

  return {
    ok: true,
    paymentId: String(data.PaymentId),
    paymentUrl: data.PaymentURL,
  }
}

// Валидация входящего webhook: пересчитываем токен из полей тела
// и сравниваем с полем Token
export function validateWebhookToken(body: Record<string, unknown>): boolean {
  const password = process.env.TBANK_PASSWORD
  if (!password) return false

  const expected = buildToken(body, password)
  return expected === String(body.Token ?? '')
}

// Строит Receipt для 54-ФЗ из позиций заказа
// ИП Гаев на УСН "доходы 6%" — taxation: usn_income, tax: none
// shippingKopecks > 0 → отдельная строка «Доставка СДЭК» (PaymentObject: service)
export function buildReceipt(
  customerEmail: string,
  items: Array<{
    productNameSnapshot: string
    lengthMeters: string | number
    unitPrice: number
    total: number
  }>,
  shippingKopecks = 0
): TBankReceipt {
  const receiptItems: TBankReceiptItem[] = items.map((item) => ({
    Name: String(item.productNameSnapshot).slice(0, 128),
    Price: item.unitPrice,
    Quantity: Number(Number(item.lengthMeters).toFixed(3)),
    Amount: item.total,
    Tax: 'none',
    PaymentMethod: 'full_prepayment',
    PaymentObject: 'commodity',
  }))

  if (shippingKopecks > 0) {
    receiptItems.push({
      Name: 'Доставка СДЭК',
      Price: shippingKopecks,
      Quantity: 1,
      Amount: shippingKopecks,
      Tax: 'none',
      PaymentMethod: 'full_prepayment',
      PaymentObject: 'service',
    })
  }

  return {
    Email: customerEmail,
    Taxation: 'usn_income',
    Items: receiptItems,
  }
}
