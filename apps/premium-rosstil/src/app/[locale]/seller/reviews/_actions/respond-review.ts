'use server'

import { ReviewResponseSchema } from '@/app/[locale]/profile/orders/_schemas/review.schema'
import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Ответить на отзыв (продавец).
 * Продавец может ответить только на отзывы к своим товарам.
 */
export async function respondToReview(input: unknown): Promise<{ success: boolean; error?: string }> {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  const parsed = ReviewResponseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { reviewId, response } = parsed.data

  try {
    // Проверка: отзыв существует и принадлежит товару продавца
    const review = (await (db.review as any).findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        response: true,
        productId: true,
        product: {
          select: { seller: { select: { id: true, userId: true } } },
        },
      },
    })) as {
      id: string
      response: string | null
      productId: string
      product: { seller: { id: string; userId: string } }
    } | null

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    // Проверка принадлежности: товар должен быть продавца
    if (review.product.seller.userId !== user.id && user.role !== 'ADMIN') {
      return { success: false, error: 'Это не ваш товар' }
    }

    // Проверка: ответ ещё не дан
    if (review.response) {
      return { success: false, error: 'Ответ уже был дан' }
    }

    await (db.review as any).update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date(),
        respondedById: user.id,
      },
    })

    revalidatePath('/seller/reviews')
    revalidatePath(`/catalog/${review.productId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка ответа на отзыв:', error)
    return { success: false, error: 'Не удалось отправить ответ' }
  }
}
