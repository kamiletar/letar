'use server'

import type { Prisma } from '@/generated/prisma/client'
import { sendGenericEmail } from '@letar/email'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod/v4'
import { auth } from './auth'
import { validateCertificate } from './gift-certificate'
import { buildReceipt, initPayment } from './payments/tinkoff'
import { prismaAuth } from './prisma'
import { validatePromo } from './promo'
import { createReferralEarningForOrder, spendBalanceForOrder } from './referral'
import { calculateShippingCosts } from './shipping/cdek'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'
const ADMIN_EMAIL = process.env.ABOI_ADMIN_EMAIL ?? 'admin@aboi.local'

/**
 * Снэпшот адреса доставки. Если используем DaData — сохраняем raw для будущей кастомизации.
 */
const AddressSnapshotSchema = z
  .object({
    country: z.string().min(2).max(64).default('Россия'),
    // Для CDEK_POINT адрес курьера не нужен — поля опциональны,
    // условная валидация выполняется ниже по shippingMethod
    region: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    street: z.string().max(200).optional(),
    building: z.string().max(40).optional(),
    apartment: z.string().max(40).optional(),
    postalCode: z.string().min(4).max(12),
    /// Полный адрес одной строкой (для писем и СДЭК)
    fullAddress: z.string().min(5).max(500).optional(),
    /// Сырой ответ DaData (если использовался) — для будущих интеграций
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strip()

const PlaceOrderInputSchema = z
  .object({
    customerName: z.string().min(2).max(120),
    customerEmail: z.email(),
    customerPhone: z.string().min(5).max(40),
    shippingMethod: z.enum(['CDEK_POINT', 'CDEK_DOOR', 'MANAGER_CALL']),
    address: AddressSnapshotSchema,
    customerNotes: z.string().max(2000).optional(),
    /// Промокод (опционально)
    promoCode: z.string().max(40).optional(),
    /// Подарочный сертификат (опционально, оба поля вместе)
    certificateCode: z.string().max(40).optional(),
    certificatePin: z.string().max(8).optional(),
    /// Списать бонусы с UserBalance (копейки), 0 = не списывать
    useBalance: z.coerce.number().int().min(0).default(0),
    /// Согласие с офертой и политикой ПДн
    consentAccepted: z.literal(true, { message: 'Необходимо согласие с офертой и политикой ПДн' }),
    /// Стоимость доставки в копейках (рассчитана клиентом, перепроверяется сервером)
    shippingCostKopecks: z.coerce.number().int().min(0).default(0),
    /// Код ПВЗ СДЭК (только для CDEK_POINT)
    pvzCode: z.string().max(20).optional(),
  })
  .strip()

export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>

export interface PlaceOrderResult {
  ok: boolean
  orderNumber?: string
  paymentUrl?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Генерирует номер заказа ORD-YYYYMMDD-XXXXX, где XXXXX — счётчик заказов за этот день.
 * Не используем cuid в номере — клиент должен мочь сообщить номер по телефону.
 */
async function nextOrderNumber(): Promise<string> {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const datePart = `${yyyy}${mm}${dd}`

  const startOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate()))
  const endOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate() + 1))

  const todayCount = await prismaAuth.order.count({
    where: { createdAt: { gte: startOfDay, lt: endOfDay } },
  })
  const seq = String(todayCount + 1).padStart(5, '0')
  return `ORD-${datePart}-${seq}`
}

/**
 * Server action: оформляет заказ из текущей корзины.
 * - Транзакционно создаёт Order + OrderItems со снэпшотом, помечает Cart CONVERTED.
 * - Отправляет письмо клиенту и админу (через @letar/email / Mailhog в dev).
 * - userId в Order = id текущего юзера (anonymous — допустимо: клиент потом может зарегистрироваться).
 */
