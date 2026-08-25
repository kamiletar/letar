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
export { type AnonymousAuthInstance, createGetOrCreateSessionUserId } from './anonymous-session'
export { createAuthChecks } from './checks'
export { AuthError, createAuthGuards, type GuardOptions } from './guards'
export { type AuthInstance, createSessionHelpers } from './session'

// Factories
export {
  createDevSessionRoute,
  type CreateDevSessionRouteOptions,
  createLogoutAction,
  createRoleGuards,
  type DevSessionPrismaClient,
  type LogoutActionOptions,
  type RoleGuardOptions,
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
export { createRedisStorage, type CreateRedisStorageOptions } from './redis-storage'

// Шифрование at-rest (Этап 8 PLAN.md)
export {
  decryptSecret,
  decryptToken,
  encryptSecret,
  encryptToken,
  getEncryptionKey,
  isEncrypted,
  tryGetEncryptionKey,
} from './crypto'
export { createSocialProviderLoader } from './social-loader'

// Connected Accounts
export {
  createUnlinkAccountAction,
  type CreateUnlinkActionOptions,
  type UnlinkAccountResult,
} from './connected-accounts'

// Social Providers (Tier 2 self-service OAuth-ключи — SocialProvidersSettings, извлечено после
// третьего дословного дубля dsperevod → aboi → driving-school)
export {
  createSocialProviderActions,
  type CreateSocialProviderActionsOptions,
  type PrismaWithSocialProviderCrud,
  type SocialProviderActions,
} from './social-providers'
