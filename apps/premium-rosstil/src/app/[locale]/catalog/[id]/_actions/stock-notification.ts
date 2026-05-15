'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Подписаться на уведомление о поступлении товара.
 * Создаёт запись StockNotification для указанного ProductItem.
 */
export async function subscribeToStockNotification(
  productItemId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const db = getEnhancedPrisma(session.user)

  // Проверяем что ProductItem существует
  const productItem = await db.productItem.findUnique({
    where: { id: productItemId },
    select: { availableCount: true },
  })

  if (!productItem) {
    return { success: false, error: 'Товар не найден' }
  }

  if (productItem.availableCount > 0) {
    return { success: false, error: 'Товар уже есть в наличии' }
  }

  // Проверяем, нет ли уже подписки
  const existing = await db.stockNotification.findUnique({
    where: {
      userId_productItemId: {
        userId: session.user.id,
        productItemId,
      },
    },
  })

  if (existing) {
    return { success: false, error: 'Вы уже подписаны на это уведомление' }
  }

  try {
    await db.stockNotification.create({
      data: {
        userId: session.user.id,
        productItemId,
        email: session.user.email,
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Не удалось подписаться' }
  }
}

/**
 * Отписаться от уведомления о поступлении.
 */
export async function unsubscribeFromStockNotification(
  productItemId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.stockNotification.delete({
      where: {
        userId_productItemId: {
          userId: session.user.id,
          productItemId,
        },
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Подписка не найдена' }
  }
}