export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  // Для курьерской доставки и согласования — требуем полный адрес
  if (parsed.data.shippingMethod !== 'CDEK_POINT') {
    const a = parsed.data.address
    if (!a.region || a.region.length < 2) {
      return { ok: false, error: 'Укажите регион / область' }
    }
    if (!a.city || a.city.length < 2) {
      return { ok: false, error: 'Укажите город' }
    }
    if (!a.street || a.street.length < 2) {
      return { ok: false, error: 'Укажите улицу' }
    }
    if (!a.building || a.building.length < 1) {
      return { ok: false, error: 'Укажите номер дома' }
    }
  }

  // Для CDEK_POINT — требуем код ПВЗ
  if (parsed.data.shippingMethod === 'CDEK_POINT' && !parsed.data.pvzCode?.trim()) {
    return { ok: false, error: 'Выберите пункт выдачи СДЭК' }
  }

  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) {
    return { ok: false, error: 'Сессия истекла. Обновите страницу и попробуйте снова.' }
  }
  const userId = session.user.id

  const cart = await prismaAuth.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              published: true,
              deletedAt: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                include: { image: { select: { path: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: 'Корзина пуста' }
  }

  // Финальная проверка: товары всё ещё в продаже
  for (const item of cart.items) {
    if (!item.product.published || item.product.deletedAt) {
      return { ok: false, error: `Товар «${item.product.name}» снят с продажи. Удалите его из корзины.` }
    }
  }

  const itemsTotal = cart.items.reduce((sum, it) => {
    return sum + Math.round(Number(it.lengthMeters) * it.unitPrice)
  }, 0)

  // ===== Промокод =====
  let discountTotal = 0
  let promoId: string | null = null
  let promoCodeUsed: string | null = null
  if (parsed.data.promoCode?.trim()) {
    const promo = await validatePromo(parsed.data.promoCode, itemsTotal)
    if (!promo.ok) return { ok: false, error: promo.error ?? 'Промокод не подошёл' }
    discountTotal = promo.discount ?? 0
    promoId = promo.promoId ?? null
    promoCodeUsed = promo.promoCode ?? null
  }

  const afterDiscount = Math.max(0, itemsTotal - discountTotal)

  // ===== Подарочный сертификат =====
  let certificateApplied = 0
  let giftCertificateId: string | null = null
  if (parsed.data.certificateCode?.trim() && parsed.data.certificatePin?.trim()) {
    const cert = await validateCertificate(parsed.data.certificateCode, parsed.data.certificatePin, afterDiscount)
    if (!cert.ok) return { ok: false, error: cert.error ?? 'Сертификат не подошёл' }
    certificateApplied = cert.amount ?? 0
    giftCertificateId = cert.certificateId ?? null
  }

  const afterCertificate = Math.max(0, afterDiscount - certificateApplied)

  // ===== Серверная проверка стоимости доставки (защита от подмены клиентом) =====
  let shippingCostKopecks = parsed.data.shippingCostKopecks
  const totalMeters = cart.items.reduce((s, it) => s + Number(it.lengthMeters), 0)

  if (parsed.data.shippingMethod !== 'MANAGER_CALL' && process.env.CDEK_CLIENT_ID && shippingCostKopecks > 0) {
    const serverCosts = await calculateShippingCosts(parsed.data.address.postalCode, totalMeters).catch(() => null)
    if (serverCosts) {
      const expected = parsed.data.shippingMethod === 'CDEK_POINT' ? serverCosts.point : serverCosts.door
      if (expected !== null) {
        const diff = Math.abs((shippingCostKopecks - expected) / expected)
        if (diff > 0.05) {
          return {
            ok: false,
            error: 'Стоимость доставки изменилась, пока вы оформляли заказ. Обновите страницу.',
          }
        }
        // Используем серверное значение как авторитетное
        shippingCostKopecks = expected
      }
    }
    // CDEK недоступен серверно → принимаем клиентское значение (graceful degradation)
  }

  // ===== Бонусы с UserBalance =====
  const balanceToSpend = Math.min(parsed.data.useBalance, afterCertificate)

  const totalToPay = Math.max(0, afterCertificate - balanceToSpend + shippingCostKopecks)

  const orderNumber = await nextOrderNumber()

  const order = await prismaAuth.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PLACED',
        shippingMethod: parsed.data.shippingMethod,
        paymentMethod: 'PENDING',
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone,
        shippingAddressSnapshot: parsed.data.address as unknown as Prisma.InputJsonValue,
        itemsTotal,
        discountTotal,
        certificateApplied,
        shippingCost: shippingCostKopecks,
        pvzCode: parsed.data.pvzCode ?? null,
        totalToPay,
        promoCodeUsed,
        giftCertificateId,
        customerNotes: parsed.data.customerNotes,
      },
    })

    // Фиксируем использование промокода
    if (promoId) {
      await tx.promoUsage.create({
        data: { promoId, orderId: created.id, userId },
      })
      await tx.promo.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } })
    }

    // Списываем с сертификата
    if (giftCertificateId && certificateApplied > 0) {
      await tx.giftCertificate.update({
        where: { id: giftCertificateId },
        data: { currentBalance: { decrement: certificateApplied } },
      })
      await tx.giftCertificateTransaction.create({
        data: {
          certificateId: giftCertificateId,
          orderId: created.id,
          amount: -certificateApplied,
          reason: 'REDEEM',
        },
      })
    }

    // Списываем бонусы (если выбрано)
    if (balanceToSpend > 0) {
      const result = await spendBalanceForOrder({
        userId,
        amount: balanceToSpend,
        orderId: created.id,
        tx: tx as unknown as typeof prismaAuth,
      })
      if (!result.ok) {
        throw new Error(result.error ?? 'Не удалось списать бонусы')
      }
    }

    for (const item of cart.items) {
      const length = Number(item.lengthMeters)
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: item.productId,
          productNameSnapshot: item.product.name,
          productImageSnapshot: item.product.images[0]?.image.path ?? null,
          lengthMeters: item.lengthMeters,
          unitPrice: item.unitPrice,
          total: Math.round(length * item.unitPrice),
        },
      })
    }

    // Помечаем корзину как Converted и очищаем позиции — но не удаляем (история)
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
    await tx.cart.update({ where: { id: cart.id }, data: { status: 'CONVERTED' } })

    return created
  })

  // Реферальный заработок — создаём PENDING earning, если есть атрибуция
  await createReferralEarningForOrder({
    refereeUserId: userId,
    orderId: order.id,
    itemsTotal,
  }).catch((err) => console.error('[checkout] referral earning failed:', err))

  // Инициируем платёж через T-Bank, если настроен
  let paymentUrl: string | undefined
  if (process.env.TBANK_TERMINAL_KEY && totalToPay > 0) {
    const receipt = buildReceipt(
      parsed.data.customerEmail,
      cart.items.map((item) => ({
        productNameSnapshot: item.product.name,
        lengthMeters: Number(item.lengthMeters),
        unitPrice: item.unitPrice,
        total: Math.round(Number(item.lengthMeters) * item.unitPrice),
      })),
      shippingCostKopecks,
    )

    const payment = await initPayment({
      orderNumber: order.orderNumber,
      totalKopecks: totalToPay,
      customerEmail: parsed.data.customerEmail,
      description: `Заказ НейроАбоИ ${order.orderNumber}`,
      // /ru/ — хардкод текущей единственной локали; обновить при добавлении других языков
      successUrl: `${BASE_URL}/ru/checkout/success/${order.orderNumber}`,
      failUrl: `${BASE_URL}/ru/checkout/payment-failed/${order.orderNumber}`,
      receipt,
    }).catch((err) => {
      console.error('[checkout] T-Bank initPayment failed:', err)
      return null
    })

    if (payment?.ok) {
      paymentUrl = payment.paymentUrl
      await prismaAuth.order
        .update({
          where: { id: order.id },
          data: { paymentExternalId: payment.paymentId },
        })
        .catch((err) => console.error('[checkout] paymentExternalId update failed:', err))
    }
  }

  // Email-уведомления — не валим заказ, если SMTP в dev упадёт
  await Promise.allSettled([
    notifyCustomer(parsed.data.customerEmail, parsed.data.customerName, orderNumber, totalToPay, !!paymentUrl),
    notifyAdmin(orderNumber, parsed.data.customerName, parsed.data.customerEmail, totalToPay),
  ])

  revalidatePath('/cart')
  revalidatePath('/profile/orders')
  revalidatePath('/admin/orders')

  return { ok: true, orderNumber: order.orderNumber, paymentUrl }
}

