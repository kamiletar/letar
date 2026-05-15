'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Удаляет товар из корзины пользователя.
 */
export async function removeFromCart(cartItemId: string) {
  try {
    // 1. Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return {
        success: false,
        error: 'Необходимо войти в систему',
      }
    }

    // 2. Получение DB клиента
    const db = getEnhancedPrisma(session.user)

    // 3. Удаление элемента корзины
    // ZenStack автоматически проверит права доступа
    await db.cartItem.delete({
      where: { id: cartItemId },
    })

    // 4. Ревалидация путей
    revalidatePath('/cart')

    return {
      success: true,
      message: 'Товар удален из корзины',
    }
  } catch (error) {
    console.error('Failed to remove from cart:', error)
    return {
      success: false,
      error: 'Не удалось удалить товар из корзины',
    }
  }
}
