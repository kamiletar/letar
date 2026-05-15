'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { z } from 'zod/v4'

const UpdateSubOrderSchema = z
  .object({
    trackingNumber: z.string().min(1, 'Введите трекинг-номер'),
  })
  .strip()

export type UpdateSubOrderResult = { success: true } | { success: false; error: string }

/**
 * Обновить подзаказ: установить трекинг-номер и статус SHIPPED.
 * ZenStack policies проверяют что подзаказ принадлежит текущему продавцу.
 */
export async function markSubOrderShipped(
  subOrderId: string,
  data: { trackingNumber: string }
): Promise<UpdateSubOrderResult> {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
    return { success: false, error: 'Требуются права продавца' }
  }

  const parsed = UpdateSubOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите трекинг-номер' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.subOrder.update({
      where: { id: subOrderId },
      data: {
        trackingNumber: parsed.data.trackingNumber,
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to update sub-order:', error)
    return { success: false, error: 'Не удалось обновить заказ' }
  }

  return { success: true }
}
