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
export {
  createDevSessionRoute,
  createLogoutAction,
  type CreateDevSessionRouteOptions,
  type DevSessionPrismaClient,
  type LogoutActionOptions,
} from './factories'

// Auth factory (Этап 1.5 + Этап 8)
export { createAuth, createAuthAsync } from './create-auth'
export type {
  AuthProfile,
  HubClientAuthProfile,
  HubClientOidcConfig,
  HubProviderAuthProfile,
  SendEmailResult,
  StandaloneAuthProfile,
  StandaloneEmailCallbacks,
  StandaloneSocialSource,
} from './create-auth/types'

// Redis secondaryStorage адаптер (Этап 0.2 PLAN.md — rate-limit персистентность)
export { createRedisStorage } from './redis-storage'

// Шифрование at-rest (Этап 8 PLAN.md)
export { decryptSecret, decryptToken, encryptSecret, encryptToken, getEncryptionKey, isEncrypted } from './crypto'
export { createSocialProviderLoader } from './social-loader'

// Connected Accounts
export {
  createUnlinkAccountAction,
  type CreateUnlinkActionOptions,
  type UnlinkAccountResult,
} from './connected-accounts'
