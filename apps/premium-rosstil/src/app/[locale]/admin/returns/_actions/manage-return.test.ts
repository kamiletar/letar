import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    return: { findUnique: vi.fn(), update: vi.fn() },
    subOrder: { update: vi.fn() },
    sellerBalance: { update: vi.fn() },
    productItem: { update: vi.fn() },
  }
  prisma.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(prisma))
  return prisma
})

// === Моки модулей ===

vi.mock('@/lib/auth', async () => (await import('@test-utils/action-test-helpers')).mockRequireAdmin())
vi.mock('@/lib/db', async () => (await import('@test-utils/action-test-helpers')).mockDb(mockPrisma))

vi.mock('@/lib/yookassa', () => ({
  createRefund: vi.fn(),
}))

// === Импорт тестируемых модулей ===

import { approveReturn, rejectReturn, updateReturnStatus } from './manage-return'

// === Хелперы ===

function mockReturnRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ret-1',
    status: 'REQUESTED',
    refundAmount: 5000,
    subOrder: {
      id: 'sub-1',
      sellerId: 'seller-1',
      subtotal: 5000,
      sellerAmount: 4500,
      order: {
        id: 'order-1',
        payments: [{ id: 'pay-1', yookassaId: 'yoo-pay-1', amount: 10000 }],
      },
      items: [
        { productItemId: 'pi-1', quantity: 2 },
        { productItemId: 'pi-2', quantity: 1 },
      ],
    },
    ...overrides,
  }
}

