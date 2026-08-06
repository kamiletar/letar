// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { z } from 'zod/v4'
import { passwordSchema, strongPasswordSchema, withPasswordConfirmation } from './password'

describe('passwordSchema', () => {
  it('принимает пароль с заглавной, строчной буквой и цифрой', () => {
    expect(passwordSchema.safeParse('Passw0rd').success).toBe(true)
  })

  it('отклоняет пароль короче 8 символов', () => {
    const result = passwordSchema.safeParse('Pas1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Пароль должен содержать минимум 8 символов')).toBe(
        true,
      )
    }
  })

  it('отклоняет пароль без заглавной буквы', () => {
    const result = passwordSchema.safeParse('password1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message === 'Пароль должен содержать хотя бы одну заглавную букву'),
      ).toBe(
        true,
      )
    }
  })

  it('отклоняет пароль без строчной буквы', () => {
    const result = passwordSchema.safeParse('PASSWORD1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message === 'Пароль должен содержать хотя бы одну строчную букву'),
      ).toBe(
        true,
      )
    }
  })

  it('отклоняет пароль без цифры', () => {
    const result = passwordSchema.safeParse('Password')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Пароль должен содержать хотя бы одну цифру')).toBe(
        true,
      )
    }
  })
})

describe('strongPasswordSchema', () => {
  it('принимает пароль со спецсимволом', () => {
    expect(strongPasswordSchema.safeParse('Passw0rd!').success).toBe(true)
  })

  it('отклоняет пароль без спецсимвола', () => {
    const result = strongPasswordSchema.safeParse('Passw0rd')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Пароль должен содержать хотя бы один спецсимвол'))
        .toBe(
          true,
        )
    }
  })

  it('преобразует undefined в пустую строку и отклоняет с сообщением "Введите пароль"', () => {
    const result = strongPasswordSchema.safeParse(undefined)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите пароль')
    }
  })

  it('преобразует null в пустую строку и отклоняет', () => {
    const result = strongPasswordSchema.safeParse(null)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите пароль')
    }
  })
})

describe('withPasswordConfirmation', () => {
  const baseSchema = z.object({
    password: z.string(),
    confirmPassword: z.string(),
  })

  it('пропускает совпадающие пароли', () => {
    const schema = withPasswordConfirmation(baseSchema)
    const result = schema.safeParse({ password: 'Passw0rd!', confirmPassword: 'Passw0rd!' })
    expect(result.success).toBe(true)
  })

  it('отклоняет несовпадающие пароли с сообщением на поле confirmPassword', () => {
    const schema = withPasswordConfirmation(baseSchema)
    const result = schema.safeParse({ password: 'Passw0rd!', confirmPassword: 'Other1!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Пароли не совпадают')
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])
    }
  })

  it('поддерживает кастомные имена полей', () => {
    const customSchema = z.object({
      newPassword: z.string(),
      newPasswordRepeat: z.string(),
    })
    const schema = withPasswordConfirmation(customSchema, 'newPassword', 'newPasswordRepeat')

    const mismatch = schema.safeParse({ newPassword: 'a', newPasswordRepeat: 'b' })
    expect(mismatch.success).toBe(false)
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(['newPasswordRepeat'])
    }

    const match = schema.safeParse({ newPassword: 'a', newPasswordRepeat: 'a' })
    expect(match.success).toBe(true)
  })
})
