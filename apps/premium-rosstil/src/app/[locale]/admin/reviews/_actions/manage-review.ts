'use server'

import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { recalculateRatings } from '@/lib/review-utils'
import { revalidatePath } from 'next/cache'

/**
 * Скрыть отзыв (модерация).
 */
export async function hideReview(reviewId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    const review = (await (db.review as any).findUnique({
      where: { id: reviewId },
      select: { id: true, status: true, productId: true },
    })) as { id: string; status: string; productId: string } | null

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    if (review.status !== 'PUBLISHED') {
      return { success: false, error: 'Скрыть можно только опубликованный отзыв' }
    }

    await (db.review as any).update({
      where: { id: reviewId },
      data: {
        status: 'HIDDEN',
        hiddenById: user.id,
        hiddenReason: reason,
        hiddenAt: new Date(),
      },
    })

    await recalculateRatings(db as any, review.productId)
    revalidatePath('/admin/reviews')
    return { success: true }
  } catch (error) {
    console.error('Ошибка скрытия отзыва:', error)
    return { success: false, error: 'Не удалось скрыть отзыв' }
  }
}

/**
 * Восстановить скрытый отзыв.
 */
export async function publishReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    const review = (await (db.review as any).findUnique({
      where: { id: reviewId },
      select: { id: true, status: true, productId: true },
    })) as { id: string; status: string; productId: string } | null

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    if (review.status !== 'HIDDEN') {
      return { success: false, error: 'Опубликовать можно только скрытый отзыв' }
    }

    await (db.review as any).update({
      where: { id: reviewId },
      data: {
        status: 'PUBLISHED',
        hiddenById: null,
        hiddenReason: null,
        hiddenAt: null,
      },
    })

    await recalculateRatings(db as any, review.productId)
    revalidatePath('/admin/reviews')
    return { success: true }
  } catch (error) {
    console.error('Ошибка публикации отзыва:', error)
    return { success: false, error: 'Не удалось опубликовать отзыв' }
  }
}

/**
 * Удалить отзыв (пометить как DELETED).
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    const review = (await (db.review as any).findUnique({
      where: { id: reviewId },
      select: { id: true, productId: true },
    })) as { id: string; productId: string } | null

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    await (db.review as any).update({
      where: { id: reviewId },
      data: { status: 'DELETED' },
    })

    await recalculateRatings(db as any, review.productId)
    revalidatePath('/admin/reviews')
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления отзыва:', error)
    return { success: false, error: 'Не удалось удалить отзыв' }
  }
}
