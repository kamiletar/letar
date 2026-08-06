import { describe, expect, it } from 'vitest'
import { generateConstraintHint } from './constraint-hints'
import type { ZodConstraints } from './schema-constraints'

describe('generateConstraintHint', () => {
  describe('English (default)', () => {
    it('generates hint for maxLength', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { maxLength: 100 },
      }
      expect(generateConstraintHint(constraints)).toBe('Maximum 100 characters')
    })

    it('generates hint for minLength', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2 },
      }
      expect(generateConstraintHint(constraints)).toBe('Minimum 2 characters')
    })

    it('generates hint for range', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2, maxLength: 100 },
      }
      expect(generateConstraintHint(constraints)).toBe('From 2 to 100 characters')
    })

    it('generates hint for exact length', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 6, maxLength: 6 },
      }
      expect(generateConstraintHint(constraints)).toBe('Exactly 6 characters')
    })

    it('pluralizes 1 character correctly', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 1 },
      }
      expect(generateConstraintHint(constraints)).toBe('Minimum 1 character')
    })

    it('generates number range', () => {
      const constraints: ZodConstraints = {
        schemaType: 'number',
        number: { min: 1, max: 10 },
      }
      expect(generateConstraintHint(constraints)).toBe('From 1 to 10')
    })

    it('generates integer hint', () => {
      const constraints: ZodConstraints = {
        schemaType: 'number',
        number: { isInteger: true },
      }
      expect(generateConstraintHint(constraints)).toBe('Integer')
    })

    it('generates integer suffix', () => {
      const constraints: ZodConstraints = {
        schemaType: 'number',
        number: { min: 1, max: 100, isInteger: true },
      }
      expect(generateConstraintHint(constraints)).toBe('From 1 to 100 (integer)')
    })

    it('generates array hint', () => {
      const constraints: ZodConstraints = {
        schemaType: 'array',
        array: { minItems: 1, maxItems: 10 },
      }
      expect(generateConstraintHint(constraints)).toBe('From 1 to 10 items')
    })

    it('pluralizes 1 item correctly', () => {
      const constraints: ZodConstraints = {
        schemaType: 'array',
        array: { maxItems: 1 },
      }
      expect(generateConstraintHint(constraints)).toBe('Maximum 1 item')
    })

    it('returns undefined for email without length', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { inputType: 'email' },
      }
      expect(generateConstraintHint(constraints)).toBeUndefined()
    })

    it('shows maxLength for email', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { inputType: 'email', maxLength: 255 },
      }
      expect(generateConstraintHint(constraints)).toBe('Maximum 255 characters')
    })

    it('generates date hint', () => {
      const constraints: ZodConstraints = {
        schemaType: 'date',
        date: { min: '2024-01-01' },
      }
      const hint = generateConstraintHint(constraints)
      expect(hint).toContain('Not before')
      expect(hint).toContain('2024')
    })
  })

  describe('Russian (locale=ru)', () => {
    it('generates hint for maxLength', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { maxLength: 100 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Максимум 100 символов')
    })

    it('generates hint for minLength', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Минимум 2 символа')
    })

    it('generates hint for range', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2, maxLength: 100 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('От 2 до 100 символов')
    })

    it('generates hint for exact length', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 6, maxLength: 6 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Ровно 6 символов')
    })

    it('pluralizes 1 символ correctly', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 1 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Минимум 1 символ')
    })

    it('pluralizes 2-4 символа correctly', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { maxLength: 4 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Максимум 4 символа')
    })

    it('pluralizes 5+ символов correctly', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { maxLength: 15 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Максимум 15 символов')
    })

    it('pluralizes 11-19 special case', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { maxLength: 11 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Максимум 11 символов')
    })

    it('generates number range', () => {
      const constraints: ZodConstraints = {
        schemaType: 'number',
        number: { min: 1, max: 10 },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('От 1 до 10')
    })

    it('generates integer hint', () => {
      const constraints: ZodConstraints = {
        schemaType: 'number',
        number: { isInteger: true },
      }
      expect(generateConstraintHint(constraints, 'ru')).toBe('Целое число')
    })

    it('generates array hints with correct pluralization', () => {
      expect(
        generateConstraintHint(
          {
            schemaType: 'array',
            array: { maxItems: 1 },
          },
          'ru',
        ),
      ).toBe('Максимум 1 элемент')

      expect(
        generateConstraintHint(
          {
            schemaType: 'array',
            array: { maxItems: 2 },
          },
          'ru',
        ),
      ).toBe('Максимум 2 элемента')

      expect(
        generateConstraintHint(
          {
            schemaType: 'array',
            array: { maxItems: 5 },
          },
          'ru',
        ),
      ).toBe('Максимум 5 элементов')
    })

    it('generates date hints', () => {
      expect(
        generateConstraintHint(
          {
            schemaType: 'date',
            date: { min: '2024-01-01' },
          },
          'ru',
        ),
      ).toContain('Не ранее')

      expect(
        generateConstraintHint(
          {
            schemaType: 'date',
            date: { max: '2024-12-31' },
          },
          'ru',
        ),
      ).toContain('Не позднее')
    })
  })

  describe('edge cases', () => {
    it('returns undefined for undefined constraints', () => {
      expect(generateConstraintHint(undefined)).toBeUndefined()
    })

    it('returns undefined for unknown schema type', () => {
      expect(generateConstraintHint({ schemaType: 'unknown' })).toBeUndefined()
    })

    it('returns undefined for boolean type', () => {
      expect(generateConstraintHint({ schemaType: 'boolean' })).toBeUndefined()
    })

    it('returns undefined for enum type', () => {
      expect(generateConstraintHint({ schemaType: 'enum' })).toBeUndefined()
    })

    it('returns undefined for empty constraints', () => {
      expect(generateConstraintHint({ schemaType: 'string', string: {} })).toBeUndefined()
      expect(generateConstraintHint({ schemaType: 'number', number: {} })).toBeUndefined()
    })

    it('falls back to English for unknown locale', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2 },
      }
      expect(generateConstraintHint(constraints, 'ja')).toBe('Minimum 2 characters')
    })

    it('accepts custom translations', () => {
      const constraints: ZodConstraints = {
        schemaType: 'string',
        string: { minLength: 2 },
      }
      expect(
        generateConstraintHint(constraints, 'de', {
          string_min: 'Mindestens {n} Zeichen',
        }),
      ).toBe('Mindestens 2 Zeichen')
    })
  })
})
