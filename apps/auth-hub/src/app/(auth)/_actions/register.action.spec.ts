import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signUpEmail } = vi.hoisted(() => ({ signUpEmail: vi.fn() }))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('@/lib/auth', () => ({
  auth: { api: { signUpEmail } },
}))

import { registerUser } from './register.action'

describe('registerUser', () => {
  beforeEach(() => {
    signUpEmail.mockReset()
  })

  it('успешная регистрация возвращает email', async () => {
    signUpEmail.mockResolvedValue({ token: 'session-token' })

    const result = await registerUser({ email: 'new@example.com', password: 'Aa123456' })

    expect(result).toEqual({ success: true, email: 'new@example.com' })
  })

  it('подставляет имя из email, если name не передан', async () => {
    signUpEmail.mockResolvedValue({ token: 'session-token' })

    await registerUser({ email: 'someone@example.com', password: 'Aa123456' })

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ name: 'someone' }) }),
    )
  })

  it.each([
    ['USER_ALREADY_EXISTS', 'Пользователь с таким email уже существует'],
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'Пользователь с таким email уже существует'],
    ['PASSWORD_TOO_SHORT', 'Пароль слишком короткий (минимум 8 символов)'],
    ['PASSWORD_TOO_LONG', 'Пароль слишком короткий (минимум 8 символов)'],
  ])('разбирает body.code=%s в понятное сообщение, не по тексту message', async (code, expectedError) => {
    signUpEmail.mockRejectedValue({ body: { code, message: 'какой-то текст better-auth, который может измениться' } })

    const result = await registerUser({ email: 'dup@example.com', password: 'Aa123456' })

    expect(result).toEqual({ success: false, error: expectedError })
  })

  it('неизвестный код ошибки → общее сообщение, не текст better-auth', async () => {
    signUpEmail.mockRejectedValue({ body: { code: 'SOME_UNKNOWN_CODE', message: 'internal detail' } })

    const result = await registerUser({ email: 'x@example.com', password: 'Aa123456' })

    expect(result).toEqual({ success: false, error: 'Ошибка регистрации. Попробуйте позже.' })
  })
})
