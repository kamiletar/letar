import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { getZodConstraints } from './schema-constraints'

describe('getZodConstraints', () => {
  describe('string constraints', () => {
    it('extracts minLength from z.string().min()', () => {
      const schema = z.object({
        title: z.string().min(2),
      })

      const result = getZodConstraints(schema, 'title')

      expect(result.schemaType).toBe('string')
      expect(result.string?.minLength).toBe(2)
    })

    it('extracts maxLength from z.string().max()', () => {
      const schema = z.object({
        title: z.string().max(100),
      })

      const result = getZodConstraints(schema, 'title')

      expect(result.schemaType).toBe('string')
      expect(result.string?.maxLength).toBe(100)
    })

    it('extracts both minLength and maxLength', () => {
      const schema = z.object({
        title: z.string().min(2).max(100),
      })

      const result = getZodConstraints(schema, 'title')

      expect(result.string?.minLength).toBe(2)
      expect(result.string?.maxLength).toBe(100)
    })

    it('extracts exact length from z.string().length()', () => {
      const schema = z.object({
        code: z.string().length(6),
      })

      const result = getZodConstraints(schema, 'code')

      expect(result.string?.minLength).toBe(6)
      expect(result.string?.maxLength).toBe(6)
    })

    it('detects email input type from z.string().email()', () => {
      const schema = z.object({
        email: z.string().email(),
      })

      const result = getZodConstraints(schema, 'email')

      expect(result.string?.inputType).toBe('email')
    })

    it('detects url input type from z.string().url()', () => {
      const schema = z.object({
        website: z.string().url(),
      })

      const result = getZodConstraints(schema, 'website')

      expect(result.string?.inputType).toBe('url')
    })

    it('extracts pattern from z.string().regex()', () => {
      const schema = z.object({
        phone: z.string().regex(/^\+7\d{10}$/),
      })

      const result = getZodConstraints(schema, 'phone')

      expect(result.string?.pattern).toBe('^\\+7\\d{10}$')
    })
  })

  describe('number constraints', () => {
    it('extracts min from z.number().min()', () => {
      const schema = z.object({
        rating: z.number().min(1),
      })

      const result = getZodConstraints(schema, 'rating')

      expect(result.schemaType).toBe('number')
      expect(result.number?.min).toBe(1)
    })

    it('extracts max from z.number().max()', () => {
      const schema = z.object({
        rating: z.number().max(10),
      })

      const result = getZodConstraints(schema, 'rating')

      expect(result.number?.max).toBe(10)
    })

    it('extracts both min and max', () => {
      const schema = z.object({
        rating: z.number().min(1).max(10),
      })

      const result = getZodConstraints(schema, 'rating')

      expect(result.number?.min).toBe(1)
      expect(result.number?.max).toBe(10)
    })

    it('detects integer and sets step=1 from z.number().int()', () => {
      const schema = z.object({
        count: z.number().int(),
      })

      const result = getZodConstraints(schema, 'count')

      expect(result.number?.isInteger).toBe(true)
      expect(result.number?.step).toBe(1)
    })

    it('extracts step from z.number().multipleOf()', () => {
      const schema = z.object({
        price: z.number().multipleOf(0.01),
      })

      const result = getZodConstraints(schema, 'price')

      expect(result.number?.step).toBe(0.01)
    })
  })

  describe('date constraints', () => {
    it('extracts min date from z.date().min()', () => {
      const minDate = new Date('2024-01-01')
      const schema = z.object({
        startDate: z.date().min(minDate),
      })

      const result = getZodConstraints(schema, 'startDate')

      expect(result.schemaType).toBe('date')
      expect(result.date?.min).toBe('2024-01-01')
    })

    it('extracts max date from z.date().max()', () => {
      const maxDate = new Date('2024-12-31')
      const schema = z.object({
        endDate: z.date().max(maxDate),
      })

      const result = getZodConstraints(schema, 'endDate')

      expect(result.date?.max).toBe('2024-12-31')
    })

    it('extracts both min and max dates', () => {
      const minDate = new Date('2024-01-01')
      const maxDate = new Date('2024-12-31')
      const schema = z.object({
        date: z.date().min(minDate).max(maxDate),
      })

      const result = getZodConstraints(schema, 'date')

      expect(result.date?.min).toBe('2024-01-01')
      expect(result.date?.max).toBe('2024-12-31')
    })
  })

  describe('array constraints', () => {
    it('extracts minItems from z.array().min()', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1),
      })

      const result = getZodConstraints(schema, 'tags')

      expect(result.schemaType).toBe('array')
      expect(result.array?.minItems).toBe(1)
    })

    it('extracts maxItems from z.array().max()', () => {
      const schema = z.object({
        tags: z.array(z.string()).max(5),
      })

      const result = getZodConstraints(schema, 'tags')

      expect(result.array?.maxItems).toBe(5)
    })

    it('extracts both minItems and maxItems', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1).max(10),
      })

      const result = getZodConstraints(schema, 'tags')

      expect(result.array?.minItems).toBe(1)
      expect(result.array?.maxItems).toBe(10)
    })
  })

  describe('nested paths', () => {
    it('handles nested object paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            bio: z.string().max(500),
          }),
        }),
      })

      const result = getZodConstraints(schema, 'user.profile.bio')

      expect(result.string?.maxLength).toBe(500)
    })

    it('handles array element paths', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string().min(2).max(50),
          })
        ),
      })

      const result = getZodConstraints(schema, 'items.0.name')

      expect(result.string?.minLength).toBe(2)
      expect(result.string?.maxLength).toBe(50)
    })
  })

  describe('optional/nullable handling', () => {
    it('unwraps optional() and extracts constraints', () => {
      const schema = z.object({
        title: z.string().max(100).optional(),
      })

      const result = getZodConstraints(schema, 'title')

      expect(result.string?.maxLength).toBe(100)
    })

    it('unwraps nullable() and extracts constraints', () => {
      const schema = z.object({
        rating: z.number().min(1).max(10).nullable(),
      })

      const result = getZodConstraints(schema, 'rating')

      expect(result.number?.min).toBe(1)
      expect(result.number?.max).toBe(10)
    })

    it('unwraps default() and extracts constraints', () => {
      const schema = z.object({
        count: z.number().min(0).default(0),
      })

      const result = getZodConstraints(schema, 'count')

      expect(result.number?.min).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('returns unknown for non-existent path', () => {
      const schema = z.object({
        title: z.string(),
      })

      const result = getZodConstraints(schema, 'nonexistent')

      expect(result.schemaType).toBe('unknown')
    })

    it('returns unknown for null schema', () => {
      const result = getZodConstraints(null, 'title')

      expect(result.schemaType).toBe('unknown')
    })

    it('returns unknown for undefined schema', () => {
      const result = getZodConstraints(undefined, 'title')

      expect(result.schemaType).toBe('unknown')
    })

    it('detects boolean type', () => {
      const schema = z.object({
        isActive: z.boolean(),
      })

      const result = getZodConstraints(schema, 'isActive')

      expect(result.schemaType).toBe('boolean')
    })

    it('detects enum type', () => {
      const schema = z.object({
        status: z.enum(['draft', 'published', 'archived']),
      })

      const result = getZodConstraints(schema, 'status')

      expect(result.schemaType).toBe('enum')
    })
  })
})
