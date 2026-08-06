import { redirect } from 'next/navigation'

/**
 * Опции для guard функций
 */
export interface GuardOptions {
  /** URL для редиректа при ошибке авторизации */
  redirectTo?: string
  /** Выбросить ошибку вместо редиректа (для API routes) */
  throwOnError?: boolean
}

/**
 * Ошибка авторизации
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Создаёт guard функции для защиты серверных компонентов и actions
 *
 * @example
 * ```typescript
 * import { createAuthGuards } from '@letar/auth/server'
 *
 * const { getSession, getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)
 * const { requireAuth, requireRole } = createAuthGuards(
 *   getSession,
 *   (session) => session.user
 * )
 *
 * // В Server Component
 * export default async function AdminPage() {
 *   const { user } = await requireRole('ADMIN')
 *   return <div>Welcome, {user.name}</div>
 * }
 *
 * // В Server Action (с throw)
 * export async function adminAction() {
 *   const { user } = await requireRole('ADMIN', { throwOnError: true })
 *   // ...
 * }
 * ```
 */
export function createAuthGuards<TSession, TUser extends { role: string }>(
  getSession: () => Promise<TSession | null>,
  getUserFromSession: (session: TSession) => TUser,
) {
  /**
   * Требует авторизованного пользователя
   * @throws AuthError если throwOnError: true
   * @redirects если не авторизован
   */
  async function requireAuth(options: GuardOptions = {}): Promise<{ session: TSession; user: TUser }> {
    const { redirectTo = '/auth/signin', throwOnError = false } = options

    const session = await getSession()
    if (!session) {
      if (throwOnError) {
        throw new AuthError('Unauthorized', 'UNAUTHORIZED')
      }
      redirect(redirectTo)
    }

    return { session, user: getUserFromSession(session) }
  }

  /**
   * Требует определённую роль пользователя
   * @throws AuthError если throwOnError: true
   * @redirects если нет доступа
   */
  async function requireRole(
    roles: string | string[],
    options: GuardOptions = {},
  ): Promise<{ session: TSession; user: TUser }> {
    const { redirectTo = '/', throwOnError = false } = options

    const { session, user } = await requireAuth({
      ...options,
      redirectTo: options.redirectTo ?? '/auth/signin',
    })

    const roleArray = Array.isArray(roles) ? roles : [roles]
    if (!roleArray.includes(user.role)) {
      if (throwOnError) {
        throw new AuthError('Forbidden', 'FORBIDDEN')
      }
      redirect(redirectTo)
    }

    return { session, user }
  }

  /**
   * Требует роль ADMIN
   * Shortcut для requireRole('ADMIN')
   */
  async function requireAdmin(options: GuardOptions = {}): Promise<{ session: TSession; user: TUser }> {
    return requireRole('ADMIN', options)
  }

  return { requireAuth, requireRole, requireAdmin }
}
