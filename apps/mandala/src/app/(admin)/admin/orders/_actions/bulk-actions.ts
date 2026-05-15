'use server'

import type { OrderStatus } from '@/generated/prisma'
import { assertAdminAuth } from '@/lib/actions'
import { revalidatePath } from 'next/cache'

/**
 * Массовое обновление статуса заказов
 */
export async function bulkUpdateOrderStatus(ids: string[], status: OrderStatus): Promise<void> {
  const { db } = await assertAdminAuth()
  await db.order.updateMany({
    where: { id: { in: ids } },
    data: { status },
  })
  revalidatePath('/admin/orders')
}
