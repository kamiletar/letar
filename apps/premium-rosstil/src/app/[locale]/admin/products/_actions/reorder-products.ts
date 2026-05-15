'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Максимальное количество элементов для bulk операции (защита от OOM)
const MAX_BULK_IDS = 100
// Размер батча для параллельных запросов
const BATCH_SIZE = 10

/**
 * Обновляет порядок сортировки продуктов.
 * Принимает массив объектов { id, sortOrder }.
 */
export async function reorderProducts(productOrders: Array<{ id: string; sortOrder: number }>) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // Лимит на количество элементов
  if (productOrders.length > MAX_BULK_IDS) {
    throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} продуктов за раз`)
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Обновляем sortOrder батчами для контроля нагрузки
    for (let i = 0; i < productOrders.length; i += BATCH_SIZE) {
      const batch = productOrders.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((product) =>
          db.product.update({
            where: { id: product.id },
            data: { sortOrder: product.sortOrder },
          })
        )
      )
    }
  } catch (error) {
    console.error('Failed to reorder products:', error)
    throw new Error('Не удалось изменить порядок продуктов', { cause: error })
  }

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}
