'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для удаления товара из избранного.
 */
export async function removeFromWishlist(productVariantId: string) {
  // Проверка авторизации
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем wishlist пользователя
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
    })

    if (!wishlist) {
      throw new Error('Wishlist not found')
    }

    // Удаляем товар из избранного
    await db.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productVariantId,
      },
    })

    // Инвалидируем кэш страницы избранного
    revalidatePath('/profile/wishlist')

    return { success: true }
  } catch (error) {
    console.error('Failed to remove from wishlist:', error)
    throw new Error('Не удалось удалить из избранного', { cause: error })
  }
}
