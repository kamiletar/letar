// globals: true — describe, expect, it доступны глобально
import { ResetPasswordSchema } from '../reset-password.schema'

describe('ResetPasswordSchema', () => {
  const validData = {
    token: 'valid-token-123',
    password: 'SecurePass1!',
    confirmPassword: 'SecurePass1!',
  }

  describe('token', () => {
    it('принимает непустой токен', () => {
      const result = ResetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('отклоняет пустой токен', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        token: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Токен обязателен')
      }
    })
  })

  describe('password', () => {
    it('принимает пароль соответствующий требованиям', () => {
      const result = ResetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('отклоняет пароль короче 8 символов', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        password: 'Short1!',
        confirmPassword: 'Short1!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === 'Пароль должен содержать минимум 8 символов')).toBe(true)
      }
    })

    it('отклоняет пароль без строчных букв', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        password: 'UPPERCASE1!',
        confirmPassword: 'UPPERCASE1!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message === 'Пароль должен содержать хотя бы одну строчную букву')
        ).toBe(true)
      }
    })

    it('отклоняет пароль без заглавных букв', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        password: 'lowercase1!',
        confirmPassword: 'lowercase1!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message === 'Пароль должен содержать хотя бы одну заглавную букву')
        ).toBe(true)
      }
    })

    it('отклоняет пароль без цифр', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        password: 'NoDigits!!',
        confirmPassword: 'NoDigits!!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === 'Пароль должен содержать хотя бы одну цифру')).toBe(true)
      }
    })

    it('отклоняет пароль без спецсимволов', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        password: 'NoSpecial1',
        confirmPassword: 'NoSpecial1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === 'Пароль должен содержать хотя бы один спецсимвол')).toBe(
          true
        )
      }
    })
  })

  describe('confirmPassword', () => {
    it('принимает совпадающие пароли', () => {
      const result = ResetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('отклоняет несовпадающие пароли', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPass1!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === 'Пароли не совпадают')).toBe(true)
      }
    })
  })

  describe('strip()', () => {
    it('удаляет лишние поля', () => {
      const result = ResetPasswordSchema.safeParse({
        ...validData,
        extraField: 'should be removed',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect('extraField' in result.data).toBe(false)
      }
    })
  })
})
