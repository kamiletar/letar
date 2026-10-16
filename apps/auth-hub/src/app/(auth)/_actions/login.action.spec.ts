import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signInEmail, signUpEmail, resolveLoginEmail } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  resolveLoginEmail: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', () => ({ auth: { api: { signInEmail, signUpEmail } } }))
vi.mock('@/lib/resolve-login-email', () => ({ resolveLoginEmail }))

import { loginUser } from './login.action'

describe('Вход с паролем', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resolveLoginEmail.mockResolvedValue({ email: 'primary@example.com', resolved: false })
  })

  it('не создаёт аккаунт при неверных данных: новый пользователь подтверждает почту по ссылке', async () => {
    signInEmail.mockRejectedValue({ body: { code: 'INVALID_EMAIL_OR_PASSWORD' } })

    const result = await loginUser({ email: 'new@example.com', password: 'example-password' })

    expect(signUpEmail).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: 'Не удалось войти. Проверьте почту и пароль или получите ссылку для входа.',
    })
  })

  it('сохраняет резолв связанной почты и OIDC-продолжение', async () => {
    signInEmail.mockResolvedValue({ token: 'session' })
    const callbackUrl = 'https://auth.example.com/api/auth/oauth2/authorize?state=original'

    expect(await loginUser({ email: 'linked@example.com', password: 'password', callbackUrl }))
      .toEqual({ success: true, redirectTo: callbackUrl })
    expect(signInEmail).toHaveBeenCalledWith(expect.objectContaining({
      body: { email: 'primary@example.com', password: 'password', callbackURL: callbackUrl },
    }))
  })

  it('не раскрывает внутреннюю ошибку пользователю', async () => {
    signInEmail.mockRejectedValue(new Error('database connection secret'))
    const result = await loginUser({ email: 'user@example.com', password: 'password' })
    expect(result.error).toBe('Не удалось войти. Попробуйте ещё раз позже.')
  })
})
