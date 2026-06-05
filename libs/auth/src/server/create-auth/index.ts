import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'

import type { AuthProfile, HubClientAuthProfile, HubProviderAuthProfile, StandaloneAuthProfile } from './types'

const LETAR_AUTH_DISCOVERY_URL = 'https://auth.letar.best/api/auth/.well-known/openid-configuration'

// Стандартные IP-заголовки за reverse proxy — применяются во всех режимах
const ADVANCED_IP_CONFIG = {
  ipAddress: {
    ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'] as string[],
  },
} as const

type BetterAuthSessionConfig = Parameters<typeof betterAuth>[0]['session']

function buildSessionConfig(override?: Partial<NonNullable<BetterAuthSessionConfig>>) {
  return {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    ...override,
  }
}

// Дженерик по TProfile сохраняет конкретный тип user.additionalFields,
// что позволяет betterAuth вывести Session['user'] с кастомными полями (role и т.д.)
function buildStandaloneAuth<TProfile extends StandaloneAuthProfile | HubProviderAuthProfile>(profile: TProfile) {
  const { email, rateLimit } = profile

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    database: profile.database,
    baseURL: profile.baseURL,
    trustedOrigins: profile.trustedOrigins,

    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
      ...(email.sendPasswordResetEmail && {
        sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
          const result = await email.sendPasswordResetEmail!({
            to: user.email,
            userName: user.name ?? undefined,
            resetUrl: url,
          })
          if (!result.success) {
            email.reportEmailFailure({
              type: 'password-reset',
              to: user.email,
              error: result.error ?? 'unknown',
            })
          }
        },
      }),
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        const result = await email.sendVerificationEmail({
          to: user.email,
          userName: user.name ?? undefined,
          verificationUrl: url,
        })
        if (!result.success) {
          email.reportEmailFailure({
            type: 'verification',
            to: user.email,
            error: result.error ?? 'unknown',
          })
        }
      },
    },

    rateLimit: {
      enabled: true,
      customRules: {
        // Защита resend верификации (Этап 2 PLAN.md). App может переопределить.
        '/send-verification-email': { window: 60, max: 3 },
        ...rateLimit?.customRules,
      },
    },

    user: profile.user,
    session: buildSessionConfig(profile.session),
    plugins: [...(profile.plugins ?? []), nextCookies()],
    pages: profile.pages,
    advanced: ADVANCED_IP_CONFIG,
  })
}

function buildHubClientAuth<TProfile extends HubClientAuthProfile>(profile: TProfile) {
  const { oidc } = profile
  const discoveryUrl = oidc.discoveryUrl ?? LETAR_AUTH_DISCOVERY_URL

  const oidcPlugin = genericOAuth({
    config: oidc.clientId && oidc.clientSecret
      ? [
        {
          providerId: 'letar-auth',
          discoveryUrl,
          clientId: oidc.clientId,
          clientSecret: oidc.clientSecret,
          // offline_access — refresh_token для будущих API-вызовов к Ключнице (§13.7 PLAN.md)
          scopes: ['openid', 'profile', 'email', 'offline_access'],
          pkce: true,
        },
      ]
      : [],
  })

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    ...(profile.database && { database: profile.database }),
    ...(profile.secondaryStorage && { secondaryStorage: profile.secondaryStorage }),
    baseURL: profile.baseURL,
    trustedOrigins: profile.trustedOrigins,
    user: profile.user,
    session: buildSessionConfig(profile.session),
    plugins: [nextCookies(), oidcPlugin, ...(profile.plugins ?? [])],
    pages: profile.pages,
    advanced: ADVANCED_IP_CONFIG,
    ...(profile.rateLimit && {
      rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
        storage: profile.rateLimit.storage ?? 'memory',
        modelName: 'rateLimit',
        customRules: profile.rateLimit.customRules,
      },
    }),
    ...(profile.account && { account: profile.account }),
  })
}

/**
 * Фабрика авторизации Better Auth.
 *
 * Принимает `AuthProfile` и возвращает настроенный `betterAuth()` инстанс.
 * Приложение предоставляет DB-адаптер и модель ролей; фабрика собирает
 * режим-специфичные плагины и стандартные настройки.
 *
 * Дженерик-перегрузки сохраняют конкретный тип `user.additionalFields`,
 * что позволяет корректно вывести `typeof auth.$Infer.Session`.
 *
 * @example — standalone (dsperevod)
 * ```typescript
 * export const auth = createAuth({
 *   mode: 'standalone',
 *   database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
 *   baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3019',
 *   email: { sendVerificationEmail, sendPasswordResetEmail, reportEmailFailure },
 *   user: { additionalFields: { role: { type: 'string', defaultValue: 'USER' } } },
 * })
 * ```
 *
 * @example — hub-client (time, archetest)
 * ```typescript
 * export const auth = createAuth({
 *   mode: 'hub-client',
 *   baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3013',
 *   oidc: {
 *     clientId: process.env.OIDC_CLIENT_ID,
 *     clientSecret: process.env.OIDC_CLIENT_SECRET,
 *   },
 * })
 * ```
 */
export function createAuth<TProfile extends StandaloneAuthProfile>(
  profile: TProfile,
): ReturnType<typeof buildStandaloneAuth<TProfile>>
export function createAuth<TProfile extends HubClientAuthProfile>(
  profile: TProfile,
): ReturnType<typeof buildHubClientAuth<TProfile>>
export function createAuth<TProfile extends HubProviderAuthProfile>(
  profile: TProfile,
): ReturnType<typeof buildStandaloneAuth<TProfile>>
export function createAuth<TProfile extends AuthProfile>(profile: TProfile) {
  switch (profile.mode) {
    case 'standalone':
      return buildStandaloneAuth(profile as StandaloneAuthProfile)
    case 'hub-client':
      return buildHubClientAuth(profile as HubClientAuthProfile)
    case 'hub-provider':
      // Тип поддерживается; реальная миграция auth-hub на фабрику — Этап 8.
      return buildStandaloneAuth(profile as HubProviderAuthProfile)
  }
}
