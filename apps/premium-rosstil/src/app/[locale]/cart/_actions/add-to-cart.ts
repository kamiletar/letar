'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Добавляет товар в корзину пользователя.
 * Если товар уже есть в корзине, увеличивает количество.
 * Если корзины нет - создает новую.
 */
export async function addToCart(productItemId: string, quantity = 1) {
  try {
    // 1. Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return {
        success: false,
        error: 'Необходимо войти в систему для добавления товаров в корзину',
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

    // 4. Проверка существования товара
    const productItem = await db.productItem.findUnique({
      where: { id: productItemId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        size: true,
      },
    })

    if (!productItem) {
      return {
        success: false,
        error: 'Товар не найден',
      }
    }

    // 5. Проверка наличия на складе
    if (productItem.availableCount < quantity) {
      return {
        success: false,
        error: `Недостаточно товара на складе. Доступно: ${productItem.availableCount}`,
      }
    }

    // 6. Получение или создание корзины
    let cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: true,
      },
    })

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId: session.user.id,
        },
        include: {
          items: true,
        },
      })
    }

    // 7. Проверка, есть ли товар уже в корзине
    const existingItem = await db.cartItem.findUnique({
      where: {
        cartId_productItemId: {
          cartId: cart.id,
          productItemId,
        },
      },
    })

    if (existingItem) {
      // Обновляем количество
      const newQuantity = existingItem.quantity + quantity

      // Проверяем наличие для нового количества
      if (productItem.availableCount < newQuantity) {
        return {
          success: false,
          error: `Недостаточно товара на складе. Доступно: ${productItem.availableCount}, в корзине уже: ${existingItem.quantity}`,
        }
      }

      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      })
    } else {
      // Создаем новый элемент корзины
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productItemId,
          quantity,
        },
      })
    }

    // 8. Ревалидация путей
    revalidatePath('/cart')
    revalidatePath('/catalog')

    return {
      success: true,
      message: 'Товар добавлен в корзину',
    }
  } catch (error) {
    console.error('Failed to add to cart:', error)
    return {
      success: false,
      error: 'Не удалось добавить товар в корзину',
    }
  }
}
