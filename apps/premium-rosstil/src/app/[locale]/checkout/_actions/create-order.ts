'use server'

import { spendLoyaltyPoints } from '@/app/_actions/loyalty'
import { Prisma } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, getPrisma } from '@/lib/db'
import {
  type OrderEmailData,
  sendLowStockAdminNotification,
  sendOrderAdminNotification,
  sendOrderConfirmationToCustomer,
} from '@/lib/order-emails'
import {
  type LowStockItem,
  sendLowStockTelegramNotification,
  sendOrderTelegramNotification,
} from '@/lib/telegram-notify'
import { createPayment } from '@/lib/yookassa'
import { type CheckoutFormData, CheckoutFormSchema } from '../_schemas/checkout-form.schema'

/**
 * Генерирует уникальный номер заказа в формате ORD-YYYYMMDD-XXXXX.
 */
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0')

  return `ORD-${year}${month}${day}-${random}`
}

/**
 * Генерирует номер подзаказа в формате SUB-YYYYMMDD-XXXXX.
 */
function generateSubOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0')

  return `SUB-${year}${month}${day}-${random}`
}

export type CreateOrderResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Server action для создания заказа из корзины.
 *
 * Маркетплейс flow:
 * 1. Получить корзину с товарами + sellerId
 * 2. Сгруппировать по продавцам
 * 3. Создать Order, OrderItem'ы, SubOrder'ы, SubOrderItem'ы
 * 4. Создать Payment и вызвать ЮKassa API
 * 5. Вернуть URL оплаты для редиректа
 *
 * Если ЮKassa не настроена — fallback на старый flow без оплаты.
 */
