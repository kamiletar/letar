/**
 * Опции для createRoleGuards
 */
export interface RoleGuardOptions<TRole extends string = string> {
  /**
   * DB-фолбэк для догрузки ролей, если их нет в сессии/cookieCache.
   * Better Auth `additionalFields` (напр. `roles: string[]`) не всегда попадают в cookieCache —
   * без фолбэка `hasRole`/`isAdmin` молча вернут `false` для только что вошедшего пользователя.
   *
   * @example
   * ```typescript
   * refetchRoles: async (userId) => {
   *   const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } })
   *   return user?.roles ?? []
   * }
   * ```
   */
  refetchRoles?: (userId: string) => Promise<TRole[]>
  /** URL для редиректа неавторизованных (по умолчанию '/sign-in') */
  signInUrl?: string
  /** URL для редиректа авторизованных без нужной роли (по умолчанию '/') */
  forbiddenUrl?: string
}

/**
 * Создаёт guard-функции для приложений с массивом ролей (`roles: TRole[]`) — паттерн
 * `additionalFields: { roles: { type: 'string[]', ... } }`, применяемый во всех hub-client
 * приложениях монорепо (kami, auth-hub, aprel8008 и др.).
 *
 * Отличие от `createAuthGuards`/`createAuthChecks`: те типизированы под одиночное поле
 * `role: string` и на практике не используются — реальные приложения хранят роли массивом
 * и вручную копируют идентичный `hasRole`/`isAdmin`/`requireAuth`/`requireAdmin` в каждый
 * `lib/auth.ts`. Эта фабрика — извлечение того дубля.
 *
 * @example
 * ```typescript
 * // lib/auth.ts
 * import { createRoleGuards, createSessionHelpers } from '@letar/auth/server'
 *
 * const { getSession, getCurrentUser } = createSessionHelpers<Session>(auth)
 *
 * export const { hasRole, isAdmin, requireAuth, requireAdmin } = createRoleGuards(
 *   getSession,
 *   (session) => session.user as SessionUser,
 *   {
 *     refetchRoles: async (userId) => {
 *       const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } })
 *       return user?.roles ?? []
 *     },
 *   }
 * )
 * ```
 */
export function createRoleGuards<TSession, TUser extends { id: string; roles: TRole[] }, TRole extends string = string>(
  getSession: () => Promise<TSession | null>,
  getUserFromSession: (session: TSession) => TUser,
  options: RoleGuardOptions<TRole> = {}
) {
  const { refetchRoles, signInUrl = '/sign-in', forbiddenUrl = '/' } = options

  async function getCurrentUser(): Promise<TUser | null> {
    const session = await getSession()
    return session ? getUserFromSession(session) : null
  }

  /**
   * Проверяет роль(и) с DB-фолбэком, если `user.roles` пуст (cookieCache без additionalFields)
   */
  async function hasRole(role: TRole | TRole[]): Promise<boolean> {
    const user = await getCurrentUser()
    if (!user) {
      return false
    }

    let userRoles = user.roles
    if ((!Array.isArray(userRoles) || userRoles.length === 0) && refetchRoles) {
      userRoles = await refetchRoles(user.id)
    }

    const targets = Array.isArray(role) ? role : [role]
    return targets.some((r) => userRoles.includes(r))
  }

  /** Проверяет роль `ADMIN` */
  async function isAdmin(): Promise<boolean> {
    return hasRole('ADMIN' as TRole)
  }

  /** Требует авторизации, иначе редирект на `signInUrl` */
  async function requireAuth(): Promise<{ session: TSession; user: TUser }> {
    const { redirect } = await import('next/navigation')
    const session = await getSession()
    if (!session) {
      redirect(signInUrl)
    }
    const nonNullSession = session as TSession
    return { session: nonNullSession, user: getUserFromSession(nonNullSession) }
  }

  /** Требует определённую роль(и), иначе редирект на `forbiddenUrl` */
  async function requireRole(role: TRole | TRole[]): Promise<{ session: TSession; user: TUser }> {
    const { redirect } = await import('next/navigation')
    const result = await requireAuth()
    if (!(await hasRole(role))) {
      redirect(forbiddenUrl)
    }
    return result
  }

  /** Требует роль `ADMIN`, иначе редирект на `forbiddenUrl` */
  async function requireAdmin(): Promise<{ session: TSession; user: TUser }> {
    return requireRole('ADMIN' as TRole)
  }

  return { getCurrentUser, hasRole, isAdmin, requireAuth, requireRole, requireAdmin }
}
