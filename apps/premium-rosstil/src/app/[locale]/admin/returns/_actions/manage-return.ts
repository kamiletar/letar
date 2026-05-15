'use server'

import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma, getPrisma } from '@/lib/db'
import { createRefund } from '@/lib/yookassa'
import { revalidatePath } from 'next/cache'

/**
 * Одобрить запрос на возврат.
 * Устанавливает статус APPROVED, записывает сумму возврата.
 */
export async function approveReturn(
  returnId: string,
  refundAmount: number,
  reviewNote?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    const returnRecord = (await db.return.findUnique({
      where: { id: returnId },
      select: { id: true, status: true },
    })) as { id: string; status: string } | null

    if (!returnRecord) {
      return { success: false, error: 'Возврат не найден' }
    }

    if (returnRecord.status !== 'REQUESTED') {
      return { success: false, error: 'Возврат можно одобрить только в статусе "Запрошен"' }
    }

    await (db.return as any).update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        refundAmount,
      },
    })

    revalidatePath('/admin/returns')
    revalidatePath(`/admin/returns/${returnId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка одобрения возврата:', error)
    return { success: false, error: 'Не удалось одобрить возврат' }
  }
}

/**
 * Отклонить запрос на возврат.
 */
export async function rejectReturn(
  returnId: string,
  reviewNote: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    const returnRecord = (await db.return.findUnique({
      where: { id: returnId },
      select: { id: true, status: true },
    })) as { id: string; status: string } | null

    if (!returnRecord) {
      return { success: false, error: 'Возврат не найден' }
    }

    if (returnRecord.status !== 'REQUESTED') {
      return { success: false, error: 'Отклонить можно только запрос в статусе "Запрошен"' }
    }

    await (db.return as any).update({
      where: { id: returnId },
      data: {
        status: 'REJECTED',
        reviewedBy: user.id,
        reviewNote,
        reviewedAt: new Date(),
      },
    })

    revalidatePath('/admin/returns')
    revalidatePath(`/admin/returns/${returnId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка отклонения возврата:', error)
    return { success: false, error: 'Не удалось отклонить возврат' }
  }
}

/**
 * Обновить статус возврата (для промежуточных статусов: SHIPPED_BACK → RECEIVED → REFUNDED).
 */
export async function updateReturnStatus(
  returnId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  /** Допустимые переходы статусов */
  const allowedTransitions: Record<string, string[]> = {
    APPROVED: ['SHIPPED_BACK'],
    SHIPPED_BACK: ['RECEIVED'],
    RECEIVED: ['REFUNDED'],
  }

  try {
    const returnRecord = (await db.return.findUnique({
      where: { id: returnId },
      include: {
        subOrder: {
          include: {
            order: {
              include: {
                payments: {
                  where: { status: 'SUCCEEDED' },
                  take: 1,
                },
              },
            },
            items: { select: { productItemId: true, quantity: true } },
          },
        },
      },
    })) as {
      id: string
      status: string
      refundAmount: unknown
      subOrder: {
        id: string
        sellerId: string
        subtotal: unknown
        sellerAmount: unknown
        order: {
          id: string
          payments: Array<{ id: string; yookassaId: string | null; amount: unknown }>
        }
        items: Array<{ productItemId: string; quantity: number }>
      }
    } | null

    if (!returnRecord) {
      return { success: false, error: 'Возврат не найден' }
    }

    const currentStatus = returnRecord.status
    const allowed = allowedTransitions[currentStatus]

    if (!allowed || !allowed.includes(newStatus)) {
      return { success: false, error: `Нельзя перевести из ${currentStatus} в ${newStatus}` }
    }

    // При переходе в REFUNDED — вызов ЮKassa Refund API + корректировка баланса
    if (newStatus === 'REFUNDED') {
      return await processRefund(returnRecord)
    }

    await (db.return as any).update({
      where: { id: returnId },
      data: { status: newStatus },
    })

    revalidatePath('/admin/returns')
    revalidatePath(`/admin/returns/${returnId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления статуса возврата:', error)
    return { success: false, error: 'Не удалось обновить статус' }
  }
}

/** Тип данных возврата для processRefund */
interface ReturnForRefund {
  id: string
  refundAmount: unknown
  subOrder: {
    id: string
    sellerId: string
    subtotal: unknown
    sellerAmount: unknown
    order: {
      id: string
      payments: Array<{ id: string; yookassaId: string | null; amount: unknown }>
    }
    items: Array<{ productItemId: string; quantity: number }>
  }
}

/**
 * Обработка возврата средств через ЮKassa.
 * Вызывает Refund API, корректирует баланс продавца, восстанавливает остатки.
 */
async function processRefund(returnRecord: ReturnForRefund): Promise<{ success: boolean; error?: string }> {
  const db = getPrisma()

  const refundAmount = Number(returnRecord.refundAmount)
  if (!refundAmount || refundAmount <= 0) {
    return { success: false, error: 'Сумма возврата не задана' }
  }

  const payment = returnRecord.subOrder.order.payments[0]
  if (!payment?.yookassaId) {
    return { success: false, error: 'Платёж ЮKassa не найден для этого заказа' }
  }

  // 1. Вызов ЮKassa Refund API
  try {
    await createRefund({
      paymentId: payment.yookassaId,
      amount: refundAmount,
      description: `Возврат #${returnRecord.id.slice(-6)} по подзаказу ${returnRecord.subOrder.id.slice(-6)}`,
    })
  } catch (error) {
    console.error('[Refund] Ошибка ЮKassa Refund API:', error)
    return {
      success: false,
      error: `Ошибка ЮKassa: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`,
    }
  }

  // 2. Транзакция: обновить статусы + баланс + остатки
  const subtotal = Number(returnRecord.subOrder.subtotal)
  const sellerAmount = Number(returnRecord.subOrder.sellerAmount)
  // Пропорциональная сумма вычета из баланса продавца
  const sellerDeduction = subtotal > 0 ? Math.round(refundAmount * (sellerAmount / subtotal) * 100) / 100 : 0

  await db.$transaction(async (tx) => {
    // Обновить Return → REFUNDED
    await tx.return.update({
      where: { id: returnRecord.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    })

    // Обновить SubOrder → RETURNED
    await tx.subOrder.update({
      where: { id: returnRecord.subOrder.id },
      data: { status: 'RETURNED' },
    })

    // Уменьшить баланс продавца (pendingAmount)
    if (sellerDeduction > 0) {
      await tx.sellerBalance.update({
        where: { sellerId: returnRecord.subOrder.sellerId },
        data: {
          pendingAmount: { decrement: sellerDeduction },
        },
      })
    }

    // Восстановить остатки товаров
    for (const item of returnRecord.subOrder.items) {
      await tx.productItem.update({
        where: { id: item.productItemId },
        data: { availableCount: { increment: item.quantity } },
      })
    }
  })

  console.warn(
    `[Refund] Возврат выполнен: return=${returnRecord.id}, сумма=${refundAmount}₽, вычет продавца=${sellerDeduction}₽`
  )

  revalidatePath('/admin/returns')
  revalidatePath(`/admin/returns/${returnRecord.id}`)
  revalidatePath('/seller/returns')
  revalidatePath('/seller/finances')
  return { success: true }
}
