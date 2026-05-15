'use server'

import { sendGenericEmail } from '@letar/email'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { requireAdmin } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'

import { ALL_ORDER_STATUSES, ALLOWED_ORDER_TRANSITIONS, type OrderStatusKey } from './orders-status-config'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'

type Status = OrderStatusKey

const STATUS_NOTIFICATIONS: Partial<Record<Status, { subject: string; heading: string; body: string }>> = {
  CONFIRMED: {
    subject: 'Заказ {n} подтверждён',
    heading: 'Заказ подтверждён',
    body: 'Мы приняли ваш заказ <strong>{n}</strong> в работу. Ожидайте инструкций по оплате.',
  },
  PAID: {
    subject: 'Оплата заказа {n} получена',
    heading: 'Оплата получена',
    body: 'Спасибо! Оплата заказа <strong>{n}</strong> зачислена. Запускаем печать.',
  },
  PRINTING: {
    subject: 'Заказ {n} в печати',
    heading: 'Печатаем ваш заказ',
    body: 'Ваш заказ <strong>{n}</strong> сейчас на принтере. Отгрузим на следующий день.',
  },
  SHIPPED: {
    subject: 'Заказ {n} отправлен',
    heading: 'Заказ в пути',
    body: 'Заказ <strong>{n}</strong> передан в СДЭК. Трек-номер появится в личном кабинете.',
  },
  DELIVERED: {
    subject: 'Заказ {n} доставлен',
    heading: 'Заказ доставлен',
    body: 'Спасибо за покупку! Если что-то не так — напишите нам, поможем.',
  },
  CANCELLED: {
    subject: 'Заказ {n} отменён',
    heading: 'Заказ отменён',
    body: 'Заказ <strong>{n}</strong> отменён. Если списались деньги — мы их вернём в течение 3 рабочих дней.',
  },
  REFUNDED: {
    subject: 'Возврат по заказу {n} оформлен',
    heading: 'Возврат оформлен',
    body: 'Возврат по заказу <strong>{n}</strong> оформлен. Деньги поступят на счёт в течение 10 рабочих дней.',
  },
}

const SetStatusSchema = z.object({
  status: z.enum(ALL_ORDER_STATUSES),
})

const SetTrackingSchema = z.object({
  trackingNumber: z.string().min(2).max(60),
})

const SetInternalNotesSchema = z.object({
  internalNotes: z.string().max(5000),
})

export interface AdminActionResult {
  ok: boolean
  error?: string
}

export async function setOrderStatusAction(orderId: string, raw: unknown): Promise<AdminActionResult> {
  await requireAdmin()
  const parsed = SetStatusSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Невалидный статус' }

  const order = await prismaAuth.order.findUnique({ where: { id: orderId } })
  if (!order) return { ok: false, error: 'Заказ не найден' }

  const allowed = ALLOWED_ORDER_TRANSITIONS[order.status as Status]
  if (!allowed.includes(parsed.data.status)) {
    return { ok: false, error: `Из «${order.status}» нельзя в «${parsed.data.status}»` }
  }

  const now = new Date()
  const timestampField = (() => {
    switch (parsed.data.status) {
      case 'PAID':
        return 'paidAt'
      case 'SHIPPED':
        return 'shippedAt'
      case 'DELIVERED':
        return 'deliveredAt'
      case 'CANCELLED':
        return 'cancelledAt'
      default:
        return null
    }
  })()

  await prismaAuth.order.update({
    where: { id: orderId },
    data: {
      status: parsed.data.status,
      ...(timestampField ? { [timestampField]: now } : {}),
    },
  })

  // Уведомление клиенту
  const tpl = STATUS_NOTIFICATIONS[parsed.data.status as Status]
  if (tpl) {
    void sendGenericEmail({
      to: order.customerEmail,
      subject: tpl.subject.replace('{n}', order.orderNumber),
      heading: tpl.heading,
      greeting: `Здравствуйте, ${order.customerName}!`,
      body: tpl.body.replace('{n}', order.orderNumber),
      buttonText: 'Открыть заказ',
      buttonUrl: `${BASE_URL}/profile/orders/${order.orderNumber}`,
    }).catch((err) => console.error('[orders] email failed:', err))
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${order.orderNumber}`)
  revalidatePath(`/profile/orders/${order.orderNumber}`)
  return { ok: true }
}

export async function setTrackingNumberAction(orderId: string, raw: unknown): Promise<AdminActionResult> {
  await requireAdmin()
  const parsed = SetTrackingSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Невалидный трек-номер' }

  const order = await prismaAuth.order.update({
    where: { id: orderId },
    data: { trackingNumber: parsed.data.trackingNumber },
  })

  revalidatePath(`/admin/orders/${order.orderNumber}`)
  return { ok: true }
}

export async function setInternalNotesAction(orderId: string, raw: unknown): Promise<AdminActionResult> {
  await requireAdmin()
  const parsed = SetInternalNotesSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Невалидная заметка' }

  const order = await prismaAuth.order.update({
    where: { id: orderId },
    data: { internalNotes: parsed.data.internalNotes },
  })

  revalidatePath(`/admin/orders/${order.orderNumber}`)
  return { ok: true }
}

