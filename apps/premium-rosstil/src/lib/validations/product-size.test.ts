import { Gender } from '@/generated/prisma'
import { describe, expect, it } from 'vitest'
import { type ProductSizeInput, productSizeSchema } from './product-size'

describe('productSizeSchema', () => {
  const validInput: ProductSizeInput = {
    gender: Gender.FEMALE,
    international: 'M',
    ru: '46',
    de: '38',
    it: '42',
    fr: '38',
    uk: '10',
    us: '8',
    jeansFrom: '29',
    jeansTo: '32',
    bustMin: 88,
    bustMax: 92,
    waistMin: 66,
    waistMax: 70,
    hipsMin: 92,
    hipsMax: 96,
  }

  describe('Required fields', () => {
    it('should validate complete valid input', () => {
      const result = productSizeSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should require gender', () => {
      const input = { ...validInput, gender: undefined }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Выберите пол')
      }
    })

    it('should require international size', () => {
      const input = { ...validInput, international: undefined }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Zod v4 возвращает 'Invalid input: expected string, received undefined' для undefined
        expect(result.error.issues[0].path).toContain('international')
      }
    })

    it('should require RU size', () => {
      const input = { ...validInput, ru: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('RU размер обязателен')
      }
    })

    it('should require DE size', () => {
      const input = { ...validInput, de: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('DE размер обязателен')
      }
    })

    it('should require IT size', () => {
      const input = { ...validInput, it: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IT размер обязателен')
      }
    })

    it('should require FR size', () => {
      const input = { ...validInput, fr: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('FR размер обязателен')
      }
    })

    it('should require UK size', () => {
      const input = { ...validInput, uk: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('UK размер обязателен')
      }
    })

    it('should require US size', () => {
      const input = { ...validInput, us: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('US размер обязателен')
      }
    })

    it('should require jeansFrom', () => {
      const input = { ...validInput, jeansFrom: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Размер джинс (от) обязателен')
      }
    })

    it('should require jeansTo', () => {
      const input = { ...validInput, jeansTo: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Размер джинс (до) обязателен')
      }
    })
  })

  describe('Gender validation', () => {
    it('should accept MALE gender', () => {
      const input = { ...validInput, gender: Gender.MALE }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should accept FEMALE gender', () => {
      const input = { ...validInput, gender: Gender.FEMALE }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject invalid gender', () => {
      const input = { ...validInput, gender: 'INVALID' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('International size validation', () => {
    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

    sizes.forEach((size) => {
      it(`should accept ${size} international size`, () => {
        const input = {
          ...validInput,
          international: size,
        }
        const result = productSizeSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    it('should reject empty international size', () => {
      const input = { ...validInput, international: '' }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('Measurements validation', () => {
    it('should accept valid measurements', () => {
      const result = productSizeSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept missing measurements (optional)', () => {
      const input = {
        ...validInput,
        bustMin: undefined,
        bustMax: undefined,
        waistMin: undefined,
        waistMax: undefined,
        hipsMin: undefined,
        hipsMax: undefined,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should accept empty string for measurements', () => {
      const input = {
        ...validInput,
        bustMin: '',
        bustMax: '',
        waistMin: '',
        waistMax: '',
        hipsMin: '',
        hipsMax: '',
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should coerce string numbers to integers', () => {
      const input = {
        ...validInput,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bustMin: '88' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bustMax: '92' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        waistMin: '66' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        waistMax: '70' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hipsMin: '92' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hipsMax: '96' as any,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.bustMin).toBe('number')
        expect(result.data.bustMin).toBe(88)
      }
    })

    it('should require positive bustMin', () => {
      const input = { ...validInput, bustMin: -10 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Обхват груди (от) должен быть положительным числом')
      }
    })

    it('should require positive bustMax', () => {
      const input = { ...validInput, bustMax: 0 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Обхват груди (до) должен быть положительным числом')
      }
    })

    it('should require positive waistMin', () => {
      const input = { ...validInput, waistMin: -5 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should require positive waistMax', () => {
      const input = { ...validInput, waistMax: 0 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should require positive hipsMin', () => {
      const input = { ...validInput, hipsMin: -1 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should require positive hipsMax', () => {
      const input = { ...validInput, hipsMax: 0 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should require integer measurements', () => {
      const input = { ...validInput, bustMin: 88.5 }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject invalid number strings', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = { ...validInput, bustMin: 'not-a-number' as any }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('Real-world examples', () => {
    it('should validate female size M (46 RU)', () => {
      const input: ProductSizeInput = {
        gender: Gender.FEMALE,
        international: 'M',
        ru: '46',
        de: '38',
        it: '42',
        fr: '38',
        uk: '10',
        us: '8',
        jeansFrom: '29',
        jeansTo: '32',
        bustMin: 88,
        bustMax: 92,
        waistMin: 66,
        waistMax: 70,
        hipsMin: 92,
        hipsMax: 96,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate male size L', () => {
      const input: ProductSizeInput = {
        gender: Gender.MALE,
        international: 'L',
        ru: '50',
        de: '50',
        it: '50',
        fr: '50',
        uk: '40',
        us: '40',
        jeansFrom: '32',
        jeansTo: '34',
        bustMin: 96,
        bustMax: 100,
        waistMin: 84,
        waistMax: 88,
        hipsMin: 100,
        hipsMax: 104,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate size without measurements', () => {
      const input: ProductSizeInput = {
        gender: Gender.FEMALE,
        international: 'S',
        ru: '44',
        de: '36',
        it: '40',
        fr: '36',
        uk: '8',
        us: '6',
        jeansFrom: '27',
        jeansTo: '28',
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle very large sizes', () => {
      const input: ProductSizeInput = {
        ...validInput,
        ru: '60',
        bustMin: 120,
        bustMax: 130,
        waistMin: 100,
        waistMax: 110,
        hipsMin: 130,
        hipsMax: 140,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should handle very small sizes', () => {
      const input: ProductSizeInput = {
        ...validInput,
        international: 'XXS',
        ru: '38',
        bustMin: 76,
        bustMax: 80,
        waistMin: 56,
        waistMax: 60,
        hipsMin: 82,
        hipsMax: 86,
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should handle wide jeans range', () => {
      const input: ProductSizeInput = {
        ...validInput,
        jeansFrom: '25',
        jeansTo: '38',
      }
      const result = productSizeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})
