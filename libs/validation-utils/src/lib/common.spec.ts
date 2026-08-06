// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { emailSchema, nameSchema, requiredCheckbox, tokenSchema } from './common'

describe('emailSchema', () => {
  it('принимает корректный email', () => {
    const result = emailSchema.safeParse('test@example.com')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('test@example.com')
    }
  })

  it('отклоняет пустую строку с сообщением про обязательность', () => {
    const result = emailSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите адрес электронной почты')
    }
  })

  it('преобразует undefined в пустую строку и отклоняет', () => {
    const result = emailSchema.safeParse(undefined)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите адрес электронной почты')
    }
  })

  it('преобразует null в пустую строку и отклоняет', () => {
    const result = emailSchema.safeParse(null)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите адрес электронной почты')
    }
  })

  it('отклоняет некорректный формат email', () => {
    const result = emailSchema.safeParse('not-an-email')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите корректный email')
    }
  })
})

describe('nameSchema', () => {
  it('принимает имя из 2 и более символов', () => {
    expect(nameSchema.safeParse('Ян').success).toBe(true)
  })

  it('отклоняет имя из одного символа', () => {
    const result = nameSchema.safeParse('А')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Имя должно содержать минимум 2 символа')
    }
  })

  it('отклоняет пустую строку', () => {
    expect(nameSchema.safeParse('').success).toBe(false)
  })
})

describe('tokenSchema', () => {
  it('принимает непустой токен', () => {
    expect(tokenSchema.safeParse('abc123').success).toBe(true)
  })

  it('отклоняет пустую строку с сообщением "Токен обязателен"', () => {
    const result = tokenSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Токен обязателен')
    }
  })
})

describe('requiredCheckbox', () => {
  const schema = requiredCheckbox('Нужно принять условия')

  it('принимает true', () => {
    const result = schema.safeParse(true)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(true)
    }
  })

  it('принимает строку "on" (нативный чекбокс формы)', () => {
    const result = schema.safeParse('on')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(true)
    }
  })

  it('отклоняет false с переданным сообщением об ошибке', () => {
    const result = schema.safeParse(false)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Нужно принять условия')
    }
  })

  it('отклоняет undefined (по умолчанию false)', () => {
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Нужно принять условия')
    }
  })

  it('отклоняет произвольную строку, отличную от "on"', () => {
    const result = schema.safeParse('off')
    expect(result.success).toBe(false)
  })
})
