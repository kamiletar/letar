import { describe, expect, it } from 'vitest'

import { CreateReviewSchema, ReviewResponseSchema } from './review.schema'

describe('CreateReviewSchema', () => {
  function validReview(overrides: Record<string, unknown> = {}) {
    return {
      productId: 'prod-1',
      rating: 5,
      ...overrides,
    }
  }

  // === productId ===

  it('валидный отзыв', () => {
    expect(CreateReviewSchema.safeParse(validReview()).success).toBe(true)
  })

  it('пустой productId → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ productId: '' })).success).toBe(false)
  })

  // === rating ===

  it('rating 1 → ОК', () => {
    expect(CreateReviewSchema.safeParse(validReview({ rating: 1 })).success).toBe(true)
  })

  it('rating 5 → ОК', () => {
    expect(CreateReviewSchema.safeParse(validReview({ rating: 5 })).success).toBe(true)
  })

  it('rating 0 → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ rating: 0 })).success).toBe(false)
  })

  it('rating 6 → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ rating: 6 })).success).toBe(false)
  })

  it('rating дробное → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ rating: 3.5 })).success).toBe(false)
  })

  // === text ===

  it('без текста → ОК (optional)', () => {
    expect(CreateReviewSchema.safeParse(validReview()).success).toBe(true)
  })

  it('текст 2000 символов → ОК', () => {
    expect(CreateReviewSchema.safeParse(validReview({ text: 'А'.repeat(2000) })).success).toBe(true)
  })

  it('текст 2001 символ → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ text: 'А'.repeat(2001) })).success).toBe(false)
  })

  // === images ===

  it('images по умолчанию пустой массив', () => {
    const result = CreateReviewSchema.safeParse(validReview())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.images).toEqual([])
    }
  })

  it('3 фото → ОК', () => {
    expect(CreateReviewSchema.safeParse(validReview({ images: ['img1', 'img2', 'img3'] })).success).toBe(true)
  })

  it('4 фото → ошибка', () => {
    expect(CreateReviewSchema.safeParse(validReview({ images: ['img1', 'img2', 'img3', 'img4'] })).success).toBe(false)
  })

  // === .strip() ===

  it('.strip() удаляет лишние поля', () => {
    const result = CreateReviewSchema.safeParse(validReview({ extra: 'field' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extra' in result.data).toBe(false)
    }
  })
})

describe('ReviewResponseSchema', () => {
  function validResponse(overrides: Record<string, unknown> = {}) {
    return {
      reviewId: 'review-1',
      response: 'Спасибо за отзыв!',
      ...overrides,
    }
  }

  it('валидный ответ', () => {
    expect(ReviewResponseSchema.safeParse(validResponse()).success).toBe(true)
  })

  it('пустой reviewId → ошибка', () => {
    expect(ReviewResponseSchema.safeParse(validResponse({ reviewId: '' })).success).toBe(false)
  })

  it('пустой ответ → ошибка', () => {
    expect(ReviewResponseSchema.safeParse(validResponse({ response: '' })).success).toBe(false)
  })

  it('ответ 1000 символов → ОК', () => {
    expect(ReviewResponseSchema.safeParse(validResponse({ response: 'А'.repeat(1000) })).success).toBe(true)
  })

  it('ответ 1001 символ → ошибка', () => {
    expect(ReviewResponseSchema.safeParse(validResponse({ response: 'А'.repeat(1001) })).success).toBe(false)
  })
})
