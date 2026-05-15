'use server'

import { CustomOrderType } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sendCustomOrderAdminNotification } from '@/lib/order-emails'
import { sendCustomOrderTelegramNotification } from '@/lib/telegram-notify'
import {
  type B2BPartnershipOrderFormData,
  b2bPartnershipOrderSchema,
  type CustomDesignOrderFormData,
  customDesignOrderSchema,
  type MadeToOrderFormData,
  madeToOrderSchema,
} from '../_schemas/custom-order.schema'

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CO-${timestamp}-${random}`
}

export type CreateCustomOrderResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Путь 2: На заказ (MADE_TO_ORDER)
 * Выбор модели + размер + мерки + детали кастомизации
 */
export async function createMadeToOrderOrder(
  productId: string,
  data: MadeToOrderFormData
): Promise<CreateCustomOrderResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const parsed = madeToOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  try {
    // Проверяем что вариант существует
    const variant = await db.productVariant.findUnique({
      where: { id: validatedData.variantId },
      include: { product: true },
    })

    if (!variant) {
      return { success: false, error: 'Вариант товара не найден' }
    }

    // Получаем информацию о размере если выбран
    let sizeName: string | undefined
    if (validatedData.productItemId) {
      const productItem = await db.productItem.findUnique({
        where: { id: validatedData.productItemId },
        include: { size: true },
      })
      if (productItem) {
        sizeName = productItem.size.international
      }
    }

    // Создаём заказ
    const orderNumber = generateOrderNumber()
    const order = await db.customOrder.create({
      data: {
        orderNumber,
        userId: session.user.id!,
        type: CustomOrderType.MADE_TO_ORDER,
        productId,
        variantId: validatedData.variantId,
        productItemId: validatedData.productItemId || undefined,
        customBust: validatedData.customBust,
        customWaist: validatedData.customWaist,
        customHips: validatedData.customHips,
        customHeight: validatedData.customHeight,
        customDetails: validatedData.customDetails,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || undefined,
        notes: validatedData.notes,
      },
    })

    // Send notifications to admin (fire and forget, don't block the response)
    const notificationData = {
      orderNumber,
      orderType: 'MADE_TO_ORDER' as const,
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      customerEmail: validatedData.customerEmail,
      productName: variant.product.name,
      variantName: variant.color,
      sizeName,
      customBust: validatedData.customBust,
      customWaist: validatedData.customWaist,
      customHips: validatedData.customHips,
      customHeight: validatedData.customHeight,
      customDetails: validatedData.customDetails,
      notes: validatedData.notes,
      createdAt: order.createdAt,
    }

    sendCustomOrderAdminNotification(notificationData).catch((err) =>
      console.error('Failed to send email notification:', err)
    )

    sendCustomOrderTelegramNotification(notificationData).catch((err) =>
      console.error('Failed to send Telegram notification:', err)
    )

    return { success: true, redirect: '/profile/custom-orders?success=made-to-order' }
  } catch (error) {
    console.error('Error creating made-to-order order:', error)
    return { success: false, error: 'Не удалось создать заказ. Попробуйте позже.' }
  }
}

/**
 * Путь 3: Индивидуальный заказ (CUSTOM_DESIGN)
 * Свой дизайн без привязки к модели + фото-ориентир + описание
 */
export async function createCustomDesignOrder(data: CustomDesignOrderFormData): Promise<CreateCustomOrderResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const parsed = customDesignOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  try {
    // Создаём заказ (без привязки к продукту)
    const orderNumber = generateOrderNumber()
    const order = await db.customOrder.create({
      data: {
        orderNumber,
        userId: session.user.id!,
        type: CustomOrderType.CUSTOM_DESIGN,
        // productId is null for custom design orders
        customBust: validatedData.customBust,
        customWaist: validatedData.customWaist,
        customHips: validatedData.customHips,
        customHeight: validatedData.customHeight,
        designDescription: validatedData.designDescription,
        // referenceImages now contains imageIds (IDs from Image table)
        referenceImageIds: validatedData.referenceImages ?? [],
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || undefined,
        notes: validatedData.notes,
      },
    })

    // Send notifications to admin (fire and forget, don't block the response)
    const notificationData = {
      orderNumber,
      orderType: 'CUSTOM_DESIGN' as const,
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      customerEmail: validatedData.customerEmail,
      // No product info for custom design
      customBust: validatedData.customBust,
      customWaist: validatedData.customWaist,
      customHips: validatedData.customHips,
      customHeight: validatedData.customHeight,
      designDescription: validatedData.designDescription,
      referenceImages: validatedData.referenceImages,
      notes: validatedData.notes,
      createdAt: order.createdAt,
    }

    sendCustomOrderAdminNotification(notificationData).catch((err) =>
      console.error('Failed to send email notification:', err)
    )

    sendCustomOrderTelegramNotification(notificationData).catch((err) =>
      console.error('Failed to send Telegram notification:', err)
    )

    return { success: true, redirect: '/profile/custom-orders?success=custom-design' }
  } catch (error) {
    console.error('Error creating custom design order:', error)
    return { success: false, error: 'Не удалось создать заказ. Попробуйте позже.' }
  }
}

/**
 * Путь 4: Сотрудничество B2B (B2B_PARTNERSHIP)
 * Для магазинов, баеров, брендов - модель + размерная сетка + количество + цвет
 */
export async function createB2BPartnershipOrder(
  productId: string,
  data: B2BPartnershipOrderFormData
): Promise<CreateCustomOrderResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const parsed = b2bPartnershipOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  try {
    // Проверяем что вариант существует
    const variant = await db.productVariant.findUnique({
      where: { id: validatedData.variantId },
      include: { product: true },
    })

    if (!variant) {
      return { success: false, error: 'Вариант товара не найден' }
    }

    // Подсчитываем общее количество
    const totalQuantity = validatedData.wholesaleItems.reduce((sum, item) => sum + item.quantity, 0)

    // Get size labels for email
    const sizeIds = validatedData.wholesaleItems.filter((item) => item.quantity > 0).map((item) => item.sizeId)
    const sizes = await db.productSize.findMany({
      where: { id: { in: sizeIds } },
      select: { id: true, international: true },
    })
    const sizeMap = new Map(sizes.map((s: { id: string; international: string }) => [s.id, s.international]))

    // Создаём заказ с позициями
    const orderNumber = generateOrderNumber()
    const order = await db.customOrder.create({
      data: {
        orderNumber,
        userId: session.user.id!,
        type: CustomOrderType.B2B_PARTNERSHIP,
        productId,
        variantId: validatedData.variantId,
        quantity: totalQuantity,
        companyName: validatedData.companyName,
        companyINN: validatedData.companyINN,
        companyAddress: validatedData.companyAddress,
        preferredColor: validatedData.preferredColor,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || undefined,
        notes: validatedData.notes,
        wholesaleItems: {
          create: validatedData.wholesaleItems
            .filter((item) => item.quantity > 0)
            .map((item) => ({
              sizeId: item.sizeId,
              quantity: item.quantity,
            })),
        },
      },
    })

    // Send notifications to admin (fire and forget, don't block the response)
    const notificationData = {
      orderNumber,
      orderType: 'B2B_PARTNERSHIP' as const,
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      customerEmail: validatedData.customerEmail,
      productName: variant.product.name,
      variantName: variant.color,
      companyName: validatedData.companyName,
      companyINN: validatedData.companyINN,
      companyAddress: validatedData.companyAddress,
      preferredColor: validatedData.preferredColor,
      quantity: totalQuantity,
      wholesaleItems: validatedData.wholesaleItems
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          sizeName: sizeMap.get(item.sizeId) ?? item.sizeId,
          quantity: item.quantity,
        })) as Array<{ sizeName: string; quantity: number }>,
      notes: validatedData.notes,
      createdAt: order.createdAt,
    }

    sendCustomOrderAdminNotification(notificationData).catch((err) =>
      console.error('Failed to send email notification:', err)
    )

    sendCustomOrderTelegramNotification(notificationData).catch((err) =>
      console.error('Failed to send Telegram notification:', err)
    )

    return { success: true, redirect: '/profile/custom-orders?success=b2b-partnership' }
  } catch (error) {
    console.error('Error creating B2B partnership order:', error)
    return { success: false, error: 'Не удалось создать заказ. Попробуйте позже.' }
  }
}
