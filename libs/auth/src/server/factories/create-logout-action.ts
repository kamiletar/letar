import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthInstance } from '../session'

/**
 * Опции для createLogoutAction
 */
export interface LogoutActionOptions {
  /** URL для редиректа после выхода (по умолчанию '/') */
  redirectTo?: string
  /** Колбэк перед выходом (для логирования и т.д.) */
  onBeforeLogout?: () => Promise<void>
  /** Колбэк после выхода (до редиректа) */
  onAfterLogout?: () => Promise<void>
}

/**
 * Создаёт Server Action для выхода из системы
 *
 * @example
 * ```typescript
 * // apps/my-app/src/app/_actions/auth.actions.ts
 * 'use server'
 *
 * import { createLogoutAction } from '@letar/auth/server'
 * import { auth } from '@/lib/auth'
 *
 * // Простой вариант
 * export const logoutAction = createLogoutAction(auth)
 *
 * // С опциями
 * export const logoutAction = createLogoutAction(auth, {
 *   redirectTo: '/goodbye',
 *   onBeforeLogout: async () => {
 *     // Логирование выхода
 *     console.log('User logging out...')
 *   },
 *   onAfterLogout: async () => {
 *     // Очистка кэша и т.д.
 *   }
 * })
 * ```
 */
export function createLogoutAction(auth: AuthInstance, options: LogoutActionOptions = {}): () => Promise<never> {
  const { redirectTo = '/', onBeforeLogout, onAfterLogout } = options

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

    redirect(redirectTo)
  }
}
