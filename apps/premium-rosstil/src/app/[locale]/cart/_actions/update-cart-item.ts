'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Обновляет количество товара в корзине.
 */
export async function updateCartItem(cartItemId: string, quantity: number) {
  try {
    // 1. Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return {
        success: false,
        error: 'Необходимо войти в систему',
      }
    }

    // 2. Валидация количества
    if (quantity < 1) {
      return {
        success: false,
        error: 'Количество должно быть больше 0',
      }
    }

    // 3. Получение DB клиента
    const db = getEnhancedPrisma(session.user)

    // 4. Получение элемента корзины с товаром
    const cartItem = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        productItem: true,
      },
    })

    if (!cartItem) {
      return {
        success: false,
        error: 'Элемент корзины не найден',
      }
    }

    // 5. Проверка наличия на складе
    if (cartItem.productItem.availableCount < quantity) {
      return {
        success: false,
        error: `Недостаточно товара на складе. Доступно: ${cartItem.productItem.availableCount}`,
      }
    }

    // 6. Обновление количества
    await db.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    })

    // 7. Ревалидация путей
    revalidatePath('/cart')

    return {
      success: true,
      message: 'Количество обновлено',
    }
  } catch (error) {
    console.error('Failed to update cart item:', error)
    return {
      success: false,
      error: 'Не удалось обновить количество',
    }
  }
}
