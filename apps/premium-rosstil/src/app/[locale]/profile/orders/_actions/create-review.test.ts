import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Мок данных ===

const mockPrisma = vi.hoisted(() => ({
  subOrderItem: { findFirst: vi.fn() },
  review: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  productItem: { findMany: vi.fn() },
}))

// === Моки модулей ===

vi.mock('@/lib/auth', async () => {
  const { mockRequireAuth } = await import('@test-utils/action-test-helpers')
  return mockRequireAuth()
})
vi.mock('@/lib/db', async () => {
  const { mockDb } = await import('@test-utils/action-test-helpers')
  return mockDb(mockPrisma)
})

vi.mock('@/lib/review-utils', () => ({
  recalculateRatings: vi.fn(),
}))

// === Импорт тестируемого модуля ===

import { createReview } from './create-review'

// === Хелперы ===

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    productId: 'prod-1',
    rating: 5,
    text: 'Отличный товар!',
    images: [],
    ...overrides,
  }
}

describe('createReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // По умолчанию: productItem.findMany возвращает ID для проверки покупки
    mockPrisma.productItem.findMany.mockResolvedValue([{ id: 'pi-1' }])
  })

  // === Авторизация ===

  it('не авторизован → throws', async () => {
    const { requireAuth } = await import('@/lib/auth')
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authenticated'))

    await expect(createReview(validInput())).rejects.toThrow()
  })

  // === Валидация ===

  it('невалидные данные → ошибка', async () => {
    const result = await createReview({ rating: 'abc' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Некорректные данные')
  })

  it('rating < 1 → ошибка', async () => {
    const result = await createReview(validInput({ rating: 0 }))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Некорректные данные')
  })

  it('rating > 5 → ошибка', async () => {
    const result = await createReview(validInput({ rating: 6 }))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Некорректные данные')
  })

  it('пустой productId → ошибка', async () => {
    const result = await createReview(validInput({ productId: '' }))
    expect(result.success).toBe(false)
  })

  // === Проверка покупки ===

  it('нет покупки → ошибка', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce(null)

    const result = await createReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('минимум через 1 день после доставки')
  })

  // === Rate limit ===

  it('3 отзыва за день → ошибка', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(3)

    const result = await createReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Максимум 3 отзыва')
  })

  it('менее 3 за день → проходит', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(2)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)

    const result = await createReview(validInput())
    expect(result.success).toBe(true)
  })

  // === Уникальность ===

  it('уже есть отзыв → ошибка', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce({ id: 'existing-review' })

    const result = await createReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('уже оставили отзыв')
  })

  // === Успех ===

  it('успех → создаёт отзыв', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)

    const result = await createReview(validInput())

    expect(result.success).toBe(true)
    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        text: 'Отличный товар!',
      }),
    })
  })

  it('text отсутствует → null', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)

    await createReview(validInput({ text: undefined }))

    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ text: null }),
    })
  })

  it('успех → recalculateRatings вызван', async () => {
    const { recalculateRatings } = await import('@/lib/review-utils')

    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)

    await createReview(validInput())

    expect(recalculateRatings).toHaveBeenCalledWith(mockPrisma, 'prod-1')
  })

  it('успех → revalidatePath вызван', async () => {
    const { revalidatePath } = await import('next/cache')

    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)

    await createReview(validInput())

    expect(revalidatePath).toHaveBeenCalledWith('/catalog/prod-1')
    expect(revalidatePath).toHaveBeenCalledWith('/profile/orders')
  })

  // === Ошибки ===

  it('ошибка create → catch', async () => {
    mockPrisma.subOrderItem.findFirst.mockResolvedValueOnce({ id: 'soi-1' })
    mockPrisma.review.count.mockResolvedValueOnce(0)
    mockPrisma.review.findFirst.mockResolvedValueOnce(null)
    mockPrisma.review.create.mockRejectedValueOnce(new Error('DB error'))

    const result = await createReview(validInput())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Не удалось создать')
  })
})
