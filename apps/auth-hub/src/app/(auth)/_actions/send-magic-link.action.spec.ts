import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signInMagicLink, resolveLoginEmail } = vi.hoisted(() => ({
  signInMagicLink: vi.fn(),
  resolveLoginEmail: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', () => ({ auth: { api: { signInMagicLink } } }))
vi.mock('@/lib/resolve-login-email', () => ({ resolveLoginEmail }))

import { sendMagicLinkAction } from './send-magic-link.action'

describe('Ссылка для единого входа', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resolveLoginEmail.mockResolvedValue({ email: 'primary@example.com' })
  })

  it('показывает сбой отправки вместо ложного «письмо отправлено»', async () => {
    signInMagicLink.mockRejectedValue(new Error('SMTP unavailable'))
    expect(await sendMagicLinkAction('user@example.com')).toEqual({
      success: false,
      error: 'Не удалось отправить письмо. Попробуйте ещё раз позже или войдите другим способом.',
    })
  })

  it('отправляет на основной адрес и сохраняет продолжение для нового и существующего аккаунта', async () => {
    signInMagicLink.mockResolvedValue({ status: true })
    const callbackUrl = 'https://auth.example.com/api/auth/oauth2/authorize?state=original'
    expect(await sendMagicLinkAction('linked@example.com', callbackUrl)).toEqual({ success: true })
    expect(signInMagicLink).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        email: 'primary@example.com',
        callbackURL: callbackUrl,
        newUserCallbackURL: callbackUrl,
      }),
    }))
  })
})
