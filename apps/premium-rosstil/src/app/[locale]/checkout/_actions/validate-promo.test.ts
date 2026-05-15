import { mockDb, mockGetSession } from '@test-utils/action-test-helpers'
import { createMockPromo } from '@test-utils/factories'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Моки ===

const mockPrisma = vi.hoisted(() => ({
  promo: { findUnique: vi.fn() },
  order: { count: vi.fn() },
}))

vi.mock('@/lib/auth', () => mockGetSession())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

// === Импорт тестируемого модуля (после моков) ===

import { validatePromo } from './validate-promo'

describe('validatePromo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('входные данные', () => {
    it('пустой код → ошибка', async () => {
      const result = await validatePromo('', 5000)
      expect(result).toEqual({ valid: false, error: 'Введите промокод' })
    })

    it('пробелы → ошибка', async () => {
      const result = await validatePromo('   ', 5000)
      expect(result).toEqual({ valid: false, error: 'Введите промокод' })
    })

    it('не аутентифицирован → ошибка', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Необходимо войти в систему' })
    })
  })

  describe('поиск промокода', () => {
    it('код не найден → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(null)

      const result = await validatePromo('INVALID', 5000)
      expect(result).toEqual({ valid: false, error: 'Промокод не найден' })
    })

    it('неактивный промокод → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ isActive: false }))

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Промокод не активен' })
    })

    it('нормализация кода: uppercase + trim', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(null)

      await validatePromo('  sale10  ', 5000)

      expect(mockPrisma.promo.findUnique).toHaveBeenCalledWith({
        where: { code: 'SALE10' },
      })
    })
  })

  describe('проверка дат', () => {
    it('dateFrom в будущем → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ dateFrom: new Date('2099-01-01') }))

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Промокод ещё не действует' })
    })

    it('dateTo в прошлом → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ dateTo: new Date('2020-01-01') }))

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Промокод истёк' })
    })
  })

  describe('проверка лимитов', () => {
    it('minAmount больше cartTotal → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ minAmount: 10000 }))

      const result = await validatePromo('SALE10', 5000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Минимальная сумма заказа')
    })

    it('maxUsages исчерпан → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ maxUsages: 5, usageCount: 5 }))

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Промокод исчерпан' })
    })

    it('perCustomer исчерпан → ошибка', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ perCustomer: 1 }))
      mockPrisma.order.count.mockResolvedValueOnce(1)

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({ valid: false, error: 'Вы уже использовали этот промокод' })
    })

    it('perCustomer ещё можно использовать → OK', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ perCustomer: 3 }))
      mockPrisma.order.count.mockResolvedValueOnce(1)

      const result = await validatePromo('SALE10', 5000)
      expect(result.valid).toBe(true)
    })
  })

  describe('расчёт скидки', () => {
    it('PERCENTAGE: 10% от 5000 = 500', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'PERCENTAGE', discount: 10 }))

      const result = await validatePromo('SALE10', 5000)
      expect(result).toEqual({
        valid: true,
        type: 'PERCENTAGE',
        discount: 10,
        discountAmount: 500,
      })
    })

    it('PERCENTAGE: 25% от 3000 = 750', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'PERCENTAGE', discount: 25 }))

      const result = await validatePromo('SALE25', 3000)
      expect(result.discountAmount).toBe(750)
    })

    it('FIXED_AMOUNT: 1000₽ от 5000 → 1000', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'FIXED_AMOUNT', discount: 1000 }))

      const result = await validatePromo('FIX1000', 5000)
      expect(result).toEqual({
        valid: true,
        type: 'FIXED_AMOUNT',
        discount: 1000,
        discountAmount: 1000,
      })
    })

    it('FIXED_AMOUNT: скидка больше суммы → min(discount, cartTotal)', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'FIXED_AMOUNT', discount: 10000 }))

      const result = await validatePromo('FIX10000', 5000)
      expect(result.discountAmount).toBe(5000)
    })

    it('PERCENTAGE: дробный результат округлён', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'PERCENTAGE', discount: 33 }))

      const result = await validatePromo('SALE33', 1000)
      // 1000 * 33 / 100 = 330.0 → Math.round(330.0 * 100) / 100 = 330
      expect(result.discountAmount).toBe(330)
    })

    it('формат ответа содержит все поля', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo())

      const result = await validatePromo('SALE10', 5000)
      expect(result).toHaveProperty('valid', true)
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('discount')
      expect(result).toHaveProperty('discountAmount')
      expect(result).not.toHaveProperty('error')
    })
  })

  describe('полный valid промокод', () => {
    it('PERCENTAGE без ограничений', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo())

      const result = await validatePromo('SALE10', 5000)
      expect(result.valid).toBe(true)
      expect(result.type).toBe('PERCENTAGE')
    })

    it('FIXED_AMOUNT без ограничений', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ type: 'FIXED_AMOUNT', discount: 500 }))

      const result = await validatePromo('FIX500', 5000)
      expect(result.valid).toBe(true)
      expect(result.type).toBe('FIXED_AMOUNT')
      expect(result.discountAmount).toBe(500)
    })

    it('с minAmount (корзина >= min)', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ minAmount: 3000 }))

      const result = await validatePromo('SALE10', 5000)
      expect(result.valid).toBe(true)
    })

    it('с maxUsages (ещё есть лимит)', async () => {
      mockPrisma.promo.findUnique.mockResolvedValueOnce(createMockPromo({ maxUsages: 100, usageCount: 50 }))

      const result = await validatePromo('SALE10', 5000)
      expect(result.valid).toBe(true)
    })
  })
})
