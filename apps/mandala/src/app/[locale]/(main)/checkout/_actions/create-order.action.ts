'use server'

import { prisma } from '@/lib/db'
import { notifyNewOrder } from '@/lib/telegram'
import { redirect } from 'next/navigation'
import {
  type CartItemData,
  CartItemsArraySchema,
  type CheckoutFormInput,
  CheckoutFormSchema,
} from '../_schemas/checkout.schema'

/** Результат создания заказа */
export type CreateOrderResult = { success: true } | { success: false; error: string }

export async function createOrderAction(data: CheckoutFormInput): Promise<CreateOrderResult> {
  const parsed = CheckoutFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // Type-safe парсинг данных корзины через Zod
  let cartItems: CartItemData[]
  try {
    const jsonData = JSON.parse(parsed.data.cartItems)
    const cartResult = CartItemsArraySchema.safeParse(jsonData)

    if (!cartResult.success) {
      console.error('Cart validation failed:', cartResult.error.flatten())
      return { success: false, error: 'Некорректные данные корзины' }
    }

    cartItems = cartResult.data
  } catch {
    return { success: false, error: 'Корзина пуста или содержит некорректные данные' }
  }

  // Вычисляем итого
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  let orderId: string

  try {
    // Используем транзакцию для атомарности
    const order = await prisma.$transaction(async (tx) => {
      // 1. Проверяем наличие товаров и блокируем записи
      const products = await tx.product.findMany({
        where: { id: { in: cartItems.map((item) => item.productId) } },
        select: { id: true, name: true, stock: true },
      })

      // Проверяем, что все товары найдены
      const productMap = new Map(products.map((p) => [p.id, p]))
      for (const item of cartItems) {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new Error(`Товар не найден: ${item.productId}`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`Недостаточно товара "${product.name}" в наличии (доступно: ${product.stock})`)
        }
      }

      // 2. Уменьшаем stock для каждого товара
      for (const item of cartItems) {
        const product = productMap.get(item.productId)
        if (!product) {
          continue
        } // Уже проверено выше, но TypeScript требует
        const newStock = product.stock - item.quantity
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            inStock: newStock > 0, // Автоматически обновляем inStock
          },
        })
      }

      // 3. Создаём заказ
      return tx.order.create({
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          comment: parsed.data.comment || null,
          total,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      })
    })

    orderId = order.id

    // Отправляем Telegram уведомление (fire-and-forget)
    const orderWithItems = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    if (orderWithItems) {
      notifyNewOrder(orderWithItems).catch((err) => {
        console.error('[Telegram] Failed to notify about order:', err)
      })
    }
  } catch (error) {
    console.error('Failed to create order:', error)
    // Показываем понятное сообщение если товара не хватает
    if (error instanceof Error && error.message.includes('Недостаточно товара')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Не удалось создать заказ. Попробуйте еще раз.' }
  }

  // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
  redirect(`/checkout/success?orderId=${orderId}`)
}
