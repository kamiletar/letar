'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sendCustomOrderStatusChangeNotification } from '@/lib/order-emails'
import { type UpdateCustomOrderData, UpdateCustomOrderSchema } from '../_schemas/custom-order-admin.schema'

export type UpdateCustomOrderResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Server action for updating custom order status and admin notes.
 * Only admins can update orders.
 */
export async function updateCustomOrder(id: string, data: UpdateCustomOrderData): Promise<UpdateCustomOrderResult> {
  // 1. Authenticate and check admin role
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // 2. Validate form data
  const parsed = UpdateCustomOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  // 4. Fetch current order to check if status changed
  const currentOrder = await db.customOrder.findUnique({
    where: { id },
    include: {
      product: {
        select: { name: true },
      },
    },
  })

  if (!currentOrder) {
    return { success: false, error: 'Заказ не найден' }
  }

  const statusChanged = currentOrder.status !== validatedData.status

  // 5. Try to update the record
  try {
    await db.customOrder.update({
      where: { id },
      data: {
        status: validatedData.status,
        adminNotes: validatedData.adminNotes || null,
      },
    })
  } catch (error) {
    console.error('Failed to update CustomOrder:', error)
    return { success: false, error: 'Не удалось обновить заказ. Попробуйте еще раз.' }
  }

  // 6. Send email notification if status changed and customer has email
  if (statusChanged && currentOrder.customerEmail) {
    // Fire and forget - don't block the response
    sendCustomOrderStatusChangeNotification(currentOrder.customerEmail, {
      orderNumber: currentOrder.orderNumber,
      orderType: currentOrder.type,
      customerName: currentOrder.customerName,
      newStatus: validatedData.status,
      productName: currentOrder.product?.name,
      orderId: id,
    }).catch((error) => {
      console.error('Failed to send status change email:', error)
    })
  }

  // 7. Return success with redirect
  return { success: true, redirect: `/admin/custom-orders/${id}` }
}