describe('manage-return', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === approveReturn ===

  describe('approveReturn', () => {
    it('не админ → throws', async () => {
      const { requireAdmin } = await import('@/lib/auth')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Not admin'))

      await expect(approveReturn('ret-1', 5000)).rejects.toThrow()
    })

    it('возврат не найден → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(null)

      const result = await approveReturn('ret-1', 5000)
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('статус не REQUESTED → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce({
        id: 'ret-1',
        status: 'APPROVED',
      })

      const result = await approveReturn('ret-1', 5000)
      expect(result.success).toBe(false)
      expect(result.error).toContain('только в статусе')
    })

    it('успех → APPROVED + refundAmount', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce({
        id: 'ret-1',
        status: 'REQUESTED',
      })

      const result = await approveReturn('ret-1', 3500, 'Одобрено')

      expect(result.success).toBe(true)
      expect(mockPrisma.return.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewedBy: 'admin-1',
          reviewNote: 'Одобрено',
          reviewedAt: expect.any(Date),
          refundAmount: 3500,
        }),
      })
    })

    it('без reviewNote → null', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce({
        id: 'ret-1',
        status: 'REQUESTED',
      })

      await approveReturn('ret-1', 5000)

      expect(mockPrisma.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewNote: null }),
        })
      )
    })

    it('ошибка → catch', async () => {
      mockPrisma.return.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await approveReturn('ret-1', 5000)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось одобрить')
    })
  })

  // === rejectReturn ===

  describe('rejectReturn', () => {
    it('возврат не найден → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(null)

      const result = await rejectReturn('ret-1', 'Не подходит')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('статус не REQUESTED → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce({
        id: 'ret-1',
        status: 'REFUNDED',
      })

      const result = await rejectReturn('ret-1', 'Не подходит')
      expect(result.success).toBe(false)
      expect(result.error).toContain('только запрос в статусе')
    })

    it('успех → REJECTED + reviewNote', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce({
        id: 'ret-1',
        status: 'REQUESTED',
      })

      const result = await rejectReturn('ret-1', 'Истёк срок')

      expect(result.success).toBe(true)
      expect(mockPrisma.return.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reviewedBy: 'admin-1',
          reviewNote: 'Истёк срок',
          reviewedAt: expect.any(Date),
        }),
      })
    })

    it('ошибка → catch', async () => {
      mockPrisma.return.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await rejectReturn('ret-1', 'Причина')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось отклонить')
    })
  })

  // === updateReturnStatus ===

  describe('updateReturnStatus', () => {
    it('возврат не найден → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(null)

      const result = await updateReturnStatus('ret-1', 'SHIPPED_BACK')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('недопустимый переход REQUESTED → SHIPPED_BACK → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'REQUESTED' }))

      const result = await updateReturnStatus('ret-1', 'SHIPPED_BACK')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Нельзя перевести')
    })

    it('недопустимый переход APPROVED → RECEIVED → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'APPROVED' }))

      const result = await updateReturnStatus('ret-1', 'RECEIVED')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Нельзя перевести')
    })

    it('APPROVED → SHIPPED_BACK → успех', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'APPROVED' }))

      const result = await updateReturnStatus('ret-1', 'SHIPPED_BACK')

      expect(result.success).toBe(true)
      expect(mockPrisma.return.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: { status: 'SHIPPED_BACK' },
      })
    })

    it('SHIPPED_BACK → RECEIVED → успех', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'SHIPPED_BACK' }))

      const result = await updateReturnStatus('ret-1', 'RECEIVED')

      expect(result.success).toBe(true)
      expect(mockPrisma.return.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: { status: 'RECEIVED' },
      })
    })

    it('ошибка → catch', async () => {
      mockPrisma.return.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await updateReturnStatus('ret-1', 'SHIPPED_BACK')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось обновить')
    })
  })

  // === processRefund (через updateReturnStatus RECEIVED → REFUNDED) ===

  describe('processRefund', () => {
    it('сумма возврата не задана → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED', refundAmount: 0 }))

      const result = await updateReturnStatus('ret-1', 'REFUNDED')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Сумма возврата не задана')
    })

    it('нет платежа ЮKassa → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(
        mockReturnRecord({
          status: 'RECEIVED',
          subOrder: {
            ...mockReturnRecord().subOrder,
            order: { id: 'order-1', payments: [] },
          },
        })
      )

      const result = await updateReturnStatus('ret-1', 'REFUNDED')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Платёж ЮKassa не найден')
    })

    it('нет yookassaId → ошибка', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(
        mockReturnRecord({
          status: 'RECEIVED',
          subOrder: {
            ...mockReturnRecord().subOrder,
            order: {
              id: 'order-1',
              payments: [{ id: 'pay-1', yookassaId: null, amount: 10000 }],
            },
          },
        })
      )

      const result = await updateReturnStatus('ret-1', 'REFUNDED')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Платёж ЮKassa не найден')
    })

    it('ошибка ЮKassa API → ошибка', async () => {
      const { createRefund } = await import('@/lib/yookassa')
      vi.mocked(createRefund).mockRejectedValueOnce(new Error('YooKassa timeout'))

      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      const result = await updateReturnStatus('ret-1', 'REFUNDED')
      expect(result.success).toBe(false)
      expect(result.error).toContain('ЮKassa')
      expect(result.error).toContain('YooKassa timeout')
    })

    it('успех → createRefund вызван с правильными данными', async () => {
      const { createRefund } = await import('@/lib/yookassa')

      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      await updateReturnStatus('ret-1', 'REFUNDED')

      expect(createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'yoo-pay-1',
          amount: 5000,
        })
      )
    })

    it('успех → Return → REFUNDED', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      const result = await updateReturnStatus('ret-1', 'REFUNDED')

      expect(result.success).toBe(true)
      expect(mockPrisma.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ret-1' },
          data: expect.objectContaining({ status: 'REFUNDED' }),
        })
      )
    })

    it('успех → SubOrder → RETURNED', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      await updateReturnStatus('ret-1', 'REFUNDED')

      expect(mockPrisma.subOrder.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'RETURNED' },
      })
    })

    it('успех → sellerBalance уменьшен пропорционально', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      await updateReturnStatus('ret-1', 'REFUNDED')

      // sellerDeduction = 5000 * (4500/5000) = 4500
      expect(mockPrisma.sellerBalance.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1' },
        data: { pendingAmount: { decrement: 4500 } },
      })
    })

    it('успех → остатки восстановлены', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      await updateReturnStatus('ret-1', 'REFUNDED')

      expect(mockPrisma.productItem.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.productItem.update).toHaveBeenCalledWith({
        where: { id: 'pi-1' },
        data: { availableCount: { increment: 2 } },
      })
      expect(mockPrisma.productItem.update).toHaveBeenCalledWith({
        where: { id: 'pi-2' },
        data: { availableCount: { increment: 1 } },
      })
    })

    it('успех → $transaction вызван', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(mockReturnRecord({ status: 'RECEIVED' }))

      await updateReturnStatus('ret-1', 'REFUNDED')

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('sellerDeduction = 0 при subtotal = 0 → не вызывает sellerBalance.update', async () => {
      mockPrisma.return.findUnique.mockResolvedValueOnce(
        mockReturnRecord({
          status: 'RECEIVED',
          subOrder: {
            ...mockReturnRecord().subOrder,
            subtotal: 0,
            sellerAmount: 0,
          },
        })
      )

      await updateReturnStatus('ret-1', 'REFUNDED')

      expect(mockPrisma.sellerBalance.update).not.toHaveBeenCalled()
    })
  })
})
