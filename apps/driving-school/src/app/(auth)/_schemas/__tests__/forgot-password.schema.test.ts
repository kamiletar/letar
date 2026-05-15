// globals: true — describe, expect, it доступны глобально
import { ForgotPasswordSchema } from '../forgot-password.schema'

describe('ForgotPasswordSchema', () => {
  describe('email', () => {
    it('принимает корректный email', () => {
      const result = ForgotPasswordSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('отклоняет некорректный email', () => {
      const result = ForgotPasswordSchema.safeParse({
        email: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Введите корректный email')
      }
    })

    it('отклоняет пустой email', () => {
      const result = ForgotPasswordSchema.safeParse({
        email: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('strip()', () => {
    it('удаляет лишние поля', () => {
      const result = ForgotPasswordSchema.safeParse({
        email: 'test@example.com',
        extraField: 'should be removed',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ email: 'test@example.com' })
        expect('extraField' in result.data).toBe(false)
      }
    })
  })
})
