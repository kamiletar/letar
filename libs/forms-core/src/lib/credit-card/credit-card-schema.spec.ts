import { describe, expect, it } from 'vitest'
import { creditCardSchema } from './credit-card-schema'

describe('creditCardSchema', () => {
  const schema = creditCardSchema()

  describe('number', () => {
    it('должен принять валидный номер Visa', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '12/99',
        cvc: '123',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонить невалидный Luhn', () => {
      const result = schema.safeParse({
        number: '4111111111111112',
        expiry: '12/99',
        cvc: '123',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонить слишком короткий номер', () => {
      const result = schema.safeParse({
        number: '41111',
        expiry: '12/99',
        cvc: '123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('expiry', () => {
    it('должен принять будущий срок', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '12/99',
        cvc: '123',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонить неверный формат', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '1225',
        cvc: '123',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонить прошедший срок', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '01/20',
        cvc: '123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('cvc', () => {
    it('должен принять 3-значный CVC', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '12/99',
        cvc: '123',
      })
      expect(result.success).toBe(true)
    })

    it('должен принять 4-значный CVC (Amex)', () => {
      const result = schema.safeParse({
        number: '340000000000009',
        expiry: '12/99',
        cvc: '1234',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонить CVC короче 3 символов', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '12/99',
        cvc: '12',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонить CVC длиннее 4 символов', () => {
      const result = schema.safeParse({
        number: '4111111111111111',
        expiry: '12/99',
        cvc: '12345',
      })
      expect(result.success).toBe(false)
    })
  })
})
