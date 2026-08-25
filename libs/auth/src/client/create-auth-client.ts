'use client'

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

type BaseAuthClient = ReturnType<typeof createBetterAuthClient>

/** Параметры входа через генерик-OAuth провайдера (Yandex, Ключница, Shikimori и т.д.) */
export interface OAuth2SignInParams {
  providerId: string
  callbackURL?: string
  errorCallbackURL?: string
  newUserCallbackURL?: string
}

// Типизированный клиент с oauth2-совместимой сигнатурой поверх signIn.social
type BetterAuthClientWithOAuth = BaseAuthClient & {
  signIn: BaseAuthClient['signIn'] & {
    oauth2: (params: OAuth2SignInParams) => ReturnType<BaseAuthClient['signIn']['social']>
  }
}

/**
 * Создаёт клиент Better Auth с поддержкой генерик-OAuth провайдеров (кастомные провайдеры,
 * зарегистрированные через серверный `genericOAuth()` — Yandex, Ключница/`letar-auth` и т.д.)
 *
 * Better Auth 1.7+ убрал отдельный `genericOAuthClient()`/`signIn.oauth2` — такие провайдеры
 * теперь используют тот же `signIn.social()`, что и встроенные (см. доки `generic-oauth`).
 * `signIn.oauth2()` оставлен здесь тонким алиасом над `signIn.social()`, чтобы не переписывать
 * вызовы во всех потребителях (`createSignInWithLetarAuth` и прямые вызовы в приложениях).
 *
 * @example
 * ```typescript
 * export const authClient = createAuthClientWithOAuth()
 *
 * authClient.signIn.oauth2({ providerId: 'yandex' })
 * ```
 */
export function createAuthClientWithOAuth(options: AuthClientWithOAuthOptions = {}): BetterAuthClientWithOAuth {
  const { baseURL, plugins = [] } = options

  const client = createBetterAuthClient({
    baseURL: resolveClientBaseURL(baseURL),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
  })

  return {
    ...client,
    signIn: {
      ...client.signIn,
      oauth2: ({ providerId, ...rest }: OAuth2SignInParams) => client.signIn.social({ provider: providerId, ...rest }),
    },
  } as BetterAuthClientWithOAuth
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
