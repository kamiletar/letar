import { describe, expect, it } from 'vitest'

import { CheckoutFormSchema } from './checkout-form.schema'

function validData(overrides: Record<string, unknown> = {}) {
  return {
    customerName: 'Иван Иванов',
    customerPhone: '+7 999 123-45-67',
    deliveryAddress: 'Москва, ул. Тверская, д. 1, кв. 10',
    ...overrides,
  }
}

describe('CheckoutFormSchema', () => {
  // === customerName ===

  describe('customerName', () => {
    it('валидное имя', () => {
      expect(CheckoutFormSchema.safeParse(validData()).success).toBe(true)
    })

    it('короткое имя (1 символ) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerName: 'И' }))
      expect(result.success).toBe(false)
    })

    it('пустое имя → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerName: '' }))
      expect(result.success).toBe(false)
    })

    it('граничное имя (2 символа) → ОК', () => {
      expect(CheckoutFormSchema.safeParse(validData({ customerName: 'АБ' })).success).toBe(true)
    })

    it('длинное имя (101 символ) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerName: 'А'.repeat(101) }))
      expect(result.success).toBe(false)
    })
  })

  // === customerPhone ===

  describe('customerPhone', () => {
    it('валидный номер', () => {
      expect(CheckoutFormSchema.safeParse(validData({ customerPhone: '+79991234567' })).success).toBe(true)
    })

    it('номер с пробелами и тире', () => {
      expect(CheckoutFormSchema.safeParse(validData({ customerPhone: '+7 (999) 123-45-67' })).success).toBe(true)
    })

    it('короткий номер (9 символов) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerPhone: '123456789' }))
      expect(result.success).toBe(false)
    })

    it('буквы в номере → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerPhone: '+7abc1234567' }))
      expect(result.success).toBe(false)
    })
  })

  // === customerEmail ===

  describe('customerEmail', () => {
    it('валидный email', () => {
      expect(CheckoutFormSchema.safeParse(validData({ customerEmail: 'test@test.ru' })).success).toBe(true)
    })

    it('пустая строка → ОК (optional)', () => {
      expect(CheckoutFormSchema.safeParse(validData({ customerEmail: '' })).success).toBe(true)
    })

    it('без email → ОК (optional)', () => {
      expect(CheckoutFormSchema.safeParse(validData()).success).toBe(true)
    })

    it('невалидный email → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ customerEmail: 'not-email' }))
      expect(result.success).toBe(false)
    })
  })

  // === deliveryAddress ===

  describe('deliveryAddress', () => {
    it('валидный адрес', () => {
      expect(CheckoutFormSchema.safeParse(validData()).success).toBe(true)
    })

    it('короткий адрес (9 символов) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ deliveryAddress: 'Москва, 1' }))
      expect(result.success).toBe(false)
    })

    it('граничный адрес (10 символов) → ОК', () => {
      expect(CheckoutFormSchema.safeParse(validData({ deliveryAddress: 'Москва, 12' })).success).toBe(true)
    })

    it('слишком длинный адрес (501 символ) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ deliveryAddress: 'А'.repeat(501) }))
      expect(result.success).toBe(false)
    })
  })

  // === promoCode ===

  describe('promoCode', () => {
    it('промокод нормализуется в uppercase', () => {
      const result = CheckoutFormSchema.safeParse(validData({ promoCode: 'summer10' }))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.promoCode).toBe('SUMMER10')
      }
    })

    it('промокод обрезает пробелы', () => {
      const result = CheckoutFormSchema.safeParse(validData({ promoCode: '  CODE  ' }))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.promoCode).toBe('CODE')
      }
    })

    it('пустой промокод → пустая строка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ promoCode: '' }))
      expect(result.success).toBe(true)
    })

    it('слишком длинный промокод (21 символ) → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ promoCode: 'A'.repeat(21) }))
      expect(result.success).toBe(false)
    })
  })

  // === loyaltyPoints ===

  describe('loyaltyPoints', () => {
    it('по умолчанию 0', () => {
      const result = CheckoutFormSchema.safeParse(validData())
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.loyaltyPoints).toBe(0)
      }
    })

    it('положительное число', () => {
      const result = CheckoutFormSchema.safeParse(validData({ loyaltyPoints: 500 }))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.loyaltyPoints).toBe(500)
      }
    })

    it('отрицательное число → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ loyaltyPoints: -1 }))
      expect(result.success).toBe(false)
    })

    it('строка "100" coerce → 100', () => {
      const result = CheckoutFormSchema.safeParse(validData({ loyaltyPoints: '100' }))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.loyaltyPoints).toBe(100)
      }
    })
  })

  // === notes ===

  describe('notes', () => {
    it('без комментария → ОК', () => {
      expect(CheckoutFormSchema.safeParse(validData()).success).toBe(true)
    })

    it('комментарий 1000 символов → ОК', () => {
      expect(CheckoutFormSchema.safeParse(validData({ notes: 'А'.repeat(1000) })).success).toBe(true)
    })

    it('комментарий 1001 символ → ошибка', () => {
      const result = CheckoutFormSchema.safeParse(validData({ notes: 'А'.repeat(1001) }))
      expect(result.success).toBe(false)
    })
  })

  // === .strip() ===

  it('.strip() удаляет лишние поля', () => {
    const result = CheckoutFormSchema.safeParse(validData({ extraField: 'value', __internal: true }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect('extraField' in result.data).toBe(false)
    }
  })

  // === saveToProfile ===

  it('saveToProfile по умолчанию true', () => {
    const result = CheckoutFormSchema.safeParse(validData())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.saveToProfile).toBe(true)
    }
  })

  it('saveToProfile coerce: непустая строка → true (JS truthiness)', () => {
    // z.coerce.boolean() использует Boolean(), поэтому "false" → true
    const result = CheckoutFormSchema.safeParse(validData({ saveToProfile: 'false' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.saveToProfile).toBe(true)
    }
  })

  it('saveToProfile coerce: false → false', () => {
    const result = CheckoutFormSchema.safeParse(validData({ saveToProfile: false }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.saveToProfile).toBe(false)
    }
  })
})
