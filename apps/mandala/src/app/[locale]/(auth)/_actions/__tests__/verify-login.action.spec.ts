// @vitest-environment node
import { createHmac } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDb } from '../../_adapters/__tests__/fake-prisma'
import { verifyAndLoginUser } from '../verify-login.action'

const { cookieSet, createSession } = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  createSession: vi.fn(async () => ({ token: 'session-token', expiresAt: new Date(Date.now() + 7 * 86_400_000) })),
}))

vi.mock('@/lib/db', async () => ({
  prisma: (await import('../../_adapters/__tests__/fake-prisma')).fakeDb.prisma,
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
  headers: async () => new Headers({ 'user-agent': 'vitest', 'x-forwarded-for': '1.2.3.4' }),
}))
// Контекст Better Auth, как в проде за https (BETTER_AUTH_URL): имя cookie с префиксом __Secure-
vi.mock('@/lib/auth', () => ({
  auth: {
    $context: Promise.resolve({
      secret: 'better-auth-secret',
      authCookies: {
        sessionToken: {
          name: '__Secure-better-auth.session_token',
          attributes: { secure: true, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 604_800 },
        },
      },
      internalAdapter: { createSession },
    }),
  },
}))

const EMAIL = 'buyer@example.com'

beforeEach(() => {
  fakeDb.reset()
  fakeDb.users.push({ id: 'u1', email: EMAIL, emailVerified: true })
})

describe('verifyAndLoginUser', () => {
  it('ставит cookie с именем, подписью и секретом из контекста Better Auth (не сырой токен)', async () => {
    fakeDb.addVerification({
      identifier: EMAIL,
      value: 'auto-login-token',
      pin: null, // токен уже прошёл PIN-верификацию (updateTokenForAutoLogin его обнулил)
      expiresInMs: 300_000,
    })

    const result = await verifyAndLoginUser(EMAIL, 'auto-login-token')

    expect(result).toEqual({ success: true })

    const signature = createHmac('sha256', 'better-auth-secret').update('session-token').digest('base64')
    expect(cookieSet).toHaveBeenCalledWith(
      '__Secure-better-auth.session_token',
      `session-token.${signature}`,
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'lax', path: '/' }),
    )
    expect(createSession).toHaveBeenCalledWith('u1', false, { ipAddress: '1.2.3.4', userAgent: 'vitest' })
  })

  it('токен одноразовый — удаляется сразу после входа', async () => {
    fakeDb.addVerification({ identifier: EMAIL, value: 'auto-login-token', pin: null, expiresInMs: 300_000 })

    await verifyAndLoginUser(EMAIL, 'auto-login-token')

    expect(fakeDb.verifications.some((r) => r.value === 'auto-login-token')).toBe(false)
  })

  it('отклоняет токен, ещё не прошедший PIN-верификацию (pin не обнулён) — не даёт обойти PIN', async () => {
    fakeDb.addVerification({
      identifier: EMAIL,
      value: 'pre-pin-token',
      pin: '123456',
      pinExpires: new Date(Date.now() + 600_000),
      expiresInMs: 86_400_000,
    })

    const result = await verifyAndLoginUser(EMAIL, 'pre-pin-token')

    expect(result.success).toBe(false)
    expect(createSession).not.toHaveBeenCalled()
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('отклоняет токен другого email', async () => {
    fakeDb.addVerification({
      identifier: 'other@example.com',
      value: 'auto-login-token',
      pin: null,
      expiresInMs: 300_000,
    })

    const result = await verifyAndLoginUser(EMAIL, 'auto-login-token')

    expect(result.success).toBe(false)
    expect(createSession).not.toHaveBeenCalled()
  })

  it('отклоняет истёкший токен', async () => {
    fakeDb.addVerification({ identifier: EMAIL, value: 'expired-token', pin: null, expiresInMs: -1000 })

    const result = await verifyAndLoginUser(EMAIL, 'expired-token')

    expect(result.success).toBe(false)
    expect(createSession).not.toHaveBeenCalled()
  })
})
