'use server'

import { earnLoyaltyPoints } from '@/app/_actions/loyalty'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type UpdateOrderData, UpdateOrderSchema } from '../_schemas/order-admin.schema'

export type UpdateOrderResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Server action for updating order status and admin notes.
 * Only admins can update orders.
 */
export async function updateOrder(id: string, data: UpdateOrderData): Promise<UpdateOrderResult> {
  // 1. Authenticate and check admin role
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // 2. Validate form data
  const parsed = UpdateOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  // 4. Fetch current order to get orderNumber for redirect
  const currentOrder = await db.order.findUnique({
    where: { id },
    select: {
      orderNumber: true,
      status: true,
      customerEmail: true,
      customerName: true,
    },
  })

  if (!currentOrder) {
    return { success: false, error: 'Заказ не найден' }
  }

  // 5. Try to update the record
  try {
    await db.order.update({
      where: { id },
      data: {
        status: validatedData.status,
        adminNotes: validatedData.adminNotes || null,
      },
    })
  } catch (error) {
    console.error('Failed to update Order:', error)
    return { success: false, error: 'Не удалось обновить заказ. Попробуйте еще раз.' }
  }

  // 5.1 Начисление баллов лояльности при доставке
  if (validatedData.status === 'DELIVERED' && currentOrder.status !== 'DELIVERED') {
    try {
      const order = await db.order.findUnique({
        where: { id },
        select: { userId: true, totalAmount: true },
      })
      if (order) {
        await earnLoyaltyPoints(id, Number(order.totalAmount), order.userId)
      }
    } catch (error) {
      console.error('Failed to earn loyalty points:', error)
    }
  }

  // 6. Return success with redirect
  return { success: true, redirect: `/admin/orders/${currentOrder.orderNumber}` }
}
