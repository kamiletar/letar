'use client'

import type { AuthClientWithOAuth } from '../create-auth-client'

/**
 * Опции для {@link createSignInWithLetarAuth}
 */
export interface CreateSignInWithLetarAuthOptions {
  /** providerId генерик-OAuth провайдера на стороне Ключницы. По умолчанию `'letar-auth'` */
  providerId?: string
  /**
   * Callback URL по умолчанию, если явный не передан в саму функцию входа.
   * Строка — фиксированный путь. Функция — вычисляется при каждом вызове (например `() => pathname`).
   * Если не задано — берётся текущий путь+query страницы (`window.location.pathname + search`),
   * чтобы после логина пользователь вернулся туда, откуда кликнул «Войти».
   */
  defaultCallbackURL?: string | (() => string)
  /** Вызывается с человекопонятным сообщением при ошибке входа — например для показа toast */
  onError?: (message: string) => void
}

function resolveDefaultCallbackURL(defaultCallbackURL?: string | (() => string)): string {
  if (typeof defaultCallbackURL === 'function') {
    return defaultCallbackURL()
  }
  if (defaultCallbackURL) {
    return defaultCallbackURL
  }
  return typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
}

/**
 * Человекопонятное сообщение об ошибке входа через Ключницу
 */
export function getLetarAuthErrorMessage(status?: number): string {
  switch (status) {
    case 429:
      return 'Слишком много попыток входа. Подождите немного и попробуйте снова'
    case 500:
    case 502:
    case 503:
      return 'Сервер авторизации временно недоступен. Попробуйте позже'
    default:
      return 'Не удалось войти. Попробуйте позже'
  }
}

/**
 * Создаёт функцию входа через Ключницу (auth.letar.best) с общей обработкой ошибок.
 *
 * @example
 * ```typescript
 * // apps/my-app/src/lib/auth-client.ts
 * export const authClient = createAuthClientWithOAuth()
 *
 * export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, {
 *   onError: (message) => toaster.create({ type: 'error', title: message }),
 * })
 *
 * // apps/my-app/src/app/sign-in/page.tsx
 * const errorMessage = await signInWithLetarAuth() // callbackURL — текущая страница
 * const errorMessage = await signInWithLetarAuth('/admin') // явный callbackURL
 * ```
 */
export function createSignInWithLetarAuth(
  authClient: AuthClientWithOAuth,
  options: CreateSignInWithLetarAuthOptions = {},
) {
  const { providerId = 'letar-auth', defaultCallbackURL, onError } = options

  return async function signInWithLetarAuth(callbackURL?: string): Promise<string | null> {
    const target = callbackURL ?? resolveDefaultCallbackURL(defaultCallbackURL)

    try {
      const result = await authClient.signIn.oauth2({ providerId, callbackURL: target })

      if (result?.error) {
        const message = getLetarAuthErrorMessage(result.error.status)
        onError?.(message)
        return message
      }

      // При успехе произойдёт redirect — сюда не дойдём
      return null
    } catch {
      const message = 'Не удалось подключиться к серверу авторизации. Попробуйте позже'
      onError?.(message)
      return message
    }
  }
}
