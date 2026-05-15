import { describe, expect, it } from 'vitest'

import {
  calculateLoyaltyLevel,
  calculateLoyaltyPoints,
  LOYALTY_CASHBACK_RATE,
  LOYALTY_THRESHOLDS,
  maxPointsForOrder,
  pointsToNextLevel,
} from './loyalty'

describe('loyalty — pure-функции', () => {
  describe('calculateLoyaltyLevel', () => {
    it('0 баллов → BRONZE', () => {
      expect(calculateLoyaltyLevel(0)).toBe('BRONZE')
    })

    it('9999 баллов → BRONZE', () => {
      expect(calculateLoyaltyLevel(9999)).toBe('BRONZE')
    })

    it('10000 баллов → SILVER (граница)', () => {
      expect(calculateLoyaltyLevel(10_000)).toBe('SILVER')
    })

    it('25000 баллов → SILVER', () => {
      expect(calculateLoyaltyLevel(25_000)).toBe('SILVER')
    })

    it('49999 баллов → SILVER', () => {
      expect(calculateLoyaltyLevel(49_999)).toBe('SILVER')
    })

    it('50000 баллов → GOLD (граница)', () => {
      expect(calculateLoyaltyLevel(50_000)).toBe('GOLD')
    })

    it('100000 баллов → GOLD', () => {
      expect(calculateLoyaltyLevel(100_000)).toBe('GOLD')
    })

    it('отрицательное значение → BRONZE', () => {
      expect(calculateLoyaltyLevel(-1)).toBe('BRONZE')
    })
  })

  describe('calculateLoyaltyPoints', () => {
    it('BRONZE: 3% от 10000 → 300', () => {
      expect(calculateLoyaltyPoints(10_000, 'BRONZE')).toBe(300)
    })

    it('SILVER: 5% от 10000 → 500', () => {
      expect(calculateLoyaltyPoints(10_000, 'SILVER')).toBe(500)
    })

    it('GOLD: 7% от 10000 → 700', () => {
      expect(calculateLoyaltyPoints(10_000, 'GOLD')).toBe(700)
    })

    it('Math.floor для дробных: BRONZE 3% от 333 → 9', () => {
      // 333 * 0.03 = 9.99 → Math.floor → 9
      expect(calculateLoyaltyPoints(333, 'BRONZE')).toBe(9)
    })

    it('Math.floor для дробных: SILVER 5% от 999 → 49', () => {
      // 999 * 0.05 = 49.95 → Math.floor → 49
      expect(calculateLoyaltyPoints(999, 'SILVER')).toBe(49)
    })

    it('0 руб → 0 баллов', () => {
      expect(calculateLoyaltyPoints(0, 'GOLD')).toBe(0)
    })

    it('1 руб BRONZE → 0 (3% от 1 = 0.03)', () => {
      expect(calculateLoyaltyPoints(1, 'BRONZE')).toBe(0)
    })

    it('большая сумма: GOLD 7% от 100000 → 7000', () => {
      expect(calculateLoyaltyPoints(100_000, 'GOLD')).toBe(7000)
    })
  })

  describe('maxPointsForOrder', () => {
    it('50% от суммы при большом балансе', () => {
      // maxByRatio = floor(10000 * 0.5) = 5000, min(5000, 10000) = 5000
      expect(maxPointsForOrder(10_000, 10_000)).toBe(5000)
    })

    it('баланс меньше 50% суммы → вернуть баланс', () => {
      // maxByRatio = floor(10000 * 0.5) = 5000, min(5000, 2000) = 2000
      expect(maxPointsForOrder(10_000, 2000)).toBe(2000)
    })

    it('баланс = 0 → 0', () => {
      expect(maxPointsForOrder(10_000, 0)).toBe(0)
    })

    it('сумма заказа = 0 → 0', () => {
      expect(maxPointsForOrder(0, 5000)).toBe(0)
    })

    it('оба = 0 → 0', () => {
      expect(maxPointsForOrder(0, 0)).toBe(0)
    })

    it('Math.floor для нечётной суммы: 999 → floor(499.5) = 499', () => {
      expect(maxPointsForOrder(999, 10_000)).toBe(499)
    })

    it('баланс равен 50% суммы → вернуть баланс', () => {
      // maxByRatio = floor(10000 * 0.5) = 5000, min(5000, 5000) = 5000
      expect(maxPointsForOrder(10_000, 5000)).toBe(5000)
    })
  })

  describe('pointsToNextLevel', () => {
    it('BRONZE → SILVER: 10000 - 0 = 10000', () => {
      expect(pointsToNextLevel(0, 'BRONZE')).toBe(10_000)
    })

    it('BRONZE 5000 заработано → до SILVER 5000', () => {
      expect(pointsToNextLevel(5000, 'BRONZE')).toBe(5000)
    })

    it('SILVER → GOLD: 50000 - 10000 = 40000', () => {
      expect(pointsToNextLevel(10_000, 'SILVER')).toBe(40_000)
    })

    it('GOLD → null (максимальный уровень)', () => {
      expect(pointsToNextLevel(50_000, 'GOLD')).toBeNull()
    })

    it('превышение порога → 0 (а не отрицательное)', () => {
      // BRONZE с 15000 earned → next SILVER = 10000 - 15000 = -5000 → max(0, -5000) = 0
      expect(pointsToNextLevel(15_000, 'BRONZE')).toBe(0)
    })
  })

  describe('экспорт констант', () => {
    it('LOYALTY_THRESHOLDS содержит все уровни', () => {
      expect(LOYALTY_THRESHOLDS).toEqual({
        BRONZE: 0,
        SILVER: 10_000,
        GOLD: 50_000,
      })
    })

    it('LOYALTY_CASHBACK_RATE содержит все уровни', () => {
      expect(LOYALTY_CASHBACK_RATE).toEqual({
        BRONZE: 0.03,
        SILVER: 0.05,
        GOLD: 0.07,
      })
    })
  })
})
