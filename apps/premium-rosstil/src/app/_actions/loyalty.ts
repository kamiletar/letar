'use server'

import type { LoyaltyLevel, LoyaltyTransactionType } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, getPrisma } from '@/lib/db'
import { calculateLoyaltyLevel, calculateLoyaltyPoints, maxPointsForOrder } from '@/lib/loyalty'

/** Получить аккаунт лояльности текущего пользователя (создаёт при первом обращении) */
export async function getLoyaltyAccount() {
  const session = await getSession()
  if (!session?.user) {
    return null
  }

  const db = getEnhancedPrisma(session.user)

  let account = await db.loyaltyAccount.findUnique({
    where: { userId: session.user.id },
  })

  // Автоматически создаём аккаунт при первом обращении
  if (!account) {
    const systemDb = getPrisma()
    account = await systemDb.loyaltyAccount.create({
      data: { userId: session.user.id },
    })
  }

  return account
}

/** Получить историю транзакций лояльности */
export async function getLoyaltyTransactions(page = 1, pageSize = 20) {
  const session = await getSession()
  if (!session?.user) {
    return { transactions: [], total: 0 }
  }

  const db = getEnhancedPrisma(session.user)

  const account = await db.loyaltyAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!account) {
    return { transactions: [], total: 0 }
  }

  const [transactions, total] = await Promise.all([
    db.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.loyaltyTransaction.count({
      where: { accountId: account.id },
    }),
  ])

  return { transactions, total }
}

/**
 * Начисляет баллы за доставленный заказ.
 * Вызывается при изменении статуса заказа на DELIVERED.
 */
export async function earnLoyaltyPoints(orderId: string, orderAmount: number, userId: string) {
  const systemDb = getPrisma()

  // Получаем или создаём аккаунт лояльности
  let account = await systemDb.loyaltyAccount.findUnique({
    where: { userId },
  })

  if (!account) {
    account = await systemDb.loyaltyAccount.create({
      data: { userId },
    })
  }

  const points = calculateLoyaltyPoints(orderAmount, account.level as LoyaltyLevel)
  if (points <= 0) {
    return
  }

  // Проверяем, не были ли уже начислены баллы за этот заказ
  const existingTx = await systemDb.loyaltyTransaction.findFirst({
    where: { accountId: account.id, orderId, type: 'EARN' },
  })
  if (existingTx) {
    return // Баллы уже начислены
  }

  const newBalance = account.balance + points
  const newTotalEarned = account.totalEarned + points
  const newLevel = calculateLoyaltyLevel(newTotalEarned)

  await systemDb.$transaction([
    systemDb.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN' as LoyaltyTransactionType,
        amount: points,
        balanceAfter: newBalance,
        description: `Кэшбэк за заказ`,
        orderId,
      },
    }),
    systemDb.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: newBalance,
        totalEarned: newTotalEarned,
        level: newLevel,
      },
    }),
    systemDb.order.update({
      where: { id: orderId },
      data: { loyaltyPointsEarned: points },
    }),
  ])
}

/**
 * Списывает баллы при оформлении заказа.
 * Возвращает количество реально списанных баллов.
 */
export async function spendLoyaltyPoints(
  orderId: string,
  orderAmount: number,
  pointsToSpend: number,
  userId: string
): Promise<number> {
  if (pointsToSpend <= 0) {
    return 0
  }

  const systemDb = getPrisma()

  const account = await systemDb.loyaltyAccount.findUnique({
    where: { userId },
  })

  if (!account || account.balance <= 0) {
    return 0
  }

  // Рассчитываем максимально допустимое списание
  const maxAllowed = maxPointsForOrder(orderAmount, account.balance)
  const actualSpend = Math.min(pointsToSpend, maxAllowed)

  if (actualSpend <= 0) {
    return 0
  }

  const newBalance = account.balance - actualSpend

  await systemDb.$transaction([
    systemDb.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'SPEND' as LoyaltyTransactionType,
        amount: -actualSpend,
        balanceAfter: newBalance,
        description: `Списание за заказ`,
        orderId,
      },
    }),
    systemDb.loyaltyAccount.update({
      where: { id: account.id },
      data: { balance: newBalance },
    }),
  ])

  return actualSpend
}
