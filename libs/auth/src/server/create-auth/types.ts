import type { betterAuth } from 'better-auth'

type BetterAuthOptions = Parameters<typeof betterAuth>[0]

/** Результат отправки письма (совместим с @letar/email SendEmailResult) */
export interface SendEmailResult {
  success: boolean
  error?: string
}

/** Email-коллбэки для standalone режима — инжектируются приложением */
export interface StandaloneEmailCallbacks {
  sendVerificationEmail: (params: {
    to: string
    userName?: string
    verificationUrl: string
  }) => Promise<SendEmailResult>
  /** Опционально: если передан — включается emailAndPassword.sendResetPassword */
  sendPasswordResetEmail?: (params: { to: string; userName?: string; resetUrl: string }) => Promise<SendEmailResult>
  reportEmailFailure: (params: { type: string; to: string; error: string }) => void
}

/** OIDC конфигурация для hub-client режима */
export interface HubClientOidcConfig {
  clientId: string | undefined
  clientSecret: string | undefined
  /** По умолчанию https://auth.letar.best/api/auth/.well-known/openid-configuration */
  discoveryUrl?: string
}

/** Страницы авторизации приложения */
export interface AuthPages {
  signIn?: string
  signUp?: string
  error?: string
  resetPassword?: string
}

interface AuthProfileBase {
  baseURL: string
  trustedOrigins?: string[]
  /** Дополнительные поля пользователя (role, roles и т.д.) */
  user?: BetterAuthOptions['user']
  /** Переопределение стандартной конфигурации сессии */
  session?: Partial<NonNullable<BetterAuthOptions['session']>>
  /** Дополнительные плагины поверх стандартных для режима */
  plugins?: NonNullable<BetterAuthOptions['plugins']>
  pages?: AuthPages
  /**
   * Redis или другой secondaryStorage — для rate-limit и сессионного кэша.
   * Создаётся через createRedisStorage(url) из @letar/auth/server.
   */
  secondaryStorage?: BetterAuthOptions['secondaryStorage']
}

/** Источник OAuth-секретов для standalone-режима (Tier 2, Этап 8) */
export type StandaloneSocialSource =
  | { source: 'env'; providers: BetterAuthOptions['socialProviders'] }
  | { source: 'db'; load: () => Promise<Record<string, { clientId: string; clientSecret: string }> | null> }

/** standalone — локальная авторизация (email/password + верификация) */
export interface StandaloneAuthProfile extends AuthProfileBase {
  mode: 'standalone'
  database: BetterAuthOptions['database']
  email: StandaloneEmailCallbacks
  rateLimit?: {
    customRules?: Record<string, { window: number; max: number }>
  }
  /**
   * Источник OAuth-провайдеров (Tier 2, Этап 8).
   * source:'env' — ключи из process.env (текущие приложения используют socialProviders напрямую).
   * source:'db'  — ключи читаются из таблицы SocialProvider при старте через load().
   *
   * @deprecated socialProviders — используй social: { source: 'env', providers: ... }
   */
  social?: StandaloneSocialSource
  /** @deprecated используй social: { source: 'env', providers: ... } */
  socialProviders?: BetterAuthOptions['socialProviders']
  /** Хуки базы данных — для обогащения профиля из OAuth и пр. */
  databaseHooks?: BetterAuthOptions['databaseHooks']
  /** Переопределение алгоритма хеширования паролей (например bcrypt вместо scrypt) */
  password?: NonNullable<NonNullable<BetterAuthOptions['emailAndPassword']>['password']>
}

/** hub-client — OIDC клиент Ключницы, без локального email/password */
export interface HubClientAuthProfile extends AuthProfileBase {
  mode: 'hub-client'
  /** Опционально: time не имеет локальной БД */
  database?: BetterAuthOptions['database']
  oidc: HubClientOidcConfig
  /** Rate-limit — опционально; без этого поля rate-limit отключён в hub-client */
  rateLimit?: {
    storage?: 'memory' | 'database' | 'secondary-storage'
    customRules?: Record<string, { window: number; max: number }>
  }
  /** Привязка аккаунтов по email от доверенных провайдеров */
  account?: {
    accountLinking?: {
      enabled?: boolean
      trustedProviders?: string[]
    }
  }
}

/** Конфигурация встроенного OIDC провайдера (только для hub-provider) */
export interface OidcProviderConfig {
  loginPage?: string
  consentPage?: string
  requirePKCE?: boolean
  allowDynamicClientRegistration?: boolean
  accessTokenExpiresIn?: number
  refreshTokenExpiresIn?: number
  scopes?: string[]
}

/** hub-provider — OIDC провайдер (Ключница) */
export interface HubProviderAuthProfile extends AuthProfileBase {
  mode: 'hub-provider'
  database: BetterAuthOptions['database']
  email: StandaloneEmailCallbacks
  rateLimit?: {
    customRules?: Record<string, { window: number; max: number }>
  }
  socialProviders?: BetterAuthOptions['socialProviders']
  databaseHooks?: BetterAuthOptions['databaseHooks']
  password?: NonNullable<NonNullable<BetterAuthOptions['emailAndPassword']>['password']>
  /** Настройки встроенного OIDC провайдера */
  oidcProvider?: OidcProviderConfig
  /** Привязка аккаунтов по email от доверенных провайдеров */
  account?: {
    accountLinking?: {
      enabled?: boolean
      trustedProviders?: string[]
    }
  }
}

export type AuthProfile = StandaloneAuthProfile | HubClientAuthProfile | HubProviderAuthProfile
