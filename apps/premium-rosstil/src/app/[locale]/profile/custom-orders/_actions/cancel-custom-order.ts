'use server'

import { redirect } from '@/i18n/server-redirect'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sendCustomOrderStatusChangeNotification } from '@/lib/order-emails'

/**
 * Server action for cancelling a custom order by the user.
 * User can only cancel orders with status NEW.
 */
export async function cancelCustomOrder(orderId: string): Promise<{ error?: string }> {
  // 1. Authenticate
  const session = await getSession()

  if (!session?.user) {
    return { error: 'Необходимо войти в аккаунт' }
  }

  // 2. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  // 3. Fetch order - ZenStack ensures user can only access their own orders
  const order = await db.customOrder.findUnique({
    where: { id: orderId },
    include: {
      product: {
        select: { name: true },
      },
    },
  })

  if (!order) {
    return { error: 'Заказ не найден' }
  }

  // 4. Check if order can be cancelled (only NEW status)
  if (order.status !== 'NEW') {
    return { error: 'Отменить можно только новые заказы' }
  }

  // 5. Update order status to CANCELLED
  try {
    await db.customOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    })
  } catch (error) {
    console.error('Failed to cancel CustomOrder:', error)
    return { error: 'Не удалось отменить заказ. Попробуйте еще раз.' }
  }

  // 6. Send email notification if customer has email
  if (order.customerEmail) {
    sendCustomOrderStatusChangeNotification(order.customerEmail, {
      orderNumber: order.orderNumber,
      orderType: order.type,
      customerName: order.customerName,
      newStatus: 'CANCELLED',
      productName: order.product?.name,
      orderId,
    }).catch((error) => {
      console.error('Failed to send cancellation email:', error)
    })
  }

  // 7. Redirect back to orders list with success message
  return redirect('/profile/custom-orders?cancelled=true')
}
