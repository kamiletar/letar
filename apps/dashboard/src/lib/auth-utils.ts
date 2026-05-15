import { getServerSession } from './auth'
import type { DashboardUser, UserRole } from './auth.types'

/**
 * Проверка авторизации в Server Actions и API Routes
 *
 * @throws Error если пользователь не авторизован
 * @returns Session user
 */
export async function requireAuth(): Promise<DashboardUser> {
  const session = await getServerSession()

  if (!session?.user) {
    throw new Error('Unauthorized - Please sign in')
  }

  return session.user as DashboardUser
}

/**
 * Проверка роли пользователя
 *
 * @param allowedRoles - допустимые роли
 * @throws Error если у пользователя нет нужной роли
 * @returns Session user
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<DashboardUser> {
  const user = await requireAuth()

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden - Required role: ${roles.join(' or ')}`)
  }

  return user
}

/**
 * Проверка является ли пользователь Admin
 *
 * @throws Error если пользователь не Admin
 * @returns Session user
 */
export async function requireAdmin() {
  return requireRole('ADMIN')
}

/**
 * Проверка авторизации без throw (возвращает boolean)
 *
 * @returns true если пользователь авторизован
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession()
  return !!session?.user
}

/**
 * Проверка роли без throw (возвращает boolean)
 *
 * @param allowedRoles - допустимые роли
 * @returns true если у пользователя есть нужная роль
 */
export async function hasRole(allowedRoles: UserRole | UserRole[]): Promise<boolean> {
  const session = await getServerSession()

  if (!session?.user) {
    return false
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  return roles.includes((session.user as DashboardUser).role)
}

/**
 * Проверка является ли пользователь Admin (без throw)
 *
 * @returns true если пользователь Admin
 */
export async function isAdmin() {
  return hasRole('ADMIN')
}
