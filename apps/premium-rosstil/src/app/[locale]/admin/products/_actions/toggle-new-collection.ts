'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Переключает флаг "Новая коллекция" для одного продукта
 */
export async function toggleNewCollection(productId: string, isNewCollection: boolean) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Недостаточно прав')
  }

  const db = getEnhancedPrisma(session.user)

  await db.product.update({
    where: { id: productId },
    data: { isNewCollection },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')

  return { success: true }
}

/**
 * Массово снимает флаг "Новая коллекция" с продуктов по фильтрам
 */
export async function bulkRemoveNewCollection(filters: {
  olderThanDays?: number // Продукты старше N дней
  categoryId?: string // Продукты определённой категории
  all?: boolean // Все продукты с флагом новинки
}) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Недостаточно прав')
  }

  const db = getEnhancedPrisma(session.user)

  const where: { isNewCollection: boolean; createdAt?: { lt: Date }; categoryId?: string } = {
    isNewCollection: true,
  }

  // Фильтр по дате создания
  if (filters.olderThanDays) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - filters.olderThanDays)
    where.createdAt = { lt: cutoffDate }
  }

  // Фильтр по категории
  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  // Считаем сколько будет затронуто
  const count = await db.product.count({ where })

  if (count === 0) {
    return { success: true, count: 0 }
  }

  // Обновляем
  await db.product.updateMany({
    where,
    data: { isNewCollection: false },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')

  return { success: true, count }
}
