import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthInstance } from '../session'

/**
 * Опции OIDC logout (RP-Initiated Logout).
 * Используется клиентскими приложениями, подключёнными к Ключнице через OIDC.
 */
export interface OidcLogoutOptions {
  /**
   * URL end_session_endpoint Ключницы.
   * Обычно: `${BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/endsession`
   */
  endSessionUrl: string
  /** OIDC client_id этого приложения (из env OIDC_CLIENT_ID) */
  clientId: string
  /**
   * URL для возврата от Ключницы после выхода.
   * Должен быть зарегистрирован в redirectUrls клиента на Ключнице.
   * Обычно: `${BETTER_AUTH_URL}/sign-in`
   */
  postLogoutRedirectUri: string
}

/**
 * Опции для createLogoutAction
 */
export interface LogoutActionOptions {
  /**
   * URL для редиректа после выхода (по умолчанию '/').
   * Игнорируется если задан oidcLogout — в этом случае редирект идёт на Ключницу.
   */
  redirectTo?: string
  /**
   * Настройки OIDC logout (RP-Initiated Logout).
   * Если задан — после signOut делает редирект на end_session_endpoint Ключницы,
   * которая в свою очередь чистит OIDC сессию и редиректит обратно на postLogoutRedirectUri.
   */
  oidcLogout?: OidcLogoutOptions
  /** Колбэк перед выходом (для логирования и т.д.) */
  onBeforeLogout?: () => Promise<void>
  /** Колбэк после выхода (до редиректа) */
  onAfterLogout?: () => Promise<void>
}

/**
 * Создаёт Server Action для выхода из системы.
 *
 * Поддерживает два режима:
 * 1. Простой выход — только локальная сессия, редирект на `redirectTo`
 * 2. OIDC выход — локальная сессия + сессия Ключницы (RP-Initiated Logout)
 *
 * @example
 * ```typescript
 * // apps/my-app/src/app/_actions/auth.actions.ts
 * 'use server'
 *
 * import { createLogoutAction } from '@letar/auth/server'
 * import { auth } from '@/lib/auth'
 *
 * // Простой выход (standalone Better Auth приложения)
 * export const logoutAction = createLogoutAction(auth)
 *
 * // OIDC выход (приложения с Ключницей через OIDC)
 * export const logoutAction = createLogoutAction(auth, {
 *   oidcLogout: {
 *     endSessionUrl: `${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/endsession`,
 *     clientId: process.env.OIDC_CLIENT_ID!,
 *     postLogoutRedirectUri: `${process.env.BETTER_AUTH_URL}/sign-in`,
 *   },
 * })
 * ```
 */
export function createLogoutAction(auth: AuthInstance, options: LogoutActionOptions = {}): () => Promise<never> {
  const { redirectTo = '/', oidcLogout, onBeforeLogout, onAfterLogout } = options

  return async function logoutAction(): Promise<never> {
    if (onBeforeLogout) {
      await onBeforeLogout()
    }

    try {
      await auth.api.signOut({
        headers: await headers(),
      })
    } catch (error) {
      console.error('[Logout] Error:', error)
    }

    if (onAfterLogout) {
      await onAfterLogout()
    }

    // OIDC logout: редиректим на end_session_endpoint Ключницы
    // Ключница очистит OIDC сессию и токены, затем вернёт на postLogoutRedirectUri
    if (oidcLogout) {
      const { endSessionUrl, clientId, postLogoutRedirectUri } = oidcLogout
      const params = new URLSearchParams({
        client_id: clientId,
        post_logout_redirect_uri: postLogoutRedirectUri,
      })
      redirect(`${endSessionUrl}?${params.toString()}`)
    }

    redirect(redirectTo)
  }
}
