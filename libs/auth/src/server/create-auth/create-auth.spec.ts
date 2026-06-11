import { describe, expect, it, vi } from 'vitest'
import { createAuth } from './index'

// better-auth создаёт HTTP-сервер — мокируем модуль целиком
vi.mock('better-auth', () => ({
  betterAuth: vi.fn((config: unknown) => ({ _config: config, api: {} })),
}))
vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(() => ({ id: 'nextCookies' })),
}))
vi.mock('better-auth/plugins', () => ({
  genericOAuth: vi.fn((cfg: object) => ({ id: 'genericOAuth', ...cfg })),
}))
vi.mock('better-auth/plugins/oidc-provider', () => ({
  oidcProvider: vi.fn((cfg: object) => ({ id: 'oidcProvider', ...cfg })),
}))

const makeEmailCallbacks = () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  reportEmailFailure: vi.fn(),
})

describe('createAuth', () => {
  describe('standalone режим', () => {
    it('возвращает инстанс betterAuth', () => {
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
      })
      expect(auth).toBeDefined()
    })

    it('включает emailAndPassword и emailVerification', () => {
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(cfg.emailAndPassword).toMatchObject({ enabled: true, requireEmailVerification: true })
      expect(cfg.emailVerification).toMatchObject({ sendOnSignUp: true, autoSignInAfterVerification: true })
    })

    it('включает rate-limit для /send-verification-email по умолчанию', () => {
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const rl = cfg.rateLimit as { customRules: Record<string, unknown> }
      expect(rl.customRules['/send-verification-email']).toEqual({ window: 60, max: 3 })
    })

    it('app-правила rateLimit перекрывают дефолтные', () => {
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
        rateLimit: { customRules: { '/send-verification-email': { window: 300, max: 1 } } },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const rl = cfg.rateLimit as { customRules: Record<string, unknown> }
      expect(rl.customRules['/send-verification-email']).toEqual({ window: 300, max: 1 })
    })

    it('sendResetPassword включается только если передан sendPasswordResetEmail', () => {
      const withReset = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
      })
      const cfgWith = (withReset as unknown as { _config: Record<string, unknown> })._config
      expect((cfgWith.emailAndPassword as { sendResetPassword?: unknown }).sendResetPassword).toBeDefined()

      const withoutReset = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: { sendVerificationEmail: vi.fn(), reportEmailFailure: vi.fn() },
      })
      const cfgWithout = (withoutReset as unknown as { _config: Record<string, unknown> })._config
      expect((cfgWithout.emailAndPassword as { sendResetPassword?: unknown }).sendResetPassword).toBeUndefined()
    })

    it('email коллбэки — reportEmailFailure вызывается при ошибке верификации', async () => {
      const email = {
        sendVerificationEmail: vi.fn().mockResolvedValue({ success: false, error: 'SMTP timeout' }),
        reportEmailFailure: vi.fn(),
      }
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email,
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const ev = cfg.emailVerification as { sendVerificationEmail: (...args: unknown[]) => Promise<void> }
      await ev.sendVerificationEmail({ user: { email: 'test@example.com', name: 'Test' }, url: 'https://x/verify' })
      expect(email.reportEmailFailure).toHaveBeenCalledWith({
        type: 'verification',
        to: 'test@example.com',
        error: 'SMTP timeout',
      })
    })

    it('email коллбэки — reportEmailFailure НЕ вызывается при успехе', async () => {
      const email = makeEmailCallbacks()
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email,
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const ev = cfg.emailVerification as { sendVerificationEmail: (...args: unknown[]) => Promise<void> }
      await ev.sendVerificationEmail({ user: { email: 'ok@example.com', name: null }, url: 'https://x/verify' })
      expect(email.reportEmailFailure).not.toHaveBeenCalled()
    })

    it('содержит advanced IP-конфиг', () => {
      const auth = createAuth({
        mode: 'standalone',
        database: {} as never,
        baseURL: 'http://localhost:3019',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(cfg.advanced).toMatchObject({
        ipAddress: { ipAddressHeaders: expect.arrayContaining(['x-forwarded-for', 'x-real-ip']) },
      })
    })
  })

  describe('hub-client режим', () => {
    it('возвращает инстанс betterAuth без emailAndPassword', () => {
      const auth = createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: 'abc', clientSecret: 'secret' },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(auth).toBeDefined()
      expect(cfg.emailAndPassword).toBeUndefined()
      expect(cfg.emailVerification).toBeUndefined()
    })

    it('работает без database (как time)', () => {
      const auth = createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: 'x', clientSecret: 'y' },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(cfg.database).toBeUndefined()
    })

    it('передаёт database если задана (как archetest)', () => {
      const fakeDb = { provider: 'test' }
      const auth = createAuth({
        mode: 'hub-client',
        database: fakeDb as never,
        baseURL: 'http://localhost:3012',
        oidc: { clientId: 'x', clientSecret: 'y' },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(cfg.database).toBe(fakeDb)
    })

    it('genericOAuth не добавляется при отсутствии OIDC credentials', async () => {
      const { genericOAuth } = vi.mocked(await import('better-auth/plugins'))
      vi.clearAllMocks()
      createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: undefined, clientSecret: undefined },
      })
      const callArg = genericOAuth.mock.calls[0]?.[0] as { config: unknown[] } | undefined
      expect(callArg?.config).toEqual([])
    })

    it('использует дефолтный discoveryUrl Ключницы', async () => {
      const { genericOAuth } = vi.mocked(await import('better-auth/plugins'))
      vi.clearAllMocks()
      createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: 'abc', clientSecret: 'secret' },
      })
      const callArg = genericOAuth.mock.calls[0]?.[0] as { config: Array<{ discoveryUrl: string }> }
      expect(callArg.config[0].discoveryUrl).toContain('auth.letar.best')
    })

    it('принимает кастомный discoveryUrl', async () => {
      const { genericOAuth } = vi.mocked(await import('better-auth/plugins'))
      vi.clearAllMocks()
      createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: {
          clientId: 'abc',
          clientSecret: 'secret',
          discoveryUrl: 'https://custom.auth/openid-configuration',
        },
      })
      const callArg = genericOAuth.mock.calls[0]?.[0] as { config: Array<{ discoveryUrl: string }> }
      expect(callArg.config[0].discoveryUrl).toBe('https://custom.auth/openid-configuration')
    })
  })

  describe('hub-provider режим', () => {
    it('возвращает инстанс betterAuth с oidcProvider плагином', async () => {
      const { oidcProvider } = vi.mocked(await import('better-auth/plugins/oidc-provider'))
      vi.clearAllMocks()
      const auth = createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
      })
      expect(auth).toBeDefined()
      expect(oidcProvider).toHaveBeenCalledOnce()
    })

    it('использует дефолтные значения OIDC провайдера', async () => {
      const { oidcProvider } = vi.mocked(await import('better-auth/plugins/oidc-provider'))
      vi.clearAllMocks()
      createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
      })
      const callArg = oidcProvider.mock.calls[0]?.[0] as Record<string, unknown>
      expect(callArg.loginPage).toBe('/sign-in')
      expect(callArg.consentPage).toBe('/oauth/consent')
      expect(callArg.requirePKCE).toBe(true)
      expect(callArg.allowDynamicClientRegistration).toBe(false)
    })

    it('принимает кастомные настройки oidcProvider', async () => {
      const { oidcProvider } = vi.mocked(await import('better-auth/plugins/oidc-provider'))
      vi.clearAllMocks()
      createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
        oidcProvider: {
          loginPage: '/auth/login',
          accessTokenExpiresIn: 7200,
          requirePKCE: false,
        },
      })
      const callArg = oidcProvider.mock.calls[0]?.[0] as Record<string, unknown>
      expect(callArg.loginPage).toBe('/auth/login')
      expect(callArg.accessTokenExpiresIn).toBe(7200)
      expect(callArg.requirePKCE).toBe(false)
    })

    it('включает emailAndPassword с requireEmailVerification зависящим от NODE_ENV', () => {
      const auth = createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      // В тестах NODE_ENV=test → не production → false
      expect((cfg.emailAndPassword as { requireEmailVerification: boolean }).requireEmailVerification).toBe(false)
    })

    it('включает расширенные правила rate-limit для OIDC эндпоинтов', () => {
      const auth = createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const rl = cfg.rateLimit as { customRules: Record<string, unknown> }
      expect(rl.customRules['/oauth2/authorize']).toEqual({ window: 60, max: 30 })
      expect(rl.customRules['/oauth2/token']).toEqual({ window: 60, max: 30 })
      expect(rl.customRules['/sign-in/email']).toEqual({ window: 60, max: 5 })
    })

    it('передаёт account.accountLinking если задано', () => {
      const auth = createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
        account: {
          accountLinking: { enabled: true, trustedProviders: ['google', 'vk'] },
        },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      expect(cfg.account).toMatchObject({
        accountLinking: { enabled: true, trustedProviders: ['google', 'vk'] },
      })
    })

    it('nextCookies последний в массиве plugins', async () => {
      const { nextCookies } = vi.mocked(await import('better-auth/next-js'))
      const auth = createAuth({
        mode: 'hub-provider',
        database: {} as never,
        baseURL: 'http://localhost:3014',
        email: makeEmailCallbacks(),
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const plugins = cfg.plugins as Array<{ id: string }>
      const lastPlugin = plugins[plugins.length - 1]
      expect(nextCookies).toHaveBeenCalled()
      expect(lastPlugin.id).toBe('nextCookies')
    })
  })

  describe('стандартные настройки', () => {
    it('сессия: 7 дней по умолчанию', () => {
      const auth = createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: 'x', clientSecret: 'y' },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const session = cfg.session as { expiresIn: number }
      expect(session.expiresIn).toBe(60 * 60 * 24 * 7)
    })

    it('session переопределяется через profile.session', () => {
      const auth = createAuth({
        mode: 'hub-client',
        baseURL: 'http://localhost:3013',
        oidc: { clientId: 'x', clientSecret: 'y' },
        session: { expiresIn: 3600 },
      })
      const cfg = (auth as unknown as { _config: Record<string, unknown> })._config
      const session = cfg.session as { expiresIn: number }
      expect(session.expiresIn).toBe(3600)
    })
  })
})
