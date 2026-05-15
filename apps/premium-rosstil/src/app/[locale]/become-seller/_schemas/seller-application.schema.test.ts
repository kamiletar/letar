import { describe, expect, it } from 'vitest'

import { SellerApplicationSchema } from './seller-application.schema'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    shopName: 'Мой магазин',
    contactEmail: 'seller@test.ru',
    contactPhone: '+79991234567',
    agreementAccepted: true as const,
    ...overrides,
  }
}

describe('SellerApplicationSchema', () => {
  // === shopName ===

  describe('shopName', () => {
    it('валидное название', () => {
      expect(SellerApplicationSchema.safeParse(validData()).success).toBe(true)
    })

    it('1 символ → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ shopName: 'А' })).success).toBe(false)
    })

    it('2 символа → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ shopName: 'АБ' })).success).toBe(true)
    })

    it('101 символ → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ shopName: 'А'.repeat(101) })).success).toBe(false)
    })

    it('пустое → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ shopName: '' })).success).toBe(false)
    })
  })

  // === contactEmail ===

  describe('contactEmail', () => {
    it('валидный email', () => {
      expect(SellerApplicationSchema.safeParse(validData()).success).toBe(true)
    })

    it('невалидный email → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ contactEmail: 'bad' })).success).toBe(false)
    })

    it('пустой email → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ contactEmail: '' })).success).toBe(false)
    })
  })

  // === contactPhone ===

  describe('contactPhone', () => {
    it('валидный телефон', () => {
      expect(SellerApplicationSchema.safeParse(validData()).success).toBe(true)
    })

    it('9 символов → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ contactPhone: '123456789' })).success).toBe(false)
    })

    it('21 символ → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ contactPhone: '1'.repeat(21) })).success).toBe(false)
    })
  })

  // === inn ===

  describe('inn', () => {
    it('10 цифр → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ inn: '1234567890' })).success).toBe(true)
    })

    it('12 цифр → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ inn: '123456789012' })).success).toBe(true)
    })

    it('9 цифр → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ inn: '123456789' })).success).toBe(false)
    })

    it('13 цифр → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ inn: '1234567890123' })).success).toBe(false)
    })

    it('буквы → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ inn: 'abc1234567' })).success).toBe(false)
    })

    it('без ИНН → ОК (optional)', () => {
      expect(SellerApplicationSchema.safeParse(validData()).success).toBe(true)
    })
  })

  // === ogrn ===

  describe('ogrn', () => {
    it('13 цифр → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ ogrn: '1234567890123' })).success).toBe(true)
    })

    it('15 цифр → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ ogrn: '123456789012345' })).success).toBe(true)
    })

    it('12 цифр → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ ogrn: '123456789012' })).success).toBe(false)
    })

    it('без ОГРН → ОК (optional)', () => {
      expect(SellerApplicationSchema.safeParse(validData()).success).toBe(true)
    })
  })

  // === optional поля ===

  describe('optional поля', () => {
    it('description 1000 символов → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ description: 'А'.repeat(1000) })).success).toBe(true)
    })

    it('description 1001 символ → ошибка', () => {
      expect(SellerApplicationSchema.safeParse(validData({ description: 'А'.repeat(1001) })).success).toBe(false)
    })

    it('portfolioLinks → ОК', () => {
      expect(SellerApplicationSchema.safeParse(validData({ portfolioLinks: 'https://example.com' })).success).toBe(true)
    })
  })

  // === .strip() ===

  it('.strip() удаляет лишние поля', () => {
    const result = SellerApplicationSchema.safeParse(validData({ extraField: 'value' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extraField' in result.data).toBe(false)
    }
  })
})