export async function createOrder(data: CheckoutFormData): Promise<CreateOrderResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = CheckoutFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Получение корзины с товарами и продавцом
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
                  product: {
                    include: {
                      seller: { select: { id: true, commissionRate: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  // 5. Проверка, что корзина существует и не пустая
  if (!cart || cart.items.length === 0) {
    return { success: false, error: 'Ваша корзина пуста. Добавьте товары перед оформлением заказа.' }
  }

  // 6. Подсчет общей суммы
  type CartItemType = (typeof cart.items)[number]
  const subtotalAmount = cart.items.reduce((sum: number, item: CartItemType) => {
    return sum + Number(item.productItem.price) * item.quantity
  }, 0)

  // 6.1 Промокод: валидация и расчёт скидки
  let promoId: string | null = null
  let discountAmount = 0

  if (validatedData.promoCode) {
    const promo = await db.promo.findUnique({
      where: { code: validatedData.promoCode },
    })

    if (promo && promo.isActive) {
      const now = new Date()
      const isValid =
        now >= promo.dateFrom &&
        now <= promo.dateTo &&
        (!promo.maxUsages || promo.usageCount < promo.maxUsages) &&
        (!promo.minAmount || subtotalAmount >= Number(promo.minAmount))

      if (isValid && promo.perCustomer) {
        const usedByUser = await db.order.count({
          where: { userId: session.user.id, promoId: promo.id },
        })
        if (usedByUser >= promo.perCustomer) {
          return { success: false, error: 'Вы уже использовали этот промокод' }
        }
      }

      if (isValid) {
        promoId = promo.id
        if (promo.type === 'PERCENTAGE') {
          discountAmount = Math.round(subtotalAmount * (Number(promo.discount) / 100) * 100) / 100
        } else {
          discountAmount = Math.min(Number(promo.discount), subtotalAmount)
        }
      }
    }
  }

  // 6.2 Лояльность: расчёт скидки баллами
  const loyaltyPointsRequested = validatedData.loyaltyPoints || 0
  const amountAfterPromo = Math.max(0, subtotalAmount - discountAmount)

  const totalAmount = Math.max(0, amountAfterPromo - loyaltyPointsRequested)

  // 7. Генерация уникального номера заказа
  let orderNumber = generateOrderNumber()
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    const existingOrder = await db.order.findUnique({
      where: { orderNumber },
    })

    if (!existingOrder) {
      isUnique = true
    } else {
      orderNumber = generateOrderNumber()
      attempts++
    }
  }

  if (!isUnique) {
    return { success: false, error: 'Не удалось сгенерировать номер заказа. Попробуйте еще раз.' }
  }

  // 8. Группировка товаров по продавцам
  const itemsBySeller = new Map<string, { commissionRate: number; items: CartItemType[] }>()

  for (const item of cart.items) {
    const sellerId = item.productItem.variant.product.sellerId
    const commissionRate = Number(item.productItem.variant.product.seller.commissionRate)

    const group = itemsBySeller.get(sellerId)
    if (group) {
      group.items.push(item)
    } else {
      itemsBySeller.set(sellerId, { commissionRate, items: [item] })
    }
  }

  // 9. Создание заказа с транзакцией (без access control — системная операция)
  const systemDb = getPrisma()
  let createdAt: Date = new Date()
  let orderId = ''

  try {
    const txResult = await systemDb.$transaction(async (tx) => {
      // 9.1 Проверка наличия всех товаров ПЕРЕД созданием заказа
      let hasPreOrderItems = false
      for (const item of cart.items) {
        const productItem = await tx.productItem.findUnique({
          where: { id: item.productItemId },
          select: { availableCount: true, isPreOrder: true },
        })

        if (productItem?.isPreOrder) {
          hasPreOrderItems = true
          continue // Предзаказные товары не требуют наличия
        }

        if (!productItem || productItem.availableCount < item.quantity) {
          const productName = item.productItem.variant.product.name
          const sizeName = item.productItem.size.ru
          const available = productItem?.availableCount ?? 0
          throw new Error(
            `Недостаточно товара "${productName}" (размер ${sizeName}). Доступно: ${available}, запрошено: ${item.quantity}`
          )
        }
      }

      // 9.2 Создаём заказ (статус PREORDER если есть предзаказные товары)
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          status: hasPreOrderItems ? 'PREORDER' : 'NEW',
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          promoId: promoId || undefined,
          customerName: validatedData.customerName,
          customerPhone: validatedData.customerPhone,
          customerEmail: validatedData.customerEmail || null,
          deliveryAddress: validatedData.deliveryAddress,
          deliveryCity: validatedData.deliveryCity || null,
          deliveryRegion: validatedData.deliveryRegion || null,
          deliveryPostalCode: validatedData.deliveryPostalCode || null,
          notes: validatedData.notes || null,
          loyaltyPointsUsed: loyaltyPointsRequested,
        },
      })

      // 9.2.1 Увеличиваем счётчик использований промокода
      if (promoId) {
        await tx.promo.update({
          where: { id: promoId },
          data: { usageCount: { increment: 1 } },
        })
      }

      // 9.3 Создаём OrderItem для каждого товара (legacy-совместимость)
      const orderItems = cart.items.map((item: CartItemType) => ({
        orderId: order.id,
        productItemId: item.productItemId,
        quantity: item.quantity,
        price: new Prisma.Decimal(item.productItem.price.toFixed(2)),
        productName: item.productItem.variant.product.name,
        variantColor: item.productItem.variant.color,
        sizeName: item.productItem.size.ru,
      }))

      await tx.orderItem.createMany({ data: orderItems })

      // 9.4 Создаём SubOrder и SubOrderItem для каждого продавца
      for (const [sellerId, group] of itemsBySeller) {
        const subtotal = group.items.reduce((sum, item) => sum + Number(item.productItem.price) * item.quantity, 0)
        const commissionAmount = subtotal * group.commissionRate
        const sellerAmount = subtotal - commissionAmount

        const subOrder = await tx.subOrder.create({
          data: {
            subOrderNumber: generateSubOrderNumber(),
            orderId: order.id,
            sellerId,
            subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
            commissionRate: new Prisma.Decimal(group.commissionRate.toFixed(4)),
            commissionAmount: new Prisma.Decimal(commissionAmount.toFixed(2)),
            sellerAmount: new Prisma.Decimal(sellerAmount.toFixed(2)),
          },
        })

        const subOrderItems = group.items.map((item) => ({
          subOrderId: subOrder.id,
          productItemId: item.productItemId,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.productItem.price.toFixed(2)),
          productName: item.productItem.variant.product.name,
          variantColor: item.productItem.variant.color,
          sizeName: item.productItem.size.ru,
        }))

        await tx.subOrderItem.createMany({ data: subOrderItems })
      }

      // 9.5 Уменьшаем остатки атомарно (пропускаем предзаказные товары)
      for (const item of cart.items) {
        const pi = await tx.productItem.findUnique({
          where: { id: item.productItemId },
          select: { isPreOrder: true },
        })
        if (!pi?.isPreOrder) {
          await tx.productItem.update({
            where: { id: item.productItemId },
            data: { availableCount: { decrement: item.quantity } },
          })
        }
      }

      // 9.6 Очищаем корзину
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      })

      return order
    })

    createdAt = txResult.createdAt
    orderId = txResult.id
  } catch (error) {
    console.error('Failed to create order:', error)
    if (error instanceof Error && error.message.includes('Недостаточно товара')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Не удалось создать заказ. Попробуйте еще раз.' }
  }

  // 10. ЮKassa: создать платёж (если настроена)
  const hasYooKassa = process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY
  let paymentRedirectUrl: string | null = null

  if (hasYooKassa) {
    try {
      const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const returnUrl = `${baseUrl}/checkout/success?orderNumber=${orderNumber}`

      const payment = await createPayment({
        amount: totalAmount,
        description: `Заказ ${orderNumber} — Премиум РосСтиль`,
        returnUrl,
        idempotenceKey: orderId,
        metadata: {
          orderId,
          orderNumber,
        },
      })

      // Сохранить Payment в БД
      await systemDb.payment.create({
        data: {
          orderId,
          yookassaId: payment.id,
          yookassaStatus: payment.status,
          confirmationUrl: payment.confirmation?.confirmation_url ?? null,
          amount: new Prisma.Decimal(totalAmount.toFixed(2)),
        },
      })

      paymentRedirectUrl = payment.confirmation?.confirmation_url ?? null
    } catch (error) {
      // ЮKassa недоступна — не блокируем заказ, переходим к success
      console.error('[ЮKassa] Ошибка создания платежа:', error)
    }
  }

  // 11. Проверка низких остатков
  const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD) || 5

  try {
    const productItemIds = cart.items.map((item: CartItemType) => item.productItemId)
    const updatedItems = await db.productItem.findMany({
      where: { id: { in: productItemIds } },
      select: {
        availableCount: true,
        size: { select: { ru: true } },
        variant: {
          select: {
            color: true,
            product: { select: { name: true } },
          },
        },
      },
    })

    const lowStockItems: LowStockItem[] = updatedItems
      .filter((item) => item.availableCount <= LOW_STOCK_THRESHOLD)
      .map((item) => ({
        productName: item.variant.product.name,
        variantColor: item.variant.color,
        sizeName: item.size.ru,
        availableCount: item.availableCount,
      }))

    if (lowStockItems.length > 0) {
      sendLowStockTelegramNotification(lowStockItems).catch((err) =>
        console.error('Failed to send low stock Telegram notification:', err)
      )
      sendLowStockAdminNotification(lowStockItems).catch((err) =>
        console.error('Failed to send low stock email notification:', err)
      )
    }
  } catch (error) {
    console.error('Failed to check low stock:', error)
  }

  // 12. Сохранение адреса в профиль
  if (validatedData.saveToProfile) {
    try {
      const existingAddress = await db.address.findFirst({
        where: {
          userId: session.user.id,
          fullAddress: validatedData.deliveryAddress,
        },
      })

      if (!existingAddress) {
        const addressCount = await db.address.count({
          where: { userId: session.user.id },
        })

        await db.address.create({
          data: {
            userId: session.user.id,
            label: addressCount === 0 ? 'Дом' : 'Доставка',
            fullAddress: validatedData.deliveryAddress,
            postalCode: validatedData.deliveryPostalCode || null,
            region: validatedData.deliveryRegion || null,
            city: validatedData.deliveryCity || null,
            recipientName: validatedData.customerName,
            phone: validatedData.customerPhone,
            isDefault: addressCount === 0,
          },
        })
      }

      const userProfile = await db.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { phoneNumber: true },
      })

      if (!userProfile?.phoneNumber) {
        await db.userProfile.upsert({
          where: { userId: session.user.id },
          create: { userId: session.user.id, phoneNumber: validatedData.customerPhone },
          update: { phoneNumber: validatedData.customerPhone },
        })
      }
    } catch (error) {
      console.error('Failed to save address to profile:', error)
    }
  }

  // 13. Уведомления (fire and forget)
  const notificationData: OrderEmailData = {
    orderNumber,
    customerName: validatedData.customerName,
    customerPhone: validatedData.customerPhone,
    customerEmail: validatedData.customerEmail,
    deliveryAddress: validatedData.deliveryAddress,
    deliveryCity: validatedData.deliveryCity,
    deliveryRegion: validatedData.deliveryRegion,
    deliveryPostalCode: validatedData.deliveryPostalCode,
    items: cart.items.map((item: CartItemType) => ({
      productName: item.productItem.variant.product.name,
      variantColor: item.productItem.variant.color,
      sizeName: item.productItem.size.ru,
      quantity: item.quantity,
      price: Number(item.productItem.price),
    })),
    totalAmount,
    notes: validatedData.notes,
    createdAt,
  }

  sendOrderAdminNotification(notificationData).catch((err) =>
    console.error('Failed to send admin email notification:', err)
  )
  sendOrderTelegramNotification(notificationData).catch((err) =>
    console.error('Failed to send Telegram notification:', err)
  )
  if (validatedData.customerEmail) {
    sendOrderConfirmationToCustomer(validatedData.customerEmail, notificationData).catch((err) =>
      console.error('Failed to send customer email confirmation:', err)
    )
  }

  // 14. Программа лояльности: списание баллов
  if (loyaltyPointsRequested > 0) {
    spendLoyaltyPoints(orderId, amountAfterPromo, loyaltyPointsRequested, session.user.id).catch((err) =>
      console.error('Failed to spend loyalty points:', err)
    )
  }

  // 15. Редирект: на оплату ЮKassa или на success page
  if (paymentRedirectUrl) {
    return { success: true, redirect: paymentRedirectUrl }
  }

  return { success: true, redirect: `/checkout/success?orderNumber=${orderNumber}` }
}
