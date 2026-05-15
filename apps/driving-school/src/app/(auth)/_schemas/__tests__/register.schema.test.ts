/**
 * Тесты для схемы регистрации
 * Актуальная схема без name/role (они вводятся при onboarding)
 */
// globals: true — describe, expect, it доступны глобально
import { RegisterSchema, RegisterServerSchema } from '../register.schema'

// Базовые валидные данные для тестов
const validData = {
  email: 'test@example.com',
  password: 'Password123!',
  acceptOffer: true,
  acceptPrivacy: true,
}

describe('RegisterSchema', () => {
  describe('email валидация', () => {
    it('должен принимать корректный email', () => {
      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('должен отклонять email без @', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        email: 'testexample.com',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять email без домена', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        email: 'test@',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пустой email', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        email: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('password валидация', () => {
    it('должен принимать пароль с 8+ символами, буквами, цифрами и спецсимволами', () => {
      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('должен отклонять пароль короче 8 символов', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        password: 'Pass1!',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пароль без заглавных букв', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        password: 'password123!',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пароль без строчных букв', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        password: 'PASSWORD123!',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пароль без цифр', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        password: 'Password!!!',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пароль без спецсимволов', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        password: 'Password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('acceptOffer валидация', () => {
    it('должен принимать acceptOffer=true', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        acceptOffer: true,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять acceptOffer=false', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        acceptOffer: false,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('acceptPrivacy валидация', () => {
    it('должен принимать acceptPrivacy=true', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        acceptPrivacy: true,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять acceptPrivacy=false', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        acceptPrivacy: false,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('strip()', () => {
    it('должен удалять неизвестные поля', () => {
      const result = RegisterSchema.safeParse({
        ...validData,
        extraField: 'should be removed',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('extraField')
      }
    })
  })
})

describe('RegisterServerSchema', () => {
  it('должен принимать валидные данные', () => {
    const result = RegisterServerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      acceptOffer: true,
      acceptPrivacy: true,
    })
    expect(result.success).toBe(true)
  })

  it('должен преобразовать строковые boolean значения (coerce)', () => {
    const result = RegisterServerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      acceptOffer: 'true',
      acceptPrivacy: 'true',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.acceptOffer).toBe(true)
      expect(result.data.acceptPrivacy).toBe(true)
    }
  })
})
