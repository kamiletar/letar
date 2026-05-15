import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  review: { findUnique: vi.fn(), update: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', async () => (await import('@test-utils/action-test-helpers')).mockRequireAdmin())
vi.mock('@/lib/db', async () => (await import('@test-utils/action-test-helpers')).mockDb(mockPrisma))

vi.mock('@/lib/review-utils', () => ({
  recalculateRatings: vi.fn(),
}))

// === Импорт тестируемых модулей ===

import { deleteReview, hideReview, publishReview } from './manage-review'

describe('manage-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === hideReview ===

  describe('hideReview', () => {
    it('не админ → throws', async () => {
      const { requireAdmin } = await import('@/lib/auth')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Not admin'))

      await expect(hideReview('rev-1', 'spam')).rejects.toThrow()
    })

    it('отзыв не найден → ошибка', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null)

      const result = await hideReview('rev-1', 'spam')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('статус не PUBLISHED → ошибка', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'HIDDEN',
        productId: 'prod-1',
      })

      const result = await hideReview('rev-1', 'spam')
      expect(result.success).toBe(false)
      expect(result.error).toContain('только опубликованный')
    })

    it('успех → HIDDEN + причина', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'PUBLISHED',
        productId: 'prod-1',
      })

      const result = await hideReview('rev-1', 'Спам')

      expect(result.success).toBe(true)
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: expect.objectContaining({
          status: 'HIDDEN',
          hiddenById: 'admin-1',
          hiddenReason: 'Спам',
          hiddenAt: expect.any(Date),
        }),
      })
    })

    it('успех → recalculateRatings вызван', async () => {
      const { recalculateRatings } = await import('@/lib/review-utils')

      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'PUBLISHED',
        productId: 'prod-1',
      })

      await hideReview('rev-1', 'Спам')

      expect(recalculateRatings).toHaveBeenCalledWith(mockPrisma, 'prod-1')
    })

    it('ошибка → catch', async () => {
      mockPrisma.review.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await hideReview('rev-1', 'reason')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось скрыть')
    })
  })

  // === publishReview ===

  describe('publishReview', () => {
    it('отзыв не найден → ошибка', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null)

      const result = await publishReview('rev-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('статус не HIDDEN → ошибка', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'PUBLISHED',
        productId: 'prod-1',
      })

      const result = await publishReview('rev-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('только скрытый')
    })

    it('успех → PUBLISHED + очистка hidden полей', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'HIDDEN',
        productId: 'prod-1',
      })

      const result = await publishReview('rev-1')

      expect(result.success).toBe(true)
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: {
          status: 'PUBLISHED',
          hiddenById: null,
          hiddenReason: null,
          hiddenAt: null,
        },
      })
    })

    it('успех → recalculateRatings вызван', async () => {
      const { recalculateRatings } = await import('@/lib/review-utils')

      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        status: 'HIDDEN',
        productId: 'prod-1',
      })

      await publishReview('rev-1')

      expect(recalculateRatings).toHaveBeenCalledWith(mockPrisma, 'prod-1')
    })

    it('ошибка → catch', async () => {
      mockPrisma.review.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await publishReview('rev-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось опубликовать')
    })
  })

  // === deleteReview ===

  describe('deleteReview', () => {
    it('отзыв не найден → ошибка', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null)

      const result = await deleteReview('rev-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })

    it('успех → DELETED', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        productId: 'prod-1',
      })

      const result = await deleteReview('rev-1')

      expect(result.success).toBe(true)
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: { status: 'DELETED' },
      })
    })

    it('успех → recalculateRatings вызван', async () => {
      const { recalculateRatings } = await import('@/lib/review-utils')

      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        productId: 'prod-1',
      })

      await deleteReview('rev-1')

      expect(recalculateRatings).toHaveBeenCalledWith(mockPrisma, 'prod-1')
    })

    it('успех → revalidatePath', async () => {
      const { revalidatePath } = await import('next/cache')

      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        productId: 'prod-1',
      })

      await deleteReview('rev-1')

      expect(revalidatePath).toHaveBeenCalledWith('/admin/reviews')
    })

    it('ошибка → catch', async () => {
      mockPrisma.review.findUnique.mockRejectedValueOnce(new Error('DB error'))

      const result = await deleteReview('rev-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Не удалось удалить')
    })
  })
})
