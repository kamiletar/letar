import { headers } from 'next/headers'

/**
 * Тип инстанса Better Auth с минимальным API
 */
export type AuthInstance = {
  api: {
    getSession: (opts: { headers: Headers }) => Promise<unknown>
    signOut: (opts: { headers: Headers }) => Promise<unknown>
  }
}

/**
 * Создаёт хелперы для работы с сессией на сервере
 *
 * @example
 * ```typescript
 * import { createSessionHelpers } from '@letar/auth/server'
 * import { auth, type SessionWithRole } from './auth'
 *
 * const { getSession, getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)
 *
 * // В Server Component или Server Action
 * const session = await getSession()
 * const user = await getCurrentUser()
 * ```
 */
export function createSessionHelpers<TSession, TUser = TSession extends { user: infer U } ? U : never>(
  auth: AuthInstance
) {
  /**
   * Получает сессию текущего пользователя
   * @returns Сессия или null если не авторизован
   */
  async function getSession(): Promise<TSession | null> {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })
    return session as TSession | null
  }

  /**
   * Получает текущего пользователя из сессии
   * @returns Пользователь или null если не авторизован
   */
  async function getCurrentUser(): Promise<TUser | null> {
    const session = await getSession()
    return (session as { user?: TUser } | null)?.user ?? null
  }

  return { getSession, getCurrentUser }
}
