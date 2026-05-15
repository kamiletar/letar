import { randomBytes } from 'node:crypto'
import { prismaAuth } from './prisma'

/**
 * Crockford Base32 алфавит (без I/L/O/U — для уменьшения путаницы при ручном вводе).
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const DEFAULT_EXPIRY_MONTHS = 12

/**
 * Генерирует уникальный код сертификата (16 символов, формат `XXXX-XXXX-XXXX-XXXX`).
 */
export function generateCertificateCode(): string {
  const bytes = randomBytes(10)
  const chars: string[] = []
  for (let i = 0; i < 16; i++) {
    chars.push(CROCKFORD[bytes[i % bytes.length]! % CROCKFORD.length])
  }
  return chars.join('').replace(/(.{4})/g, '$1-').replace(/-$/, '')
}

/**
 * Генерирует 4-значный PIN.
 */
export function generatePin(): string {
  const n = randomBytes(2).readUInt16BE(0) % 10_000
  return n.toString().padStart(4, '0')
}

export interface CreateCertificateInput {
  initialAmount: number
  issuedToEmail?: string | null
  expiryMonths?: number
}

export async function createCertificate(input: CreateCertificateInput) {
  const bcrypt = await import('bcryptjs')

  let code = ''
  for (let i = 0; i < 5; i++) {
    code = generateCertificateCode()
    const exists = await prismaAuth.giftCertificate.findUnique({ where: { code } })
    if (!exists) break
    if (i === 4) throw new Error('Не удалось сгенерировать уникальный код сертификата')
  }

  const pin = generatePin()
  const pinHash = await bcrypt.hash(pin, 10)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + (input.expiryMonths ?? DEFAULT_EXPIRY_MONTHS))

  const cert = await prismaAuth.giftCertificate.create({
    data: {
      code,
      pinHash,
      initialAmount: input.initialAmount,
      currentBalance: input.initialAmount,
      issuedToEmail: input.issuedToEmail ?? null,
      expiresAt,
      transactions: {
        create: {
          amount: input.initialAmount,
          reason: 'PURCHASE',
        },
      },
    },
  })

  // PIN возвращаем только при создании — потом достать нельзя (хранится только хэш)
  return { code: cert.code, pin, expiresAt: cert.expiresAt, id: cert.id }
}

export interface RedeemCertificateResult {
  ok: boolean
  /// Сколько списано (копейки)
  amount?: number
  /// Остаток после списания
  remainingBalance?: number
  certificateId?: string
  error?: string
}

/**
 * Валидация кода+PIN и расчёт максимально возможной суммы списания.
 * НЕ меняет баланс — это делает `applyCertificateRedemption` в транзакции placeOrder.
 */
export async function validateCertificate(
  rawCode: string,
  rawPin: string,
  desiredAmount: number,
): Promise<RedeemCertificateResult> {
  const bcrypt = await import('bcryptjs')

  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Введите код сертификата' }
  if (!/^\d{4}$/.test(rawPin)) return { ok: false, error: 'PIN должен быть из 4 цифр' }

  const cert = await prismaAuth.giftCertificate.findUnique({ where: { code } })
  if (!cert) return { ok: false, error: 'Сертификат не найден' }

  const pinOk = await bcrypt.compare(rawPin, cert.pinHash)
  if (!pinOk) return { ok: false, error: 'Неверный PIN' }

  if (!cert.isActive) return { ok: false, error: 'Сертификат деактивирован' }
  if (cert.expiresAt < new Date()) {
    return { ok: false, error: 'Срок действия истёк. Обратитесь в поддержку для возврата средств.' }
  }
  if (cert.currentBalance <= 0) return { ok: false, error: 'Баланс сертификата исчерпан' }

  const amount = Math.min(cert.currentBalance, desiredAmount)
  return {
    ok: true,
    amount,
    remainingBalance: cert.currentBalance - amount,
    certificateId: cert.id,
  }
}
