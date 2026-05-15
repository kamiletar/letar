import { MOCK_SELLER_USER, mockDb, mockRequireSeller } from '@test-utils/action-test-helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  review: { findUnique: vi.fn(), update: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', () => mockRequireSeller())
vi.mock('@/lib/db', () => mockDb(mockPrisma))

// === Импорт тестируемого модуля ===

import { respondToReview } from './respond-review'

// === Хелперы ===

function validInput(overrides: Record<string, unknown> = {}) {
  return { reviewId: 'rev-1', response: 'Спасибо за отзыв!', ...overrides }
}

function mockReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rev-1',
    response: null,
    productId: 'prod-1',
    product: { seller: { id: 's-1', userId: 'seller-1' } },
    ...overrides,
  }
}

describe('respondToReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Авторизация ===

  it('не продавец → throws', async () => {
    const { requireSeller } = await import('@/lib/auth')
    vi.mocked(requireSeller).mockRejectedValueOnce(new Error('Not seller'))

    await expect(respondToReview(validInput())).rejects.toThrow()
  })

  // === Валидация ===

  it('невалидные данные → ошибка', async () => {
    const result = await respondToReview({ reviewId: '', response: '' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Некорректные данные')
  })

  it('пустой ответ → ошибка', async () => {
    const result = await respondToReview({ reviewId: 'rev-1', response: '' })
    expect(result.success).toBe(false)
  })

  // === Проверки ===

  it('отзыв не найден → ошибка', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(null)

    const result = await respondToReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('не найден')
  })

  it('чужой товар → ошибка', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(
      mockReview({ product: { seller: { id: 's-2', userId: 'other-seller' } } })
    )

    const result = await respondToReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('не ваш товар')
  })

  it('ответ уже дан → ошибка', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(mockReview({ response: 'Уже отвечено' }))

    const result = await respondToReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('уже был дан')
  })

  // === Успех ===

  it('успех → обновляет отзыв', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(mockReview())

    const result = await respondToReview(validInput())

    expect(result.success).toBe(true)
    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      data: expect.objectContaining({
        response: 'Спасибо за отзыв!',
        respondedById: 'seller-1',
      }),
    })
  })

  it('успех → respondedAt установлен', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(mockReview())

    await respondToReview(validInput())

    expect(mockPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          respondedAt: expect.any(Date),
        }),
      })
    )
  })

  it('админ может ответить на любой отзыв', async () => {
    const { requireSeller } = await import('@/lib/auth')
    vi.mocked(requireSeller).mockResolvedValueOnce({
      ...MOCK_SELLER_USER,
      id: 'admin-1',
      role: 'ADMIN' as const,
    })

    mockPrisma.review.findUnique.mockResolvedValueOnce(
      mockReview({ product: { seller: { id: 's-2', userId: 'other-seller' } } })
    )

    const result = await respondToReview(validInput())
    expect(result.success).toBe(true)
  })

  it('успех → revalidatePath', async () => {
    const { revalidatePath } = await import('next/cache')
    mockPrisma.review.findUnique.mockResolvedValueOnce(mockReview())

    await respondToReview(validInput())

    expect(revalidatePath).toHaveBeenCalledWith('/seller/reviews')
    expect(revalidatePath).toHaveBeenCalledWith('/catalog/prod-1')
  })

  // === Ошибки ===

  it('ошибка update → catch', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce(mockReview())
    mockPrisma.review.update.mockRejectedValueOnce(new Error('DB error'))

    const result = await respondToReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось отправить')
  })
})
