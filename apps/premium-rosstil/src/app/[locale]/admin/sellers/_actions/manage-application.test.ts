import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    sellerApplication: { findUnique: vi.fn(), update: vi.fn() },
    seller: { create: vi.fn() },
    sellerBalance: { create: vi.fn() },
    user: { update: vi.fn() },
  }
  prisma.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(prisma))
  return prisma
})

vi.mock('@/lib/auth', async () => (await import('@test-utils/action-test-helpers')).mockRequireAdmin())
vi.mock('@/lib/db', async () => (await import('@test-utils/action-test-helpers')).mockDb(mockPrisma))

vi.mock('@/lib/seller-notifications', () => ({
  sendApplicationApprovedEmail: vi.fn(() => Promise.resolve()),
  sendApplicationRejectedEmail: vi.fn(() => Promise.resolve()),
}))

import { approveApplication, rejectApplication } from './manage-application'

function mockApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    userId: 'user-1',
    status: 'PENDING',
    shopName: 'Мой Магазин',
    description: 'Описание',
    inn: '1234567890',
    legalName: 'ООО Магазин',
    ogrn: null,
    contactEmail: 'shop@test.ru',
    contactPhone: '+79001234567',
    user: { id: 'user-1', role: 'USER' },
    ...overrides,
  }
}

describe('manage-application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === approveApplication ===

  describe('approveApplication', () => {
    it('не админ → throws', async () => {
      const { requireAdmin } = await import('@/lib/auth')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Not admin'))

      await expect(approveApplication('app-1')).rejects.toThrow()
    })

    it('заявка не найдена → ошибка', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(null)

      const result = await approveApplication('nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найдена')
    })

    it('статус не PENDING → ошибка', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication({ status: 'APPROVED' }))

      const result = await approveApplication('app-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('уже обработана')
    })

    it('успех → заявка APPROVED', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      const result = await approveApplication('app-1')

      expect(result.success).toBe(true)
      expect(mockPrisma.sellerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED' }),
        })
      )
    })

    it('успех → создаёт Seller-профиль', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(mockPrisma.seller.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          shopName: 'Мой Магазин',
          status: 'ACTIVE',
        }),
      })
    })

    it('успех → создаёт SellerBalance', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(mockPrisma.sellerBalance.create).toHaveBeenCalledWith({
        data: { sellerId: 'seller-new' },
      })
    })

    it('успех → User.role → SELLER', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'SELLER' },
      })
    })

    it('ADMIN не меняет роль на SELLER', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(
        mockApplication({ user: { id: 'user-1', role: 'ADMIN' } })
      )
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('успех → email уведомление', async () => {
      const { sendApplicationApprovedEmail } = await import('@/lib/seller-notifications')

      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(sendApplicationApprovedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          shopName: 'Мой Магазин',
          contactEmail: 'shop@test.ru',
        })
      )
    })

    it('успех → $transaction вызван', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockResolvedValueOnce({ id: 'seller-new' })

      await approveApplication('app-1')

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('ошибка $transaction → catch', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.seller.create.mockRejectedValueOnce(new Error('DB error'))

      const result = await approveApplication('app-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось одобрить')
    })
  })

  // === rejectApplication ===

  describe('rejectApplication', () => {
    it('заявка не найдена → ошибка', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(null)

      const result = await rejectApplication('nonexistent', 'Причина')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найдена')
    })

    it('статус не PENDING → ошибка', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication({ status: 'REJECTED' }))

      const result = await rejectApplication('app-1', 'Причина')
      expect(result.success).toBe(false)
      expect(result.error).toContain('уже обработана')
    })

    it('успех → REJECTED + reviewNote', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())

      const result = await rejectApplication('app-1', 'Не хватает документов')

      expect(result.success).toBe(true)
      expect(mockPrisma.sellerApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reviewNote: 'Не хватает документов',
          reviewedAt: expect.any(Date),
        }),
      })
    })

    it('успех → email уведомление', async () => {
      const { sendApplicationRejectedEmail } = await import('@/lib/seller-notifications')

      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())

      await rejectApplication('app-1', 'Причина')

      expect(sendApplicationRejectedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          shopName: 'Мой Магазин',
          reviewNote: 'Причина',
        })
      )
    })

    it('ошибка → catch', async () => {
      mockPrisma.sellerApplication.findUnique.mockResolvedValueOnce(mockApplication())
      mockPrisma.sellerApplication.update.mockRejectedValueOnce(new Error('DB error'))

      const result = await rejectApplication('app-1', 'Причина')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось отклонить')
    })
  })
})
