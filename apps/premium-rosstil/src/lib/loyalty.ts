import type { LoyaltyLevel } from '@/generated/prisma'

/** Пороги уровней лояльности (totalEarned баллов) */
export const LOYALTY_THRESHOLDS: Record<LoyaltyLevel, number> = {
  BRONZE: 0,
  SILVER: 10_000,
  GOLD: 50_000,
}

/** Процент кэшбэка за покупки по уровням */
export const LOYALTY_CASHBACK_RATE: Record<LoyaltyLevel, number> = {
  BRONZE: 0.03, // 3%
  SILVER: 0.05, // 5%
  GOLD: 0.07, // 7%
}

/** Максимальная доля оплаты баллами (50% от суммы) */
export const MAX_LOYALTY_DISCOUNT_RATIO = 0.5

/** Названия уровней на русском */
export const LOYALTY_LEVEL_LABELS: Record<LoyaltyLevel, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
}

/** Цвета уровней для UI */
export const LOYALTY_LEVEL_COLORS: Record<LoyaltyLevel, string> = {
  BRONZE: 'orange',
  SILVER: 'gray',
  GOLD: 'yellow',
}

/** Определяет уровень лояльности по общей сумме заработанных баллов */
export function calculateLoyaltyLevel(totalEarned: number): LoyaltyLevel {
  if (totalEarned >= LOYALTY_THRESHOLDS.GOLD) {
    return 'GOLD'
  }
  if (totalEarned >= LOYALTY_THRESHOLDS.SILVER) {
    return 'SILVER'
  }
  return 'BRONZE'
}

/** Рассчитывает баллы за заказ по уровню лояльности */
export function calculateLoyaltyPoints(orderAmount: number, level: LoyaltyLevel): number {
  const rate = LOYALTY_CASHBACK_RATE[level]
  return Math.floor(orderAmount * rate)
}

/** Максимальное количество баллов, которое можно потратить на заказ */
export function maxPointsForOrder(orderAmount: number, availableBalance: number): number {
  const maxByRatio = Math.floor(orderAmount * MAX_LOYALTY_DISCOUNT_RATIO)
  return Math.min(maxByRatio, availableBalance)
}

/** Сколько баллов до следующего уровня */
export function pointsToNextLevel(totalEarned: number, currentLevel: LoyaltyLevel): number | null {
  if (currentLevel === 'GOLD') {
    return null // Максимальный уровень
  }
  const nextLevel = currentLevel === 'BRONZE' ? 'SILVER' : 'GOLD'
  return Math.max(0, LOYALTY_THRESHOLDS[nextLevel] - totalEarned)
}
