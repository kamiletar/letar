'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function reorderVariantImages(productId: string, imageOrders: Array<{ id: string; order: number }>) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Обновляем order для всех изображений
    await Promise.all(
      imageOrders.map((img) =>
        db.variantImage.update({
          where: { id: img.id },
          data: { order: img.order },
        })
      )
    )
  } catch (error) {
    console.error('Failed to reorder variant images:', error)
    throw new Error('Не удалось изменить порядок изображений', { cause: error })
  }

  revalidatePath(`/admin/products/${productId}/edit`)
}
