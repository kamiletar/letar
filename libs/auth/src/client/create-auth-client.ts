'use client'

import { genericOAuthClient } from 'better-auth/client/plugins'
import { createAuthClient as createBetterAuthClient } from 'better-auth/react'

/**
 * Резолвит baseURL клиента: явный параметр → `NEXT_PUBLIC_APP_URL` (build-time) →
 * `window.location.origin` (runtime).
 *
 * `NEXT_PUBLIC_*` инлайнится в бандл только на этапе `next build` — если приложение
 * собирается общим Docker-образом без передачи этой переменной как build ARG (обычная практика
 * в этом монорепо, см. `Dockerfile.production`), в бандле навсегда остаётся `undefined`, и клиент
 * бьёт мимо реального домена (staging/прод) из браузера пользователя, хотя серверный
 * `BETTER_AUTH_URL` настроен верно. Найдено на `dsperevod`/`svoichuzhie` (PLAN.md §18.7 batch2,
 * 2026-07-21) — `email-verification`/`10-auth` тесты падали именно по этой причине, сервер
 * при этом отвечал 200 на прямой curl. `window.location.origin` не зависит от build-time
 * переменных вообще и всегда указывает на реальный текущий домен.
 */
function resolveClientBaseURL(explicit?: string): string | undefined {
  if (explicit) {
    return explicit
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return typeof window !== 'undefined' ? window.location.origin : undefined
}

/**
 * Опции для создания auth клиента
 */
export interface AuthClientOptions {
  /** URL сервера авторизации (по умолчанию — см. {@link resolveClientBaseURL}) */
  baseURL?: string
  /** Дополнительные плагины Better Auth */
  plugins?: unknown[]
}

/**
 * Опции для создания auth клиента с genericOAuth
 */
export interface AuthClientWithOAuthOptions {
  /** URL сервера авторизации (по умолчанию — см. {@link resolveClientBaseURL}) */
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
    baseURL: resolveClientBaseURL(baseURL),
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
    baseURL: resolveClientBaseURL(baseURL),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
  })
}

/** Тип auth клиента с genericOAuth (для Yandex и др.) */
export type AuthClientWithOAuth = BetterAuthClientWithOAuth

/** Тип базового auth клиента */
export type AuthClient = ReturnType<typeof createAuthClient>
