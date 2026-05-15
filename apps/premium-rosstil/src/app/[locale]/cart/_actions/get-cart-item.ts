'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Получает информацию о конкретном товаре в корзине пользователя.
 * Возвращает null если товара нет в корзине или пользователь не авторизован.
 */
export async function getCartItem(productItemId: string) {
  try {
    // 1. Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return null
    }

    // 2. Получение DB клиента
    const db = getEnhancedPrisma(session.user)

    // 3. Получение корзины пользователя
    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          where: {
            productItemId,
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return null
    }

    // 4. Возвращаем информацию о товаре в корзине
    const cartItem = cart.items[0]
    return {
      id: cartItem.id,
      quantity: cartItem.quantity,
    }
  } catch (error) {
    console.error('Failed to get cart item:', error)
    return null
  }
}
