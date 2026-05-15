import { describe, expect, it } from 'vitest'
import { RegisterSchema, SignInSchema } from '../email-auth.schema'
import { ProfileEditSchema } from '../profile.schema'
import { ResultCreateSchema } from '../result.schema'

// =============================================================================
// Email Auth Schemas
// =============================================================================

describe('SignInSchema', () => {
  it('принимает валидные данные', () => {
    const result = SignInSchema.safeParse({
      email: 'test@mail.ru',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет невалидный email', () => {
    const result = SignInSchema.safeParse({
      email: 'invalid',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет пустой пароль', () => {
    const result = SignInSchema.safeParse({
      email: 'test@mail.ru',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('RegisterSchema', () => {
  // passwordSchema требует: мин 8 символов, заглавная, строчная, цифра
  const validPassword = 'Password1'

  it('принимает валидные данные', () => {
    const result = RegisterSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
      password: validPassword,
      confirmPassword: validPassword,
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет короткое имя', () => {
    const result = RegisterSchema.safeParse({
      name: 'И',
      email: 'ivan@mail.ru',
      password: validPassword,
      confirmPassword: validPassword,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет несовпадающие пароли', () => {
    const result = RegisterSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
      password: validPassword,
      confirmPassword: 'Other1234',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет слабый пароль (без заглавной)', () => {
    const result = RegisterSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
      password: 'password1',
      confirmPassword: 'password1',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный email', () => {
    const result = RegisterSchema.safeParse({
      name: 'Иван',
      email: 'not-email',
      password: validPassword,
      confirmPassword: validPassword,
    })
    expect(result.success).toBe(false)
  })

  it('удаляет confirmPassword из результата', () => {
    const result = RegisterSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
      password: validPassword,
      confirmPassword: validPassword,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('confirmPassword')
      expect(result.data).toHaveProperty('password')
    }
  })
})

// =============================================================================
// Profile Schema
// =============================================================================

describe('ProfileEditSchema', () => {
  it('принимает валидные данные', () => {
    const result = ProfileEditSchema.safeParse({
      name: 'Иван Петров',
    })
    expect(result.success).toBe(true)
  })

  it('принимает телефон в корректном формате', () => {
    const result = ProfileEditSchema.safeParse({
      name: 'Иван',
      phoneNumber: '+7 999 123-45-67',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет некорректный телефон', () => {
    const result = ProfileEditSchema.safeParse({
      name: 'Иван',
      phoneNumber: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет имя короче 2 символов', () => {
    const result = ProfileEditSchema.safeParse({
      name: 'И',
    })
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// Result Schema
// =============================================================================

describe('ResultCreateSchema', () => {
  it('принимает валидные данные', () => {
    const result = ResultCreateSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 'energy',
      metric: 'Уровень корневой чакры',
      value: 7,
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет value за пределами 1-10', () => {
    const r1 = ResultCreateSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 'energy',
      metric: 'Уровень',
      value: 0,
    })
    expect(r1.success).toBe(false)

    const r2 = ResultCreateSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 'energy',
      metric: 'Уровень',
      value: 11,
    })
    expect(r2.success).toBe(false)
  })

  it('отклоняет невалидный level', () => {
    const result = ResultCreateSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 'invalid',
      metric: 'Уровень',
      value: 5,
    })
    expect(result.success).toBe(false)
  })

  it('принимает опциональные поля', () => {
    const result = ResultCreateSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 'body',
      metric: 'Уровень зажимов',
      value: 3,
      description: 'Улучшение',
      notes: 'Заметки',
    })
    expect(result.success).toBe(true)
  })
})
