// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { phoneSchema, requiredPhoneSchema } from './phone'

describe('phoneSchema', () => {
  it('принимает номер в формате +7XXXXXXXXXX', () => {
    const result = phoneSchema.safeParse('+79161234567')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('+79161234567')
    }
  })

  it('принимает номер с пробелами, скобками и дефисами и убирает их', () => {
    const result = phoneSchema.safeParse('8 (916) 123-45-67')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('89161234567')
    }
  })

  it('принимает номер без кода страны (10 цифр)', () => {
    const result = phoneSchema.safeParse('9161234567')
    expect(result.success).toBe(true)
  })

  it('разрешает пустую строку', () => {
    const result = phoneSchema.safeParse('')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('')
    }
  })

  it('отклоняет слишком короткий номер', () => {
    const result = phoneSchema.safeParse('123')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите корректный российский номер телефона')
    }
  })

  it('отклоняет номер с лишними цифрами', () => {
    const result = phoneSchema.safeParse('789161234567')
    expect(result.success).toBe(false)
  })
})

describe('requiredPhoneSchema', () => {
  it('принимает корректный номер', () => {
    const result = requiredPhoneSchema.safeParse('+79161234567')
    expect(result.success).toBe(true)
  })

  it('отклоняет пустую строку с сообщением "Введите номер телефона"', () => {
    const result = requiredPhoneSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите номер телефона')
    }
  })

  it('отклоняет некорректный номер', () => {
    const result = requiredPhoneSchema.safeParse('12345')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите корректный российский номер телефона')
    }
  })
})
