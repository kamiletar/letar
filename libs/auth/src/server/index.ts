/**
 * @letar/auth/server — Серверные хелперы для Better Auth
 *
 * @example
 * ```typescript
 * import { createSessionHelpers, createAuthGuards, createAuthChecks } from '@letar/auth/server'
 * import { auth, type SessionWithRole, type UserWithRole } from './auth'
 *
 * // Создание хелперов
 * const { getSession, getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)
 * const { requireAuth, requireRole, requireAdmin } = createAuthGuards(
 *   getSession,
 *   (session) => session.user as UserWithRole
 * )
 * const { isAuthenticated, hasRole, isAdmin } = createAuthChecks(getCurrentUser)
 *
 * // Logout action
 * import { createLogoutAction } from '@letar/auth/server'
 * export const logoutAction = createLogoutAction(auth)
 *
 * // Экспорт для использования в приложении
 * export {
 *   getSession, getCurrentUser,
 *   requireAuth, requireRole, requireAdmin,
 *   isAuthenticated, hasRole, isAdmin,
 *   logoutAction
 * }
 * ```
 */

// Session helpers
export { createAuthChecks } from './checks'
export { AuthError, createAuthGuards, type GuardOptions } from './guards'
export { createSessionHelpers, type AuthInstance } from './session'

// Factories
export { createLogoutAction, type LogoutActionOptions } from './factories'

// Connected Accounts
export {
  createUnlinkAccountAction,
  type CreateUnlinkActionOptions,
  type UnlinkAccountResult,
} from './connected-accounts'
