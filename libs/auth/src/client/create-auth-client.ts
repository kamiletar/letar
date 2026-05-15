'use client'

import { genericOAuthClient } from 'better-auth/client/plugins'
import { createAuthClient as createBetterAuthClient } from 'better-auth/react'

/**
 * Опции для создания auth клиента
 */
export interface AuthClientOptions {
  /** URL сервера авторизации (по умолчанию NEXT_PUBLIC_APP_URL) */
  baseURL?: string
  /** Дополнительные плагины Better Auth */
  plugins?: unknown[]
}

/**
 * Опции для создания auth клиента с genericOAuth
 */
export interface AuthClientWithOAuthOptions {
  /** URL сервера авторизации (по умолчанию NEXT_PUBLIC_APP_URL) */
  baseURL?: string
  /** Дополнительные плагины Better Auth */
  plugins?: unknown[]
}

// Типизированный клиент с genericOAuth плагином
type GenericOAuthPlugin = ReturnType<typeof genericOAuthClient>
type BetterAuthClientWithOAuth = ReturnType<
  typeof createBetterAuthClient<{
    plugins: [GenericOAuthPlugin]
  }>
>

/**
 * Создаёт клиент Better Auth с поддержкой genericOAuth
 *
 * Используй эту функцию для приложений с кастомными OAuth провайдерами (Yandex и др.)
 *
 * @example
 * ```typescript
 * export const authClient = createAuthClientWithOAuth()
 *
 * // signIn.oauth2 доступен для кастомных провайдеров
 * authClient.signIn.oauth2({ providerId: 'yandex' })
 * ```
 */
export function createAuthClientWithOAuth(options: AuthClientWithOAuthOptions = {}): BetterAuthClientWithOAuth {
  const { baseURL, plugins = [] } = options

  return createBetterAuthClient({
    baseURL: baseURL ?? process.env.NEXT_PUBLIC_APP_URL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [genericOAuthClient(), ...plugins] as any,
  }) as BetterAuthClientWithOAuth
}

/**
 * Создаёт базовый клиент Better Auth без genericOAuth
 *
 * @example
 * ```typescript
 * export const authClient = createAuthClient()
 * ```
 */
export function createAuthClient(options: AuthClientOptions = {}): ReturnType<typeof createBetterAuthClient> {
  const { baseURL, plugins = [] } = options

  return createBetterAuthClient({
    baseURL: baseURL ?? process.env.NEXT_PUBLIC_APP_URL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
  })
}

/** Тип auth клиента с genericOAuth (для Yandex и др.) */
export type AuthClientWithOAuth = BetterAuthClientWithOAuth

/** Тип базового auth клиента */
export type AuthClient = ReturnType<typeof createAuthClient>
