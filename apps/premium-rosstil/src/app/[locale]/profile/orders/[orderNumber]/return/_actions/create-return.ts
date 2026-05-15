'use server'

import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ReturnRequestSchema } from '../_schemas/return-request.schema'

/**
 * Создать запрос на возврат товара.
 * Покупатель может запросить возврат для SubOrder в статусе DELIVERED.
 */
export async function createReturn(input: unknown): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const db = getEnhancedPrisma(user)

  const parsed = ReturnRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { subOrderId, reason, description, images } = parsed.data

  // Проверить что SubOrder существует и принадлежит пользователю
  const subOrder = await db.subOrder.findUnique({
    where: { id: subOrderId },
    select: {
      id: true,
      status: true,
      order: { select: { userId: true, orderNumber: true } },
    },
  })

  if (!subOrder) {
    return { success: false, error: 'Подзаказ не найден' }
  }

  const order = subOrder.order as typeof subOrder.order & { userId: string; orderNumber: string }

  if (order.userId !== user.id) {
    return { success: false, error: 'Подзаказ не принадлежит вам' }
  }

  // Возврат только для доставленных заказов
  if (subOrder.status !== 'DELIVERED') {
    return { success: false, error: 'Возврат возможен только для доставленных заказов' }
  }

  // Проверить что нет активного возврата
  const existingReturn = await db.return.findFirst({
    where: {
      subOrderId,
      status: { in: ['REQUESTED', 'APPROVED', 'SHIPPED_BACK'] as never[] },
    },
  })

  if (existingReturn) {
    return { success: false, error: 'По этому заказу уже есть активный запрос на возврат' }
  }

  try {
    await db.return.create({
      data: {
        subOrderId,
        reason,
        description: description || null,
        images: images || [],
      },
    })

    revalidatePath(`/profile/orders/${order.orderNumber}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка создания возврата:', error)
    return { success: false, error: 'Не удалось создать запрос на возврат' }
  }
}
