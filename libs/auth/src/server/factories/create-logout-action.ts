import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthInstance } from '../session'

/**
 * Путь end_session_endpoint у @better-auth/oauth-provider (1.7+, src/logout.ts,
 * createOAuthEndpoint("/oauth2/end-session", ...)) — С дефисом. Восемь приложений на 2026-08-27
 * годами звали `/oauth2/endsession` (без дефиса) — такого роута нет, 404 до проверки клиента
 * даже не доходило.
 */
export const OIDC_END_SESSION_PATH = '/oauth2/end-session'

/**
 * Опции OIDC logout (RP-Initiated Logout).
 * Используется клиентскими приложениями, подключёнными к Ключнице через OIDC.
 */
export interface OidcLogoutOptions {
  /**
   * Base URL Ключницы (issuer), например `process.env.BETTER_AUTH_OIDC_ISSUER`.
   * end_session_endpoint выводится из него автоматически: `${issuer}/api/auth${OIDC_END_SESSION_PATH}`.
   * Взаимоисключимо с `endSessionUrl`.
   */
  issuer?: string
  /**
   * @deprecated Задавай `issuer` вместо готового URL — раньше приложения собирали путь вручную
   * и расходились с плагином (`endsession` вместо `end-session`). Если задан — используется как есть.
   */
  endSessionUrl?: string
  /** OIDC client_id этого приложения (из env OIDC_CLIENT_ID) */
  clientId: string
  /**
   * URL для возврата от Ключницы после выхода.
   * Должен быть зарегистрирован в `postLogoutRedirectUris` клиента на Ключнице
   * (НЕ в `redirectUrls`/`redirectUris` — те применяются только к authorization-callback).
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
 *     issuer: process.env.BETTER_AUTH_OIDC_ISSUER!,
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
      const { issuer, endSessionUrl, clientId, postLogoutRedirectUri } = oidcLogout
      const resolvedEndSessionUrl = endSessionUrl ?? `${issuer}/api/auth${OIDC_END_SESSION_PATH}`
      const params = new URLSearchParams({
        client_id: clientId,
        post_logout_redirect_uri: postLogoutRedirectUri,
      })
      redirect(`${resolvedEndSessionUrl}?${params.toString()}`)
    }

    redirect(redirectTo)
  }
}
