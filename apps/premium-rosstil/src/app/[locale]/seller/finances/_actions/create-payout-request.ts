'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type PayoutRequestFormData, PayoutRequestSchema } from '../_schemas/payout-request.schema'

export type CreatePayoutRequestResult = { success: true } | { success: false; error: string }

/**
 * Создать запрос на выплату.
 */
export async function createPayoutRequest(data: PayoutRequestFormData): Promise<CreatePayoutRequestResult> {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
    return { success: false, error: 'Требуются права продавца' }
  }

  const parsed = PayoutRequestSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const db = getEnhancedPrisma(session.user)

  // Найти Seller и баланс
  const seller = await db.seller.findUnique({
    where: { userId: session.user.id },
    include: { balance: true },
  })

  if (!seller) {
    return { success: false, error: 'Профиль продавца не найден' }
  }

  // Проверить доступный баланс
  const availableAmount = Number(seller.balance?.availableAmount ?? 0)
  if (parsed.data.requestedAmount > availableAmount) {
    return { success: false, error: `Недостаточно средств. Доступно: ${availableAmount} ₽` }
  }

  try {
    // Определить статус: если есть чек — на проверке, иначе черновик
    const hasReceipt =
      parsed.data.receiptNumber || (parsed.data.receiptImageIds && parsed.data.receiptImageIds.length > 0)

    await db.payoutRequest.create({
      data: {
        sellerId: seller.id,
        // ZenStack v3 Decimal — string representation
        requestedAmount: parsed.data.requestedAmount as never,
        receiptNumber: parsed.data.receiptNumber,
        receiptDate: parsed.data.receiptDate ? new Date(parsed.data.receiptDate) : null,
        receiptAmount: parsed.data.receiptAmount !== undefined ? (parsed.data.receiptAmount as never) : null,
        receiptImageIds: parsed.data.receiptImageIds ?? [],
        sellerNote: parsed.data.sellerNote,
        status: hasReceipt ? 'PENDING_REVIEW' : 'DRAFT',
      },
    })
  } catch (error) {
    console.error('Failed to create payout request:', error)
    return { success: false, error: 'Не удалось создать запрос на выплату' }
  }

  return { success: true }
}
