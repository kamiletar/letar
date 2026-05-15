import { validateWebhookToken } from '@/lib/payments/tinkoff'
import { prismaAuth } from '@/lib/prisma'
import { createCdekOrderForOrder } from '@/lib/shipping/cdek-order'
import { sendGenericEmail } from '@letar/email'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'

// T-Bank POST'ит сюда при каждом изменении статуса платежа.
// Должны ответить "OK" (text/plain) в течение 30 секунд — иначе повтор.
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response('BAD REQUEST', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  if (!validateWebhookToken(body)) {
    console.warn('[tinkoff-webhook] invalid token, body:', JSON.stringify(body))
    return new Response('INVALID TOKEN', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const status = String(body.Status ?? '')
  const orderNumber = String(body.OrderId ?? '')
  const paymentId = String(body.PaymentId ?? '')

  // Нас интересуют только события успешной оплаты
  if (status !== 'CONFIRMED' && status !== 'AUTHORIZED') {
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  const order = await prismaAuth.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })

  if (!order) {
    console.error('[tinkoff-webhook] order not found:', orderNumber)
    // Возвращаем 200 чтобы T-Bank не повторял бесконечно
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  // Идемпотентность: если уже PAID — ничего не делаем
  if (order.status === 'PAID') {
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  await prismaAuth.order.update({
    where: { id: order.id },
    data: {
      status: 'PAID',
      paymentMethod: 'TINKOFF',
      paymentExternalId: paymentId,
      paidAt: new Date(),
    },
  })

  // Асинхронно создаём заказ в СДЭК — не блокируем ответ вебхуку (T-Bank ждёт < 30с)
  createCdekOrderForOrder(order).catch((err) =>
    console.error('[tinkoff-webhook] CDEK order failed:', order.orderNumber, err)
  )

  // Email клиенту об успешной оплате
  await sendGenericEmail({
    to: order.customerEmail,
    subject: `Оплата подтверждена — заказ ${order.orderNumber}`,
    heading: 'Оплата получена!',
    greeting: `Здравствуйте, ${order.customerName}!`,
    body:
      `Оплата заказа <strong>${order.orderNumber}</strong> на сумму ` +
      `<strong>${(order.totalToPay / 100).toFixed(0)} ₽</strong> подтверждена. ` +
      `Мы уже готовим ваши обои к печати. Срок изготовления — 1 рабочий день.`,
    buttonText: 'Открыть заказ',
    buttonUrl: `${BASE_URL}/ru/profile/orders/${order.orderNumber}`,
  }).catch((err) => console.error('[tinkoff-webhook] email failed:', err))

  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
}
