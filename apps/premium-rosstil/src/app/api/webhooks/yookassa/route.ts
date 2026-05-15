import { getPrisma } from '@/lib/db'
import {
  type SellerSubOrderNotificationData,
  sendSellerSubOrderEmail,
  sendSellerSubOrderTelegram,
} from '@/lib/seller-notifications'
import { isYooKassaIp, type YooKassaNotification, type YooKassaPayment } from '@/lib/yookassa'
import { NextResponse } from 'next/server'

/**
 * Webhook для обработки уведомлений от ЮKassa.
 *
 * Обрабатываемые события:
 * - payment.succeeded — оплата прошла → CONFIRMED + SubOrder → PAID + начисление баланса
 * - payment.canceled — оплата отменена → отмена заказа + восстановление остатков
 * - refund.succeeded — возврат → обновление статуса Payment
 *
 * @see https://yookassa.ru/developers/using-api/webhooks
 */
export async function POST(request: Request) {
  // 1. Верификация IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || '0.0.0.0'

  if (!isYooKassaIp(ip)) {
    console.warn(`[ЮKassa Webhook] Запрос с неразрешённого IP: ${ip}`)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Парсинг тела
  let notification: YooKassaNotification
  try {
    notification = (await request.json()) as YooKassaNotification
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (notification.type !== 'notification') {
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  console.warn(`[ЮKassa Webhook] Событие: ${notification.event}`)

  const db = getPrisma()

  try {
    switch (notification.event) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(db, notification.object as YooKassaPayment)
        break

      case 'payment.canceled':
        await handlePaymentCanceled(db, notification.object as YooKassaPayment)
        break

      case 'refund.succeeded':
        await handleRefundSucceeded(db, notification.object)
        break

      default:
        console.warn(`[ЮKassa Webhook] Неизвестное событие: ${notification.event}`)
    }
  } catch (error) {
    console.error(`[ЮKassa Webhook] Ошибка обработки ${notification.event}:`, error)
    // Возвращаем 200 чтобы ЮKassa не повторяла запрос бесконечно
    // Ошибки логируются и обрабатываются вручную
  }

  return NextResponse.json({ success: true })
}

/**
 * Оплата прошла успешно.
 * - Payment → SUCCEEDED
 * - Order → CONFIRMED
 * - SubOrders → PAID
 * - SellerBalance.pendingAmount += sellerAmount
 */
async function handlePaymentSucceeded(db: ReturnType<typeof getPrisma>, payment: YooKassaPayment) {
  const paymentRecord = await db.payment.findUnique({
    where: { yookassaId: payment.id },
    select: { id: true, orderId: true },
  })

  if (!paymentRecord) {
    console.warn(`[ЮKassa] Payment не найден: yookassaId=${payment.id}`)
    return
  }

  await db.$transaction(async (tx) => {
    // Обновить Payment
    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'SUCCEEDED',
        yookassaStatus: payment.status,
        paidAt: new Date(),
      },
    })

    // Обновить Order → CONFIRMED
    await tx.order.update({
      where: { id: paymentRecord.orderId },
      data: { status: 'CONFIRMED' },
    })

    // Обновить все SubOrders → PAID + начислить pendingAmount продавцам
    const subOrders = await tx.subOrder.findMany({
      where: { orderId: paymentRecord.orderId },
    })

    for (const subOrder of subOrders) {
      await tx.subOrder.update({
        where: { id: subOrder.id },
        data: { status: 'PAID' },
      })

      // Начислить pendingAmount на баланс продавца
      await tx.sellerBalance.upsert({
        where: { sellerId: subOrder.sellerId },
        create: {
          sellerId: subOrder.sellerId,
          pendingAmount: subOrder.sellerAmount,
        },
        update: {
          pendingAmount: { increment: Number(subOrder.sellerAmount) },
        },
      })
    }
  })

  console.warn(`[ЮKassa] Оплата подтверждена: order=${paymentRecord.orderId}`)

  // Уведомления продавцам (fire-and-forget, после транзакции)
  notifySellersBySubOrders(db, paymentRecord.orderId).catch((err) =>
    console.error('[ЮKassa] Ошибка отправки уведомлений продавцам:', err)
  )
}

/**
 * Оплата отменена.
 * - Payment → CANCELLED
 * - Order → CANCELLED
 * - SubOrders → CANCELLED
 * - Восстановить остатки товаров
 */
