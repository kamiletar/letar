// globals: true — describe, expect, it доступны глобально
import { LoginSchema } from '../login.schema'

describe('LoginSchema', () => {
  describe('email валидация', () => {
    it('должен принимать корректный email', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять email без @', () => {
      const result = LoginSchema.safeParse({
        email: 'testexample.com',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять email без домена', () => {
      const result = LoginSchema.safeParse({
        email: 'test@',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять пустой email', () => {
      const result = LoginSchema.safeParse({
        email: '',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('password валидация', () => {
    it('должен принимать непустой пароль', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять пустой пароль', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })

    it('должен принимать пароль любой длины (проверка на сервере)', () => {
      // При входе мы не проверяем сложность пароля - это проверяется при регистрации
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: '123',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('полная форма', () => {
    it('должен принимать валидную форму входа', () => {
      const result = LoginSchema.safeParse({
        email: 'user@test.ru',
        password: 'mySecretPassword123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@test.ru')
        expect(result.data.password).toBe('mySecretPassword123')
      }
    })

    it('должен отклонять форму без email', () => {
      const result = LoginSchema.safeParse({
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять форму без пароля', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(false)
    })

    it('должен удалять лишние поля (.strip())', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        extraField: 'should be removed',
        anotherField: 123,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('extraField')
        expect(result.data).not.toHaveProperty('anotherField')
      }
    })
  })
})
