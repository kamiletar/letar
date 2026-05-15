'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для добавления товара в избранное.
 */
export async function addToWishlist(productVariantId: string) {
  // Проверка авторизации
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем или создаем wishlist пользователя
    let wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
    })

    if (!wishlist) {
      wishlist = await db.wishlist.create({
        data: { userId: session.user.id },
      })
    }

    // Добавляем товар в избранное (если еще не добавлен)
    await db.wishlistItem.upsert({
      where: {
        wishlistId_productVariantId: {
          wishlistId: wishlist.id,
          productVariantId,
        },
      },
      create: {
        wishlistId: wishlist.id,
        productVariantId,
      },
      update: {}, // Если уже есть, ничего не делаем
    })

    // Инвалидируем кэш страницы избранного и каталога
    revalidatePath('/profile/wishlist')
    revalidatePath('/catalog')

    return { success: true }
  } catch (error) {
    console.error('Failed to add to wishlist:', error)
    throw new Error('Не удалось добавить в избранное', { cause: error })
  }
}
