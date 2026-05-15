'use server'

import type { WishlistPriority } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface UpdateWishlistItemInput {
  itemId: string
  note?: string | null
  priority?: WishlistPriority
  tags?: string[]
}

/**
 * Server action для обновления заметки, приоритета и тегов wishlist item.
 */
export async function updateWishlistItem({ itemId, note, priority, tags }: UpdateWishlistItemInput) {
  // Проверка авторизации
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Обновляем wishlist item
    await db.wishlistItem.update({
      where: { id: itemId },
      data: {
        ...(note !== undefined && { note }),
        ...(priority !== undefined && { priority }),
        ...(tags !== undefined && { tags }),
      },
    })

    // Инвалидируем кэш страницы избранного
    revalidatePath('/profile/wishlist')

    return { success: true }
  } catch (error) {
    console.error('Failed to update wishlist item:', error)
    throw new Error('Не удалось обновить элемент избранного', { cause: error })
  }
}
