// Хелпер создания заказа СДЭК после оплаты T-Bank

import type { Order } from '@/generated/prisma/client'
import { prismaAuth } from '@/lib/prisma'
import { createCdekOrder, getFromLocation } from './cdek'
import { estimatePackage, toCdekPackage } from './package-estimator'

interface OrderForCdek extends Order {
  items: Array<{ lengthMeters: unknown }>
}

/** Создаёт заказ в СДЭК для оплаченного заказа. Идемпотентен (guard по cdekOrderUuid). */
export async function createCdekOrderForOrder(order: OrderForCdek): Promise<void> {
  // Не создаём СДЭК заказ для метода «уточнит менеджер»
  if (order.shippingMethod === 'MANAGER_CALL') {return}
  // CDEK не настроен
  if (!process.env.CDEK_CLIENT_ID) {return}
  // Идемпотентность: уже создан
  if (order.cdekOrderUuid) {return}

  const tariffCode = order.shippingMethod === 'CDEK_POINT' ? 136 : 137

  const totalMeters = order.items.reduce((s, it) => s + Number(it.lengthMeters), 0)
  const dims = estimatePackage(totalMeters)
  const pkg = toCdekPackage(dims)

  // Разбираем снэпшот адреса доставки
  const addr = order.shippingAddressSnapshot as Record<string, string> | null
  if (!addr?.city) {
    console.error('[cdek-order] missing address snapshot for order:', order.orderNumber)
    return
  }

  const result = await createCdekOrder({
    tariff_code: tariffCode,
    from_location: getFromLocation(),
    to_location: {
      postal_code: addr.postalCode,
      city: addr.city,
      address: [addr.street, addr.building, addr.apartment].filter(Boolean).join(', '),
    },
    ...(order.shippingMethod === 'CDEK_POINT' && order.pvzCode ? { delivery_point: order.pvzCode } : {}),
    recipient: {
      name: order.customerName,
      phones: [{ number: order.customerPhone }],
      email: order.customerEmail,
    },
    packages: [pkg],
    comment: order.orderNumber,
  })

  if (!result) {
    console.error('[cdek-order] createCdekOrder returned null for order:', order.orderNumber)
    return
  }

  await prismaAuth.order
    .update({
      where: { id: order.id },
      data: {
        cdekOrderUuid: result.uuid,
        trackingNumber: result.trackNumber ?? null,
      },
    })
    .catch((err) => console.error('[cdek-order] failed to save cdekOrderUuid:', err))
}
