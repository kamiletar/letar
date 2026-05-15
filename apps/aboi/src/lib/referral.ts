'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { prismaAuth } from './prisma'

// Конфиг — позже вынести в `Settings` модель (env-fallback пока)
const REFERRAL_PERCENT = Number(process.env.ABOI_REFERRAL_PERCENT ?? 12)
const REFERRAL_PENDING_DAYS = Number(process.env.ABOI_REFERRAL_PENDING_DAYS ?? 14)
const REFERRAL_COOKIE_TTL_DAYS = Number(process.env.ABOI_REFERRAL_COOKIE_TTL_DAYS ?? 60)

const COOKIE_NAME = 'aboi.ref'
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function generateReferralCode(): string {
  const bytes = randomBytes(8)
  return Array.from({ length: 8 }, (_, i) => CROCKFORD[bytes[i]! % CROCKFORD.length]).join('')
}

/**
 * Получает или создаёт реферальный код для пользователя.
 */
export async function getOrCreateReferralForUser(userId: string) {
  const existing = await prismaAuth.referral.findUnique({ where: { ownerUserId: userId } })
  if (existing) return existing

  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode()
    const collision = await prismaAuth.referral.findUnique({ where: { code } })
    if (collision) continue
    return prismaAuth.referral.create({ data: { ownerUserId: userId, code } })
  }
  throw new Error('Не удалось сгенерировать уникальный реферальный код')
}

/**
 * Вызывается из proxy/middleware при заходе с `?ref=<code>`.
 * Ставит cookie aboi.ref на 60 дней (last-click) и пишет ReferralAttribution.
 * НЕ выполняется в Edge — вызывается из Server Component layout (если нужно).
 *
 * Для MVP — записываем attribution только при первом placeOrder.
 */
export async function setReferralCookie(code: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, code, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: REFERRAL_COOKIE_TTL_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function getReferralFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

/**
 * Вызывается в `placeOrderAction` после создания заказа: если у пользователя
 * есть атрибуция (через cookie aboi.ref), создаём ReferralEarning со статусом PENDING.
 * Защита от self-referral: владелец промокода не может зарабатывать на своих заказах.
 */
export async function createReferralEarningForOrder({
  refereeUserId,
  orderId,
  itemsTotal,
}: {
  refereeUserId: string
  orderId: string
  itemsTotal: number
}): Promise<void> {
  const code = await getReferralFromCookie()
  if (!code) return

  const referral = await prismaAuth.referral.findUnique({ where: { code } })
  if (!referral || !referral.isActive) return
  if (referral.ownerUserId === refereeUserId) return // self-referral

  // Логируем атрибуцию (если ещё нет для этого юзера)
  const attrExists = await prismaAuth.referralAttribution.findFirst({
    where: { referralId: referral.id, refereeUserId },
  })
  if (!attrExists) {
    await prismaAuth.referralAttribution.create({
      data: { referralId: referral.id, refereeUserId },
    })
  }

  // Считаем заработок: % от itemsTotal (без скидок и сертификатов).
  const amount = Math.floor((itemsTotal * REFERRAL_PERCENT) / 100)
  if (amount <= 0) return

  const pendingUntil = new Date()
  pendingUntil.setDate(pendingUntil.getDate() + REFERRAL_PENDING_DAYS)

  await prismaAuth.referralEarning.create({
    data: {
      referralId: referral.id,
      refereeUserId,
      orderId,
      amount,
      status: 'PENDING',
      pendingUntil,
    },
  })
}

/**
 * Списать бонусы с UserBalance при оформлении заказа.
 * Вызывается из placeOrderAction в транзакции.
 */
export async function spendBalanceForOrder({
  userId,
  amount,
  orderId,
  tx,
}: {
  userId: string
  amount: number
  orderId: string
  tx: typeof prismaAuth
}): Promise<{ ok: boolean; spent?: number; error?: string }> {
  if (amount <= 0) return { ok: true, spent: 0 }

  const balance = await tx.userBalance.findUnique({ where: { userId } })
  if (!balance || balance.balance < amount) {
    return { ok: false, error: 'Недостаточно бонусов на счёте' }
  }

  await tx.userBalance.update({
    where: { id: balance.id },
    data: { balance: { decrement: amount } },
  })
  await tx.balanceTransaction.create({
    data: {
      userBalanceId: balance.id,
      amount: -amount,
      type: 'ORDER_USE',
      orderId,
    },
  })
  return { ok: true, spent: amount }
}

/**
 * Получить баланс пользователя (создать если не существует).
 */
export async function getOrCreateBalance(userId: string) {
  const existing = await prismaAuth.userBalance.findUnique({ where: { userId } })
  if (existing) return existing
  return prismaAuth.userBalance.create({ data: { userId } })
}

/**
 * Админский экшен — одобрить заработок и начислить на UserBalance.
 */
export async function approveReferralEarningAction(earningId: string) {
  const { requireAdmin } = await import('./auth-utils')
  await requireAdmin()

  const earning = await prismaAuth.referralEarning.findUnique({ where: { id: earningId } })
  if (!earning || earning.status !== 'PENDING') {
    return { ok: false, error: 'Заработок не найден или уже обработан' }
  }

  const referral = await prismaAuth.referral.findUnique({ where: { id: earning.referralId } })
  if (!referral) return { ok: false, error: 'Реферальная программа не найдена' }

  await prismaAuth.$transaction(async (tx) => {
    let balance = await tx.userBalance.findUnique({ where: { userId: referral.ownerUserId } })
    if (!balance) {
      balance = await tx.userBalance.create({ data: { userId: referral.ownerUserId } })
    }
    await tx.userBalance.update({
      where: { id: balance.id },
      data: {
        balance: { increment: earning.amount },
        lifetimeEarned: { increment: earning.amount },
      },
    })
    await tx.balanceTransaction.create({
      data: {
        userBalanceId: balance.id,
        amount: earning.amount,
        type: 'REFERRAL_PAYOUT',
        orderId: earning.orderId,
      },
    })
    await tx.referralEarning.update({
      where: { id: earningId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    })
  })

  revalidatePath('/admin/referrals')
  revalidatePath('/profile/referrals')
  return { ok: true }
}

// REFERRAL_CONFIG вынесен в './referral-config' — Next.js 16 запрещает в
// 'use server'-файлах любые экспорты, кроме async-функций.
