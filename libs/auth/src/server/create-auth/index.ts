import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { oidcProvider as oidcProviderPlugin } from 'better-auth/plugins/oidc-provider'

import type { AuthProfile, HubClientAuthProfile, HubProviderAuthProfile, StandaloneAuthProfile } from './types'

/**
 * Разрешает socialProviders для standalone/hub-provider режима (Этап 8).
 * source:'env' → берёт providers из profile.social.providers или устаревшего profile.socialProviders.
 * source:'db'  → провайдеры уже загружены снаружи и переданы как готовая карта (async init в auth.ts).
 */
function resolveSocialProviders(profile: StandaloneAuthProfile | HubProviderAuthProfile): {
  socialProviders?: Parameters<typeof betterAuth>[0]['socialProviders']
} {
  if ('social' in profile && profile.social) {
    if (profile.social.source === 'env') {
      return profile.social.providers ? { socialProviders: profile.social.providers } : {}
    }
    // source:'db' — провайдеры переданы через _resolvedSocialProviders (установлены в createAuth)
    return (
        profile as StandaloneAuthProfile & {
          _resolvedSocialProviders?: Parameters<typeof betterAuth>[0]['socialProviders']
        }
      )._resolvedSocialProviders
      ? {
        socialProviders: (
          profile as StandaloneAuthProfile & {
            _resolvedSocialProviders?: Parameters<typeof betterAuth>[0]['socialProviders']
          }
        )._resolvedSocialProviders,
      }
      : {}
  }
  // legacy: socialProviders напрямую
  return profile.socialProviders ? { socialProviders: profile.socialProviders } : {}
}

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
    ...(profile.secondaryStorage && { secondaryStorage: profile.secondaryStorage }),
    baseURL: profile.baseURL,
    trustedOrigins: profile.trustedOrigins,

    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
      ...(profile.password && { password: profile.password }),
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
      // Redis → secondary-storage; prod без Redis → database; dev → memory
      storage: profile.secondaryStorage
        ? ('secondary-storage' as const)
        : process.env.NODE_ENV === 'production'
        ? ('database' as const)
        : ('memory' as const),
      modelName: 'rateLimit',
      customRules: {
        // Защита resend верификации (Этап 2 PLAN.md). App может переопределить.
        '/send-verification-email': { window: 60, max: 3 },
        ...rateLimit?.customRules,
      },
    },

    ...resolveSocialProviders(profile),
    ...(profile.databaseHooks && { databaseHooks: profile.databaseHooks }),

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
          // Fallback: если name пустое — используем email username
          mapProfileToUser: (profile: Record<string, unknown>) => ({
            name: (profile.name as string | undefined)
              || (profile.email as string | undefined)?.split('@')[0]
              || 'User',
            email: profile.email as string,
            image: (profile.picture ?? profile.image) as string | undefined,
          }),
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

function buildHubProviderAuth<TProfile extends HubProviderAuthProfile>(profile: TProfile) {
  const { email, rateLimit, oidcProvider: oidcConfig, account } = profile

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    database: profile.database,
    ...(profile.secondaryStorage && { secondaryStorage: profile.secondaryStorage }),
    baseURL: profile.baseURL,
    trustedOrigins: profile.trustedOrigins,

    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      // В dev окружении верификация не требуется для удобства разработки
      requireEmailVerification: process.env.NODE_ENV === 'production',
      ...(profile.password && { password: profile.password }),
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

    ...resolveSocialProviders(profile),
    ...(profile.databaseHooks && { databaseHooks: profile.databaseHooks }),

    user: profile.user,
    session: buildSessionConfig(profile.session),

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      // Redis → secondary-storage; prod без Redis → database; dev → memory
      storage: profile.secondaryStorage
        ? 'secondary-storage'
        : process.env.NODE_ENV === 'production'
        ? 'database'
        : 'memory',
      modelName: 'rateLimit',
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-in/*': { window: 60, max: 10 },
        '/sign-up/email': { window: 300, max: 3 },
        '/magic-link/*': { window: 300, max: 3 },
        '/forget-password': { window: 300, max: 3 },
        '/reset-password/*': { window: 60, max: 5 },
        '/verify-email': { window: 60, max: 10 },
        '/send-verification-email': { window: 60, max: 5 },
        '/oauth2/authorize': { window: 60, max: 30 },
        '/oauth2/token': { window: 60, max: 30 },
        ...rateLimit?.customRules,
      },
    },

    ...(account && { account }),

    // OIDC authorization codes хранятся в БД, а не в Redis secondaryStorage.
    // Без этого updateVerificationByIdentifier обновляет JSON под старым Redis-ключом
    // (verification:consentCode), а consumeVerificationValue ищет verification:authCode → null → invalid_grant.
    verification: {
      storeInDatabase: true,
    },

    pages: profile.pages,
    advanced: ADVANCED_IP_CONFIG,

    plugins: [
      oidcProviderPlugin({
        loginPage: oidcConfig?.loginPage ?? '/sign-in',
        consentPage: oidcConfig?.consentPage ?? '/oauth/consent',
        requirePKCE: oidcConfig?.requirePKCE ?? true,
        allowDynamicClientRegistration: oidcConfig?.allowDynamicClientRegistration ?? false,
        accessTokenExpiresIn: oidcConfig?.accessTokenExpiresIn ?? 3600,
        refreshTokenExpiresIn: oidcConfig?.refreshTokenExpiresIn ?? 604800,
        scopes: oidcConfig?.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
      }),
      ...(profile.plugins ?? []),
      // nextCookies() — ВСЕГДА последним (требование Better Auth)
      nextCookies(),
    ],
    // oidcProvider использует Zod внутри → тип непортабелен для .d.ts. Приводим к standalone-типу.
  }) as unknown as ReturnType<typeof buildStandaloneAuth<TProfile>>
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
): ReturnType<typeof buildHubProviderAuth<TProfile>>
export function createAuth<TProfile extends AuthProfile>(profile: TProfile) {
  switch (profile.mode) {
    case 'standalone':
      return buildStandaloneAuth(profile as StandaloneAuthProfile)
    case 'hub-client':
      return buildHubClientAuth(profile as HubClientAuthProfile)
    case 'hub-provider':
      return buildHubProviderAuth(profile as HubProviderAuthProfile)
  }
}

/**
 * Async-версия createAuth для standalone-режима с `social.source === 'db'`.
 *
 * Сначала вызывает `social.load()` для получения OAuth-провайдеров из БД,
 * затем передаёт их в фабрику. Использовать с `await` на уровне модуля (top-level await в Next.js).
 *
 * @example — aboi, social: { source: 'db', load: createSocialProviderLoader(prisma, ...) }
 * ```typescript
 * export const auth = await createAuthAsync({
 *   mode: 'standalone',
 *   social: { source: 'db', load: createSocialProviderLoader(prisma, decryptSecret, key) },
 *   ...
 * })
 * ```
 */
export async function createAuthAsync<TProfile extends StandaloneAuthProfile>(
  profile: TProfile,
): Promise<ReturnType<typeof buildStandaloneAuth<TProfile>>> {
  if (profile.social?.source === 'db') {
    const loaded = await profile.social.load()
    if (loaded) {
      // Конвертируем карту провайдеров в формат Better Auth
      const socialProviders = Object.fromEntries(Object.entries(loaded).map(([id, cfg]) => [id, cfg])) as Parameters<
        typeof betterAuth
      >[0]['socialProviders']
      const enriched = { ...profile, _resolvedSocialProviders: socialProviders }
      return buildStandaloneAuth(enriched as TProfile)
    }
  }
  return buildStandaloneAuth(profile)
}
