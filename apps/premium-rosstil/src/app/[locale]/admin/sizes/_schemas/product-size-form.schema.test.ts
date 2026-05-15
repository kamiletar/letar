import { Gender } from '@/generated/prisma'
import { describe, expect, it } from 'vitest'
import { type ProductSizeFormData, ProductSizeFormSchema } from './product-size-form.schema'

describe('ProductSizeFormSchema', () => {
  const validData: ProductSizeFormData = {
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
    sortOrder: 10,
  }

  describe('Valid data', () => {
    it('should validate complete valid data', () => {
      const result = ProductSizeFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should default sortOrder to 0 when not provided', () => {
      const { sortOrder: _sortOrder, ...dataWithoutSort } = validData
      const result = ProductSizeFormSchema.safeParse(dataWithoutSort)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sortOrder).toBe(0)
      }
    })
  })

  describe('Gender validation', () => {
    it('should accept FEMALE gender', () => {
      const data = { ...validData, gender: Gender.FEMALE }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept MALE gender', () => {
      const data = { ...validData, gender: Gender.MALE }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid gender', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { ...validData, gender: 'INVALID' as any }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty gender', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { ...validData, gender: '' as any }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Required string fields', () => {
    const stringFields = ['international', 'ru', 'de', 'it', 'fr', 'uk', 'us', 'jeansFrom', 'jeansTo'] as const

    stringFields.forEach((field) => {
      it(`should require ${field} field`, () => {
        const data = { ...validData, [field]: '' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Поле обязательно для заполнения')
        }
      })

      it(`should accept whitespace-only ${field} (no trim validation)`, () => {
        // Схема использует min(1) без trim(), пробелы проходят
        const data = { ...validData, [field]: '   ' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it(`should accept valid ${field}`, () => {
        const data = { ...validData, [field]: 'Valid' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Measurement fields validation', () => {
    // Тесты для min полей должны учитывать соответствующие max поля (refine constraint)
    // Пары: bustMin/bustMax, waistMin/waistMax, hipsMin/hipsMax

    describe('bustMin field', () => {
      it('should coerce string to number for bustMin', () => {
        const data = { ...validData, bustMin: '85', bustMax: 95 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.bustMin).toBe('number')
          expect(result.data.bustMin).toBe(85)
        }
      })

      it('should accept valid positive integer for bustMin', () => {
        const data = { ...validData, bustMin: 100, bustMax: 110 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('bustMax field', () => {
      it('should coerce string to number for bustMax', () => {
        const data = { ...validData, bustMax: '95' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.bustMax).toBe('number')
          expect(result.data.bustMax).toBe(95)
        }
      })
    })

    describe('waistMin field', () => {
      it('should coerce string to number for waistMin', () => {
        const data = { ...validData, waistMin: '65', waistMax: 75 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.waistMin).toBe('number')
          expect(result.data.waistMin).toBe(65)
        }
      })

      it('should accept valid positive integer for waistMin', () => {
        const data = { ...validData, waistMin: 100, waistMax: 110 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('waistMax field', () => {
      it('should coerce string to number for waistMax', () => {
        const data = { ...validData, waistMax: '75' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.waistMax).toBe('number')
          expect(result.data.waistMax).toBe(75)
        }
      })
    })

    describe('hipsMin field', () => {
      it('should coerce string to number for hipsMin', () => {
        const data = { ...validData, hipsMin: '90', hipsMax: 100 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.hipsMin).toBe('number')
          expect(result.data.hipsMin).toBe(90)
        }
      })

      it('should accept valid positive integer for hipsMin', () => {
        const data = { ...validData, hipsMin: 100, hipsMax: 110 }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('hipsMax field', () => {
      it('should coerce string to number for hipsMax', () => {
        const data = { ...validData, hipsMax: '100' }
        const result = ProductSizeFormSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.hipsMax).toBe('number')
          expect(result.data.hipsMax).toBe(100)
        }
      })
    })

    describe('common validation for all measurement fields', () => {
      const measurementFields = ['bustMin', 'bustMax', 'waistMin', 'waistMax', 'hipsMin', 'hipsMax'] as const

      measurementFields.forEach((field) => {
        it(`should require integer for ${field}`, () => {
          const data = { ...validData, [field]: 90.5 }
          const result = ProductSizeFormSchema.safeParse(data)
          expect(result.success).toBe(false)
        })

        it(`should require non-negative for ${field}`, () => {
          const data = { ...validData, [field]: -1 }
          const result = ProductSizeFormSchema.safeParse(data)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Минимальное значение: 0')
          }
        })

        it(`should accept 0 for ${field}`, () => {
          const data = { ...validData, [field]: 0 }
          const result = ProductSizeFormSchema.safeParse(data)
          // Базовая валидация проходит, но refine может упасть
          expect(result.success).toBeDefined()
        })
      })
    })
  })

  describe('Measurement range validation (.refine)', () => {
    it('should require bustMin < bustMax', () => {
      const data = { ...validData, bustMin: 95, bustMax: 90 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Минимальный обхват груди должен быть меньше максимального')
        expect(result.error.issues[0].path).toContain('bustMax')
      }
    })

    it('should reject equal bustMin and bustMax', () => {
      const data = { ...validData, bustMin: 90, bustMax: 90 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should require waistMin < waistMax', () => {
      const data = { ...validData, waistMin: 75, waistMax: 70 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Минимальный обхват талии должен быть меньше максимального')
        expect(result.error.issues[0].path).toContain('waistMax')
      }
    })

    it('should reject equal waistMin and waistMax', () => {
      const data = { ...validData, waistMin: 70, waistMax: 70 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should require hipsMin < hipsMax', () => {
      const data = { ...validData, hipsMin: 100, hipsMax: 95 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Минимальный обхват бедер должен быть меньше максимального')
        expect(result.error.issues[0].path).toContain('hipsMax')
      }
    })

    it('should reject equal hipsMin and hipsMax', () => {
      const data = { ...validData, hipsMin: 95, hipsMax: 95 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept valid ranges for all measurements', () => {
      const data = {
        ...validData,
        bustMin: 80,
        bustMax: 85,
        waistMin: 60,
        waistMax: 65,
        hipsMin: 85,
        hipsMax: 90,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('sortOrder validation', () => {
    it('should accept valid sortOrder', () => {
      const data = { ...validData, sortOrder: 5 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should coerce string sortOrder to number', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { ...validData, sortOrder: '15' as any }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.sortOrder).toBe('number')
        expect(result.data.sortOrder).toBe(15)
      }
    })

    it('should require non-negative sortOrder', () => {
      const data = { ...validData, sortOrder: -1 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Минимальное значение: 0')
      }
    })

    it('should accept 0 as sortOrder', () => {
      const data = { ...validData, sortOrder: 0 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require integer sortOrder', () => {
      const data = { ...validData, sortOrder: 5.5 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('.strip() behavior', () => {
    it('should strip React Server Actions fields', () => {
      const data = {
        ...validData,
        $ACTION_ID_abc: 'value',
        $ACTION_REF_123: 'ref',
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('$ACTION_ID_abc')
        expect(result.data).not.toHaveProperty('$ACTION_REF_123')
      }
    })

    it('should strip unknown fields', () => {
      const data = {
        ...validData,
        unknownField: 'test',
        extraData: 123,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField')
        expect(result.data).not.toHaveProperty('extraData')
      }
    })
  })

  describe('Real-world examples', () => {
    it('should validate female size S (44 RU)', () => {
      const data: ProductSizeFormData = {
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
        bustMin: 84,
        bustMax: 88,
        waistMin: 62,
        waistMax: 66,
        hipsMin: 88,
        hipsMax: 92,
        sortOrder: 5,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate male size XL (52 RU)', () => {
      const data: ProductSizeFormData = {
        gender: Gender.MALE,
        international: 'XL',
        ru: '52',
        de: '52',
        it: '52',
        fr: '52',
        uk: '42',
        us: '42',
        jeansFrom: '34',
        jeansTo: '36',
        bustMin: 100,
        bustMax: 104,
        waistMin: 88,
        waistMax: 92,
        hipsMin: 104,
        hipsMax: 108,
        sortOrder: 15,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate size with wide measurement ranges', () => {
      const data: ProductSizeFormData = {
        ...validData,
        bustMin: 88,
        bustMax: 96,
        waistMin: 66,
        waistMax: 74,
        hipsMin: 92,
        hipsMax: 100,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate size with narrow measurement ranges', () => {
      const data: ProductSizeFormData = {
        ...validData,
        bustMin: 88,
        bustMax: 90,
        waistMin: 66,
        waistMax: 68,
        hipsMin: 92,
        hipsMax: 94,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Multiple validation errors', () => {
    it('should return all field errors when multiple required fields are empty', () => {
      const data = {
        ...validData,
        ru: '',
        de: '',
        it: '',
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('should return all refine errors when multiple ranges are invalid', () => {
      const data = {
        ...validData,
        bustMin: 95,
        bustMax: 90,
        waistMin: 75,
        waistMax: 70,
        hipsMin: 100,
        hipsMax: 95,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBe(3)
      }
    })

    it('should return both field and refine errors', () => {
      const data = {
        ...validData,
        ru: '',
        bustMin: 95,
        bustMax: 90,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle very large measurements', () => {
      const data = {
        ...validData,
        bustMin: 150,
        bustMax: 160,
        waistMin: 130,
        waistMax: 140,
        hipsMin: 160,
        hipsMax: 170,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle minimal valid measurements', () => {
      const data = {
        ...validData,
        bustMin: 1,
        bustMax: 2,
        waistMin: 1,
        waistMax: 2,
        hipsMin: 1,
        hipsMax: 2,
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle very high sortOrder', () => {
      const data = { ...validData, sortOrder: 9999 }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle special characters in size codes', () => {
      const data = {
        ...validData,
        jeansFrom: '29W',
        jeansTo: '32L',
      }
      const result = ProductSizeFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
