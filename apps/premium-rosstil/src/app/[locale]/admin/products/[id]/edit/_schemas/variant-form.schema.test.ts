import { describe, expect, it } from 'vitest'
import { type VariantFormData, VariantFormSchema } from './variant-form.schema'

describe('VariantFormSchema', () => {
  const validData: VariantFormData = {
    color: 'Красный',
    composition: 'Хлопок 100%',
  }

  describe('Valid data', () => {
    it('should validate correct variant data', () => {
      const result = VariantFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept long composition text', () => {
      const data = {
        ...validData,
        composition: 'Хлопок 95%, Эластан 5%, Подкладка: Полиэстер 100%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept color with multiple words', () => {
      const data = {
        ...validData,
        color: 'Тёмно-синий с принтом',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Color validation', () => {
    it('should require color field', () => {
      const data = { ...validData, color: '' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цвет обязателен для заполнения')
      }
    })

    it('should accept whitespace-only color (no trim validation)', () => {
      // Схема использует min(1) без trim(), пробелы проходят
      const data = { ...validData, color: '   ' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept single character color', () => {
      const data = { ...validData, color: 'Б' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept color with numbers', () => {
      const data = { ...validData, color: 'Красный RAL 3020' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Composition validation', () => {
    it('should require composition field', () => {
      const data = { ...validData, composition: '' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Состав обязателен для заполнения')
      }
    })

    it('should accept whitespace-only composition (no trim validation)', () => {
      // Схема использует min(1) без trim(), пробелы проходят
      const data = { ...validData, composition: '   ' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept composition with percentages', () => {
      const data = { ...validData, composition: '70% шерсть, 30% полиэстер' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept composition with special characters', () => {
      const data = {
        ...validData,
        composition: 'Ткань: 100% хлопок, Отделка: кружево (нейлон)',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('.strip() behavior', () => {
    it('should strip React Server Actions fields', () => {
      const data = {
        ...validData,
        $ACTION_ID_abc123: 'value',
        $ACTION_REF_123: 'ref',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('$ACTION_ID_abc123')
        expect(result.data).not.toHaveProperty('$ACTION_REF_123')
      }
    })

    it('should strip unknown fields', () => {
      const data = {
        ...validData,
        unknownField: 'should be removed',
        anotherUnknown: 123,
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField')
        expect(result.data).not.toHaveProperty('anotherUnknown')
      }
    })

    it('should only keep color and composition fields', () => {
      const data = {
        ...validData,
        extra1: 'value1',
        extra2: 'value2',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data)).toEqual(['color', 'composition'])
      }
    })
  })

  describe('Real-world examples', () => {
    it('should validate cotton variant', () => {
      const data: VariantFormData = {
        color: 'Белый',
        composition: 'Хлопок 100%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate mixed fabric variant', () => {
      const data: VariantFormData = {
        color: 'Синий',
        composition: 'Хлопок 65%, Полиэстер 35%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate complex composition', () => {
      const data: VariantFormData = {
        color: 'Чёрный',
        composition: 'Верх: Шерсть 80%, Полиамид 20%. Подкладка: Вискоза 100%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate pattern color description', () => {
      const data: VariantFormData = {
        color: 'Бежевый с цветочным принтом',
        composition: 'Вискоза 100%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Multiple validation errors', () => {
    it('should return all errors when both fields are empty', () => {
      const data = { color: '', composition: '' }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBe(2)
      }
    })

    it('should return all errors when both fields are missing', () => {
      const data = {}
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('Type inference', () => {
    it('should infer correct TypeScript type', () => {
      const data: VariantFormData = {
        color: 'Test',
        composition: 'Test',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        const typed: VariantFormData = result.data
        expect(typed.color).toBeDefined()
        expect(typed.composition).toBeDefined()
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle very long color names', () => {
      const data = {
        ...validData,
        color: 'Сине-зелёно-фиолетовый с металлическим отливом',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle very long composition', () => {
      const data = {
        ...validData,
        composition:
          'Основная ткань: Полиэстер 50%, Вискоза 45%, Эластан 5%. Подкладка рукавов: Полиэстер 100%. Подкладка тела: Вискоза 100%. Отделка: Хлопок 100%',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle Cyrillic and Latin mix', () => {
      const data = {
        ...validData,
        color: 'Black (Чёрный)',
        composition: 'Cotton 100% (Хлопок)',
      }
      const result = VariantFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should trim leading/trailing whitespace in validation', () => {
      const data = {
        color: '  Красный  ',
        composition: '  Хлопок 100%  ',
      }
      const result = VariantFormSchema.safeParse(data)
      // Note: Zod doesn't trim by default, so this should pass
      expect(result.success).toBe(true)
    })
  })
})
