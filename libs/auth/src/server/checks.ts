/**
 * Создаёт функции проверки авторизации (без редиректов/ошибок)
 *
 * @example
 * ```typescript
 * import { createAuthChecks } from '@letar/auth/server'
 *
 * const { getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)
 * const { isAuthenticated, hasRole, isAdmin } = createAuthChecks(getCurrentUser)
 *
 * // В Server Component
 * export default async function Page() {
 *   if (await isAdmin()) {
 *     return <AdminDashboard />
 *   }
 *   return <UserDashboard />
 * }
 * ```
 */
export function createAuthChecks<TUser extends { role: string }>(getCurrentUser: () => Promise<TUser | null>) {
  /**
   * Проверяет авторизован ли пользователь
   */
  async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser()
    return !!user
  }

  /**
   * Проверяет наличие роли у пользователя
   * @param roles Роль или массив ролей
   */
  async function hasRole(roles: string | string[]): Promise<boolean> {
    const user = await getCurrentUser()
    if (!user) {
      return false
    }
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  /**
   * Проверяет является ли пользователь администратором
   */
  async function isAdmin(): Promise<boolean> {
    return hasRole('ADMIN')
  }

  return { isAuthenticated, hasRole, isAdmin }
}
