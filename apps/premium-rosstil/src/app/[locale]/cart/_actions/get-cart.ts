'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'

/**
 * Получает корзину пользователя со всеми товарами и деталями.
 */
export async function getCart() {
  try {
    // 1. Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return null
    }

    // 2. Получение DB клиента
    const db = getEnhancedPrisma(session.user)

    // 3. Получение корзины со всеми связанными данными
    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            productItem: {
              include: {
                size: true,
                variant: {
                  include: {
                    product: true,
                    images: {
                      include: {
                        image: true, // Включаем связь с Image
                      },
                      orderBy: {
                        order: 'asc',
                      },
                      take: 1, // Берем только первое изображение для превью
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!cart) {
      return null
    }

    // 4. Сериализация Decimal полей и преобразование images для передачи в Client Components
    return {
      ...cart,
      items: cart.items.map((item: (typeof cart.items)[number]) => ({
        ...item,
        productItem: {
          ...item.productItem,
          // Используем parseFloat + toString для корректной конвертации Decimal
          price: parseFloat(item.productItem.price.toString()),
          variant: {
            ...item.productItem.variant,
            // Преобразуем изображения: добавляем url из image.path
            images: item.productItem.variant.images.map((vi: (typeof item.productItem.variant.images)[number]) => ({
              id: vi.id,
              url: getImageUrl(vi.image.path),
              alt: vi.alt,
            })),
          },
        },
      })),
    }
  } catch (error) {
    console.error('Failed to get cart:', error)
    return null
  }
}

/**
 * Получает количество товаров в корзине (для индикатора в header).
 */
export async function getCartItemCount() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return 0
    }

    const db = getEnhancedPrisma(session.user)

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: true,
      },
    })

    if (!cart) {
      return 0
    }

    // Возвращаем общее количество товаров (сумма всех quantity)
    return cart.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
  } catch (error) {
    console.error('Failed to get cart item count:', error)
    return 0
  }
}
