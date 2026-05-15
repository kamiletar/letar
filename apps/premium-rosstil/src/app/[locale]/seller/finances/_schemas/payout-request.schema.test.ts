import { describe, expect, it } from 'vitest'

import { PayoutRequestSchema } from './payout-request.schema'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    requestedAmount: 5000,
    ...overrides,
  }
}

describe('PayoutRequestSchema', () => {
  // === requestedAmount ===

  it('валидный запрос', () => {
    expect(PayoutRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('сумма 0 → ошибка', () => {
    expect(PayoutRequestSchema.safeParse(validData({ requestedAmount: 0 })).success).toBe(false)
  })

  it('отрицательная сумма → ошибка', () => {
    expect(PayoutRequestSchema.safeParse(validData({ requestedAmount: -100 })).success).toBe(false)
  })

  it('дробная сумма → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ requestedAmount: 1000.5 })).success).toBe(true)
  })

  // === receiptNumber ===

  it('без чека → ОК (optional)', () => {
    expect(PayoutRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('с номером чека → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptNumber: 'RC-001' })).success).toBe(true)
  })

  // === receiptDate ===

  it('с датой чека → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptDate: '2025-01-15' })).success).toBe(true)
  })

  // === receiptAmount ===

  it('сумма чека положительная → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptAmount: 5000 })).success).toBe(true)
  })

  it('сумма чека 0 → ошибка', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptAmount: 0 })).success).toBe(false)
  })

  it('сумма чека отрицательная → ошибка', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptAmount: -100 })).success).toBe(false)
  })

  // === receiptImageIds ===

  it('без фото чека → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('с фото чека → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ receiptImageIds: ['img-1', 'img-2'] })).success).toBe(true)
  })

  // === sellerNote ===

  it('без комментария → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData()).success).toBe(true)
  })

  it('комментарий 500 символов → ОК', () => {
    expect(PayoutRequestSchema.safeParse(validData({ sellerNote: 'А'.repeat(500) })).success).toBe(true)
  })

  it('комментарий 501 символ → ошибка', () => {
    expect(PayoutRequestSchema.safeParse(validData({ sellerNote: 'А'.repeat(501) })).success).toBe(false)
  })

  // === .strip() ===

  it('.strip() удаляет лишние поля', () => {
    const result = PayoutRequestSchema.safeParse(validData({ extraField: 'value' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extraField' in result.data).toBe(false)
    }
  })

  // === полный объект с чеком ===

  it('полный запрос с данными чека', () => {
    const result = PayoutRequestSchema.safeParse({
      requestedAmount: 5000,
      receiptNumber: 'RC-001',
      receiptDate: '2025-01-15',
      receiptAmount: 5000,
      receiptImageIds: ['img-1'],
      sellerNote: 'Прошу выплатить',
    })
    expect(result.success).toBe(true)
  })
})