async function notifyCustomer(
  to: string,
  name: string,
  orderNumber: string,
  totalKopecks: number,
  withPayment: boolean,
) {
  const totalRub = (totalKopecks / 100).toFixed(0)
  const bodyText = withPayment
    ? `Мы получили ваш заказ <strong>${orderNumber}</strong> на сумму <strong>${totalRub} ₽</strong>. `
      + `После оплаты вы получите письмо с подтверждением, и мы приступим к изготовлению.`
    : `Мы получили ваш заказ <strong>${orderNumber}</strong> на сумму <strong>${totalRub} ₽</strong>. `
      + `Менеджер свяжется с вами в течение рабочего дня для подтверждения и согласования доставки.`

  await sendGenericEmail({
    to,
    subject: `Заказ ${orderNumber} принят — НейроАбоИ`,
    heading: 'Спасибо за заказ!',
    greeting: `Здравствуйте, ${name}!`,
    body: bodyText,
    buttonText: 'Открыть заказ',
    buttonUrl: `${BASE_URL}/ru/profile/orders/${orderNumber}`,
  })
}

async function notifyAdmin(orderNumber: string, customerName: string, customerEmail: string, totalKopecks: number) {
  const totalRub = (totalKopecks / 100).toFixed(0)
  await sendGenericEmail({
    to: ADMIN_EMAIL,
    subject: `[aboi] Новый заказ ${orderNumber}`,
    heading: `Новый заказ ${orderNumber}`,
    body: `Клиент: <strong>${customerName}</strong> (${customerEmail})<br/>`
      + `Сумма: <strong>${totalRub} ₽</strong><br/>`
      + `Откройте админ-панель, чтобы подтвердить и обработать.`,
    buttonText: 'Открыть в админке',
    buttonUrl: `${BASE_URL}/ru/admin/orders/${orderNumber}`,
  })
}
