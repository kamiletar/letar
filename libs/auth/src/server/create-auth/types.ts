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
}

/** standalone — локальная авторизация (email/password + верификация) */
export interface StandaloneAuthProfile extends AuthProfileBase {
  mode: 'standalone'
  database: BetterAuthOptions['database']
  email: StandaloneEmailCallbacks
  rateLimit?: {
    customRules?: Record<string, { window: number; max: number }>
  }
}

/** hub-client — OIDC клиент Ключницы, без локального email/password */
export interface HubClientAuthProfile extends AuthProfileBase {
  mode: 'hub-client'
  /** Опционально: time не имеет локальной БД */
  database?: BetterAuthOptions['database']
  oidc: HubClientOidcConfig
}

/**
 * hub-provider — OIDC провайдер (Ключница).
 * Тип зафиксирован для типизации; реальная миграция auth-hub — Этап 8.
 */
export interface HubProviderAuthProfile extends AuthProfileBase {
  mode: 'hub-provider'
  database: BetterAuthOptions['database']
  email: StandaloneEmailCallbacks
  rateLimit?: {
    customRules?: Record<string, { window: number; max: number }>
  }
}

export type AuthProfile = StandaloneAuthProfile | HubClientAuthProfile | HubProviderAuthProfile
