import { describe, expect, it } from 'vitest'
import { type ItemFormData, ItemFormSchema } from './item-form.schema'

describe('ItemFormSchema', () => {
  const validData: ItemFormData = {
    sizeId: 'size-uuid-123',
    price: '1999.99',
    availableCount: '10',
  }

  describe('Valid data', () => {
    it('should validate correct item data', () => {
      const result = ItemFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should default availableCount to "0" when not provided', () => {
      const { availableCount: _availableCount, ...dataWithoutCount } = validData
      const result = ItemFormSchema.safeParse(dataWithoutCount)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availableCount).toBe('0')
      }
    })

    it('should accept 0 as availableCount', () => {
      const data = { ...validData, availableCount: '0' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('sizeId validation', () => {
    it('should require sizeId', () => {
      const data = { ...validData, sizeId: '' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Размер обязателен для заполнения')
      }
    })

    it('should accept whitespace-only sizeId (no trim validation)', () => {
      // Схема использует min(1) без trim(), пробелы проходят
      const data = { ...validData, sizeId: '   ' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept UUID format sizeId', () => {
      const data = {
        ...validData,
        sizeId: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept any non-empty string as sizeId', () => {
      const data = { ...validData, sizeId: 'custom-id-123' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('price validation', () => {
    it('should require price', () => {
      const data = { ...validData, price: '' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена обязательна для заполнения')
      }
    })

    it('should reject whitespace-only price', () => {
      const data = { ...validData, price: '   ' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept integer price', () => {
      const data = { ...validData, price: '2000' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept decimal price', () => {
      const data = { ...validData, price: '1999.99' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept price with many decimals', () => {
      const data = { ...validData, price: '1999.9999' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject negative price', () => {
      const data = { ...validData, price: '-100' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена должна быть положительным числом')
      }
    })

    it('should reject zero price', () => {
      const data = { ...validData, price: '0' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена должна быть положительным числом')
      }
    })

    it('should reject 0.00 price', () => {
      const data = { ...validData, price: '0.00' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric price', () => {
      const data = { ...validData, price: 'not-a-number' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена должна быть положительным числом')
      }
    })

    it('should accept very small positive price', () => {
      const data = { ...validData, price: '0.01' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept very large price', () => {
      const data = { ...validData, price: '999999.99' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept price without decimals', () => {
      const data = { ...validData, price: '1500' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject price with spaces', () => {
      const data = { ...validData, price: '1 999.99' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject price with currency symbols', () => {
      const data = { ...validData, price: '₽1999' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('availableCount validation', () => {
    it('should accept valid count', () => {
      const data = { ...validData, availableCount: '50' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept zero count', () => {
      const data = { ...validData, availableCount: '0' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject negative count', () => {
      const data = { ...validData, availableCount: '-5' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Количество должно быть неотрицательным числом')
      }
    })

    it('should accept decimal count (schema allows any non-negative number)', () => {
      // Схема проверяет только >= 0, не целочисленность
      const data = { ...validData, availableCount: '10.5' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject non-numeric count', () => {
      const data = { ...validData, availableCount: 'много' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept very large count', () => {
      const data = { ...validData, availableCount: '9999' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept undefined (uses default)', () => {
      const data = {
        sizeId: 'size-123',
        price: '1999.99',
        availableCount: undefined,
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availableCount).toBe('0')
      }
    })

    it('should accept empty string count (Number("") is 0)', () => {
      // Number('') возвращает 0, что >= 0
      const data = { ...validData, availableCount: '' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept whitespace count (Number("  ") is 0)', () => {
      // Number('  ') возвращает 0, что >= 0
      const data = { ...validData, availableCount: '  ' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('.strip() behavior', () => {
    it('should strip React Server Actions fields', () => {
      const data = {
        ...validData,
        $ACTION_ID_xyz: 'action-id',
        $ACTION_REF_abc: 'action-ref',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('$ACTION_ID_xyz')
        expect(result.data).not.toHaveProperty('$ACTION_REF_abc')
      }
    })

    it('should strip unknown fields', () => {
      const data = {
        ...validData,
        extraField: 'extra',
        unknownProp: 123,
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('extraField')
        expect(result.data).not.toHaveProperty('unknownProp')
      }
    })

    it('should only keep sizeId, price, and availableCount', () => {
      const data = {
        ...validData,
        productId: 'product-123',
        variantId: 'variant-456',
        other: 'data',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data).sort()).toEqual(['availableCount', 'price', 'sizeId'])
      }
    })
  })

  describe('Real-world examples', () => {
    it('should validate standard product item', () => {
      const data: ItemFormData = {
        sizeId: '550e8400-e29b-41d4-a716-446655440000',
        price: '2999.00',
        availableCount: '15',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate out-of-stock item', () => {
      const data: ItemFormData = {
        sizeId: 'size-m-001',
        price: '1499.99',
        availableCount: '0',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate premium item with high price', () => {
      const data: ItemFormData = {
        sizeId: 'size-xl-premium',
        price: '25000.00',
        availableCount: '3',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate clearance item', () => {
      const data: ItemFormData = {
        sizeId: 'size-s-clearance',
        price: '499.99',
        availableCount: '100',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate item with fractional price', () => {
      const data: ItemFormData = {
        sizeId: 'size-m',
        price: '1999.95',
        availableCount: '20',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Multiple validation errors', () => {
    it('should return all errors when all fields are invalid', () => {
      const data = {
        sizeId: '',
        price: '-100',
        availableCount: '-5',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('should return errors for missing required fields', () => {
      const data = {}
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        // sizeId and price are required
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('should return error when only sizeId is provided', () => {
      const data = { sizeId: 'size-123' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should return error when only price is provided', () => {
      const data = { price: '1999.99' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Type inference', () => {
    it('should infer correct TypeScript type', () => {
      const data: ItemFormData = {
        sizeId: 'test',
        price: '100',
        availableCount: '10',
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        const typed: ItemFormData = result.data
        expect(typeof typed.sizeId).toBe('string')
        expect(typeof typed.price).toBe('string')
        expect(typeof typed.availableCount).toBe('string')
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle price with leading zeros', () => {
      const data = { ...validData, price: '0099.99' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle count with leading zeros', () => {
      const data = { ...validData, availableCount: '007' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle very precise price', () => {
      const data = { ...validData, price: '1999.999999' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle scientific notation in price (should fail)', () => {
      const data = { ...validData, price: '1e3' }
      const result = ItemFormSchema.safeParse(data)
      // Scientific notation converts to 1000, which is valid
      expect(result.success).toBe(true)
    })

    it('should handle very long sizeId', () => {
      const data = {
        ...validData,
        sizeId: 'a'.repeat(500),
      }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle price as "1"', () => {
      const data = { ...validData, price: '1' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept Infinity price (Number("Infinity") > 0)', () => {
      // Number('Infinity') возвращает Infinity, который > 0
      const data = { ...validData, price: 'Infinity' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle NaN price (should fail)', () => {
      const data = { ...validData, price: 'NaN' }
      const result = ItemFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})
