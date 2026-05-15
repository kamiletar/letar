'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Максимальное количество элементов для bulk операции (защита от OOM)
const MAX_BULK_IDS = 100
// Размер батча для параллельных запросов
const BATCH_SIZE = 10

/**
 * Reorder sizes by updating their sortOrder values.
 * Used for drag-and-drop functionality.
 *
 * @param updates - Array of {id: string, sortOrder: number} objects
 */
export async function reorderSizes(updates: { id: string; sortOrder: number }[]) {
  // 1. Authentication check
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Лимит на количество элементов
  if (updates.length > MAX_BULK_IDS) {
    throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} размеров за раз`)
  }

  // 3. Get enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // 4. Update sortOrder батчами для контроля нагрузки
  try {
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((update) =>
          db.productSize.update({
            where: { id: update.id },
            data: { sortOrder: update.sortOrder },
          })
        )
      )
    }
  } catch (error) {
    console.error('Failed to reorder sizes:', error)
    // Log actual error for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    throw new Error('Не удалось изменить порядок размеров', { cause: error })
  }

  // 5. Revalidate the sizes page to show new order
  revalidatePath('/admin/sizes')

  return { success: true }
}
