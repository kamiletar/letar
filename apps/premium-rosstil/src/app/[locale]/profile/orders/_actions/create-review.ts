'use server'

import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { recalculateRatings } from '@/lib/review-utils'
import { revalidatePath } from 'next/cache'
import { CreateReviewSchema } from '../_schemas/review.schema'

/**
 * Создать отзыв на товар.
 *
 * Проверки:
 * 1. Авторизация
 * 2. Валидация данных
 * 3. Проверка покупки (DELIVERED/COMPLETED SubOrder) + минимум 1 день
 * 4. Rate limit: макс 3 отзыва в день
 * 5. Уникальность: один отзыв на товар от покупателя
 */
export async function createReview(input: unknown): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const db = getEnhancedPrisma(user)

  // Валидация
  const parsed = CreateReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { productId, rating, text, images } = parsed.data

  // Проверка покупки: должен быть доставленный SubOrder с этим товаром + минимум 1 день
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const purchaseItem = await (db.subOrderItem as any).findFirst({
    where: {
      subOrder: {
        status: { in: ['DELIVERED', 'COMPLETED'] },
        deliveredAt: { lte: dayAgo },
        order: { userId: user.id },
      },
      productItemId: {
        in: await getProductItemIds(db, productId),
      },
    },
    select: { id: true },
  })

  if (!purchaseItem) {
    return { success: false, error: 'Отзыв можно оставить минимум через 1 день после доставки' }
  }

  // Rate limit: макс 3 отзыва в день
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todayCount = await (db.review as any).count({
    where: {
      authorId: user.id,
      createdAt: { gte: startOfDay },
    },
  })

  if (todayCount >= 3) {
    return { success: false, error: 'Максимум 3 отзыва в день' }
  }

  // Проверка уникальности
  const existing = await (db.review as any).findFirst({
    where: { authorId: user.id, productId },
  })

  if (existing) {
    return { success: false, error: 'Вы уже оставили отзыв на этот товар' }
  }

  try {
    await (db.review as any).create({
      data: {
        authorId: user.id,
        productId,
        rating,
        text: text || null,
        images,
      },
    })

    // Пересчёт рейтинга товара и продавца
    await recalculateRatings(db as any, productId)

    revalidatePath(`/catalog/${productId}`)
    revalidatePath('/profile/orders')
    return { success: true }
  } catch (error) {
    console.error('Ошибка создания отзыва:', error)
    return { success: false, error: 'Не удалось создать отзыв' }
  }
}

/**
 * Получить ID всех ProductItem для данного productId.
 * Нужно для проверки покупки через SubOrderItem → ProductItem → Variant → Product.
 */
async function getProductItemIds(db: ReturnType<typeof getEnhancedPrisma>, productId: string): Promise<string[]> {
  const items = await (db.productItem as any).findMany({
    where: { variant: { productId } },
    select: { id: true },
  })
  return items.map((i: { id: string }) => i.id)
}
