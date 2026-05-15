import { prismaAuth } from '@/lib/prisma'
import { sendGenericEmail } from '@letar/email'
import { createHmac } from 'crypto'
import { revalidatePath } from 'next/cache'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'

// HMAC-SHA256 подпись: CDEK шлёт X-API-Sign = hex(hmac-sha256(rawBody, CDEK_CLIENT_SECRET))
function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.CDEK_CLIENT_SECRET
  if (!secret) {return false}
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

// СДЭК POST'ит сюда события трекинга.
// Регистрация вебхука: POST /v2/webhooks { url, type: 'ORDER_STATUS' } — один раз через CDEK ЛК.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('X-Api-Sign') ?? ''

  if (!verifySignature(rawBody, signature)) {
    console.warn('[cdek-webhook] invalid signature')
    return new Response('INVALID SIGNATURE', { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return new Response('BAD REQUEST', { status: 400 })
  }

  // Обрабатываем только ORDER_STATUS
  if (payload.type !== 'ORDER_STATUS') {
    return new Response('OK', { status: 200 })
  }

  const attrs = (payload.attributes ?? {}) as Record<string, string | undefined>
  const cdekUuid = attrs.uuid
  const imNumber = attrs.im_number // наш orderNumber
  const statusCode = attrs.type
  const trackNumber = attrs.code

  if (!cdekUuid && !imNumber) {
    return new Response('OK', { status: 200 })
  }

  const order = await prismaAuth.order.findFirst({
    where: cdekUuid ? { cdekOrderUuid: cdekUuid } : { orderNumber: imNumber },
  })

  if (!order) {
    console.warn('[cdek-webhook] order not found, uuid:', cdekUuid, 'im_number:', imNumber)
    return new Response('OK', { status: 200 })
  }

  const updateData: Record<string, unknown> = {}

  if (cdekUuid && !order.cdekOrderUuid) {updateData.cdekOrderUuid = cdekUuid}
  if (trackNumber && !order.trackingNumber) {updateData.trackingNumber = trackNumber}

  // Переводим статус СДЭК в наш статус заказа
  if (statusCode === 'SENDED') {
    updateData.status = 'SHIPPED'
  } else if (statusCode === 'RECEIVED_AT_ADDRESS') {
    updateData.status = 'DELIVERED'
  }

  if (Object.keys(updateData).length > 0) {
    await prismaAuth.order
      .update({ where: { id: order.id }, data: updateData })
      .catch((err) => console.error('[cdek-webhook] update failed:', err))
  }

  // Уведомляем клиента при передаче в доставку
  if (statusCode === 'SENDED') {
    await sendGenericEmail({
      to: order.customerEmail,
      subject: `Заказ ${order.orderNumber} передан в доставку — НейроАбоИ`,
      heading: 'Ваш заказ в пути!',
      greeting: `Здравствуйте, ${order.customerName}!`,
      body:
        `Заказ <strong>${order.orderNumber}</strong> передан в СДЭК и уже едет к вам.` +
        (trackNumber ? ` Трек-номер для отслеживания: <strong>${trackNumber}</strong>.` : ''),
      buttonText: 'Отследить заказ',
      buttonUrl: trackNumber
        ? `https://www.cdek.ru/ru/tracking/?order_id=${trackNumber}`
        : `${BASE_URL}/ru/profile/orders/${order.orderNumber}`,
    }).catch((err) => console.error('[cdek-webhook] email failed:', err))
  }

  revalidatePath(`/profile/orders/${order.orderNumber}`)
  revalidatePath(`/admin/orders/${order.orderNumber}`)

  return new Response('OK', { status: 200 })
}
