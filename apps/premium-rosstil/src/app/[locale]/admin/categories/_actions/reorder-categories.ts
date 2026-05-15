'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Максимальное количество элементов для bulk операции (защита от OOM)
const MAX_BULK_IDS = 100
// Размер батча для параллельных запросов
const BATCH_SIZE = 10

export async function reorderCategories(updates: { id: string; sortOrder: number }[]) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Недостаточно прав')
  }

  // Лимит на количество элементов
  if (updates.length > MAX_BULK_IDS) {
    throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} категорий за раз`)
  }

  const db = getEnhancedPrisma(session.user)

  // Обновляем порядок сортировки батчами для контроля нагрузки
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((update) =>
        db.category.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        })
      )
    )
  }

  revalidatePath('/admin/categories')
  revalidatePath('/catalog')

  return { success: true }
}