async function handlePaymentCanceled(db: ReturnType<typeof getPrisma>, payment: YooKassaPayment) {
  const paymentRecord = await db.payment.findUnique({
    where: { yookassaId: payment.id },
    select: { id: true, orderId: true },
  })

  if (!paymentRecord) {
    console.warn(`[ЮKassa] Payment не найден: yookassaId=${payment.id}`)
    return
  }

  await db.$transaction(async (tx) => {
    // Обновить Payment
    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'CANCELLED',
        yookassaStatus: payment.status,
      },
    })

    // Обновить Order → CANCELLED
    await tx.order.update({
      where: { id: paymentRecord.orderId },
      data: { status: 'CANCELLED' },
    })

    // Отменить все SubOrders
    await tx.subOrder.updateMany({
      where: { orderId: paymentRecord.orderId },
      data: { status: 'CANCELLED' },
    })

    // Восстановить остатки товаров
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: paymentRecord.orderId },
      select: { productItemId: true, quantity: true },
    })

    for (const item of orderItems) {
      await tx.productItem.update({
        where: { id: item.productItemId },
        data: { availableCount: { increment: item.quantity } },
      })
    }
  })

  console.warn(`[ЮKassa] Оплата отменена, остатки восстановлены: order=${paymentRecord.orderId}`)
}

/**
 * Возврат прошёл успешно.
 * - Payment → REFUNDED / PARTIALLY_REFUNDED
 */
async function handleRefundSucceeded(db: ReturnType<typeof getPrisma>, refund: unknown) {
  const refundData = refund as { payment_id?: string; amount?: { value?: string } }
  if (!refundData.payment_id) {
    return
  }

  const paymentRecord = await db.payment.findUnique({
    where: { yookassaId: refundData.payment_id },
    select: { id: true, amount: true },
  })

  if (!paymentRecord) {
    console.warn(`[ЮKassa] Payment не найден для refund: payment_id=${refundData.payment_id}`)
    return
  }

  // Определить полный или частичный возврат
  const refundAmount = Number(refundData.amount?.value ?? 0)
  const paymentAmount = Number(paymentRecord.amount)
  const isFullRefund = refundAmount >= paymentAmount

  await db.payment.update({
    where: { id: paymentRecord.id },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      yookassaStatus: 'refunded',
    },
  })

  console.warn(`[ЮKassa] Возврат обработан: payment=${paymentRecord.id}, сумма=${refundAmount}`)
}

/**
 * Отправить уведомления продавцам о новых подзаказах.
 * Вызывается после успешной оплаты (fire-and-forget).
 */
async function notifySellersBySubOrders(db: ReturnType<typeof getPrisma>, orderId: string) {
  // ZenStack enhanced client не поддерживает глубокие include-типы,
  // используем any для обхода TS ограничений
  const subOrders = (await (db.subOrder as any).findMany({
    where: { orderId },
    include: {
      seller: {
        select: { contactEmail: true, telegramChatId: true },
      },
      items: {
        include: {
          productItem: {
            include: {
              product: { select: { name: true } },
              variant: { select: { color: true } },
              size: { select: { name: true } },
            },
          },
        },
      },
      order: {
        select: { orderNumber: true, customerName: true },
      },
    },
  })) as Array<{
    id: string
    createdAt: Date
    totalAmount: { toString(): string }
    commissionAmount: { toString(): string }
    sellerAmount: { toString(): string }
    seller: { contactEmail: string; telegramChatId: string | null }
    order: { orderNumber: string; customerName: string }
    items: Array<{
      quantity: number
      price: { toString(): string }
      productItem: {
        product: { name: string }
        variant: { color: string } | null
        size: { name: string } | null
      }
    }>
  }>

  for (const sub of subOrders) {
    const data: SellerSubOrderNotificationData = {
      orderNumber: sub.order.orderNumber,
      subOrderId: sub.id,
      customerName: sub.order.customerName,
      items: sub.items.map((item) => ({
        productName: item.productItem.product.name,
        variantColor: item.productItem.variant?.color ?? undefined,
        sizeName: item.productItem.size?.name ?? undefined,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      totalAmount: Number(sub.totalAmount),
      commissionAmount: Number(sub.commissionAmount),
      sellerAmount: Number(sub.sellerAmount),
      createdAt: sub.createdAt,
    }

    // Email
    if (sub.seller.contactEmail) {
      sendSellerSubOrderEmail(sub.seller.contactEmail, data).catch(() => {
        /* fire-and-forget */
      })
    }

    // Telegram
    if (sub.seller.telegramChatId) {
      sendSellerSubOrderTelegram(sub.seller.telegramChatId, data).catch(() => {
        /* fire-and-forget */
      })
    }
  }
}
