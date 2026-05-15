import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recalculateProductRating, recalculateRatings, recalculateSellerRating } from './review-utils'

// === Хелпер для создания mock db ===

function createMockDb() {
  return {
    review: { aggregate: vi.fn() },
    product: { update: vi.fn(), findUnique: vi.fn() },
    seller: { update: vi.fn() },
  }
}

describe('review-utils', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
  })

  // === recalculateProductRating ===

  describe('recalculateProductRating', () => {
    it('есть отзывы → среднее и count', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.3 },
        _count: { rating: 5 },
      })

      await recalculateProductRating(db as unknown as Parameters<typeof recalculateProductRating>[0], 'prod-1')

      expect(db.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1', status: 'PUBLISHED' },
        })
      )
      expect(db.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { averageRating: 4.3, reviewCount: 5 },
        })
      )
    })

    it('нет отзывов → null рейтинг, count 0', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: null },
        _count: { rating: 0 },
      })

      await recalculateProductRating(db as unknown as Parameters<typeof recalculateProductRating>[0], 'prod-1')

      expect(db.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { averageRating: null, reviewCount: 0 },
        })
      )
    })

    it('округление 4.67 → 4.7', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.67 },
        _count: { rating: 3 },
      })

      await recalculateProductRating(db as unknown as Parameters<typeof recalculateProductRating>[0], 'prod-1')

      expect(db.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ averageRating: 4.7 }),
        })
      )
    })

    it('округление 4.44 → 4.4', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.44 },
        _count: { rating: 2 },
      })

      await recalculateProductRating(db as unknown as Parameters<typeof recalculateProductRating>[0], 'prod-1')

      expect(db.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ averageRating: 4.4 }),
        })
      )
    })
  })

  // === recalculateSellerRating ===

  describe('recalculateSellerRating', () => {
    it('есть отзывы → среднее и count', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 3.8 },
        _count: { rating: 12 },
      })

      await recalculateSellerRating(db as unknown as Parameters<typeof recalculateSellerRating>[0], 'seller-1')

      expect(db.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { product: { sellerId: 'seller-1' }, status: 'PUBLISHED' },
        })
      )
      expect(db.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seller-1' },
          data: { averageRating: 3.8, reviewCount: 12 },
        })
      )
    })

    it('нет отзывов → null рейтинг', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: null },
        _count: { rating: 0 },
      })

      await recalculateSellerRating(db as unknown as Parameters<typeof recalculateSellerRating>[0], 'seller-1')

      expect(db.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { averageRating: null, reviewCount: 0 },
        })
      )
    })
  })

  // === recalculateRatings ===

  describe('recalculateRatings', () => {
    it('товар с продавцом → пересчёт обоих', async () => {
      // recalculateProductRating
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { rating: 8 },
      })
      // product.findUnique для sellerId
      db.product.findUnique.mockResolvedValueOnce({ sellerId: 'seller-1' })
      // recalculateSellerRating
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.2 },
        _count: { rating: 20 },
      })

      await recalculateRatings(db as unknown as Parameters<typeof recalculateRatings>[0], 'prod-1')

      // Обновлён и товар, и продавец
      expect(db.product.update).toHaveBeenCalled()
      expect(db.seller.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'seller-1' } }))
    })

    it('товар без продавца → только товар', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: 5.0 },
        _count: { rating: 1 },
      })
      db.product.findUnique.mockResolvedValueOnce({ sellerId: null })

      await recalculateRatings(db as unknown as Parameters<typeof recalculateRatings>[0], 'prod-1')

      expect(db.product.update).toHaveBeenCalled()
      expect(db.seller.update).not.toHaveBeenCalled()
    })

    it('товар не найден → только товар', async () => {
      db.review.aggregate.mockResolvedValueOnce({
        _avg: { rating: null },
        _count: { rating: 0 },
      })
      db.product.findUnique.mockResolvedValueOnce(null)

      await recalculateRatings(db as unknown as Parameters<typeof recalculateRatings>[0], 'prod-1')

      expect(db.product.update).toHaveBeenCalled()
      expect(db.seller.update).not.toHaveBeenCalled()
    })
  })
})
