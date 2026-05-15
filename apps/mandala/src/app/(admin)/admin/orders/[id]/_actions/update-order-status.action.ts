'use server'

import type { ActionResult } from '@/app/_types/action-results'
import type { OrderStatus } from '@/generated/prisma'
import { assertAdminAuth } from '@/lib/actions'
import { revalidatePath } from 'next/cache'

/**
 * Обновляет статус заказа.
 * @param orderId - ID заказа
 * @param status - Новый статус заказа
 * @returns ActionResult с результатом операции
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ActionResult> {
  const { db } = await assertAdminAuth()

  try {
    await db.order.update({
      where: { id: orderId },
      data: { status },
    })

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { success: true }
  } catch (error) {
    console.error('Failed to update order status:', error)
    return { success: false, error: 'Не удалось обновить статус заказа' }
  }
}

/**
 * Версия updateOrderStatus для использования в form action.
 * Не возвращает значение (void) для совместимости с <form action>.
 */
export async function updateOrderStatusFormAction(orderId: string, status: OrderStatus): Promise<void> {
  await updateOrderStatus(orderId, status)
}
