import { describe, expect, it } from 'vitest'

import { ReturnRequestSchema } from './return-request.schema'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    subOrderId: 'sub-1',
    reason: 'Не подошёл размер',
    ...overrides,
  }
}

describe('ReturnRequestSchema', () => {
  // === subOrderId ===

  it('валидный запрос', () => {
    expect(ReturnRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('пустой subOrderId → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ subOrderId: '' })).success).toBe(false)
  })

  // === reason ===

  it('причина 5 символов → ОК', () => {
    expect(ReturnRequestSchema.safeParse(validData({ reason: 'Брак!' })).success).toBe(true)
  })

  it('причина 4 символа → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ reason: 'Нет!' })).success).toBe(false)
  })

  it('пустая причина → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ reason: '' })).success).toBe(false)
  })

  it('причина 500 символов → ОК', () => {
    expect(ReturnRequestSchema.safeParse(validData({ reason: 'А'.repeat(500) })).success).toBe(true)
  })

  it('причина 501 символ → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ reason: 'А'.repeat(501) })).success).toBe(false)
  })

  // === description ===

  it('без описания → ОК (optional)', () => {
    expect(ReturnRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('описание 2000 символов → ОК', () => {
    expect(ReturnRequestSchema.safeParse(validData({ description: 'А'.repeat(2000) })).success).toBe(true)
  })

  it('описание 2001 символ → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ description: 'А'.repeat(2001) })).success).toBe(false)
  })

  // === images ===

  it('без фото → ОК (optional)', () => {
    expect(ReturnRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('5 фото → ОК', () => {
    expect(ReturnRequestSchema.safeParse(validData({ images: ['a', 'b', 'c', 'd', 'e'] })).success).toBe(true)
  })

  it('6 фото → ошибка', () => {
    expect(ReturnRequestSchema.safeParse(validData({ images: ['a', 'b', 'c', 'd', 'e', 'f'] })).success).toBe(false)
  })

  // === .strip() ===

  it('.strip() удаляет лишние поля', () => {
    const result = ReturnRequestSchema.safeParse(validData({ extraField: 'value' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extraField' in result.data).toBe(false)
    }
  })
})
