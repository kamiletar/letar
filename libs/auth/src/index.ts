/**
 * @letar/auth — Библиотека авторизации для Better Auth
 *
 * ## Модули
 *
 * - `@letar/auth/client` — Клиентские хелперы (createAuthClient, OnlyFor, SessionProvider)
 * - `@letar/auth/server` — Серверные хелперы (createSessionHelpers, createAuthGuards, createAuthChecks)
 *
 * ## Быстрый старт
 *
 * ```typescript
 * // apps/my-app/src/lib/auth-client.ts
 * import { createAuthClient } from '@letar/auth/client'
 *
 * export const authClient = createAuthClient()
 * export const { useSession, signIn, signOut, signUp } = authClient
 * ```
 *
 * ```typescript
 * // apps/my-app/src/lib/auth-utils.ts
 * import { createSessionHelpers, createAuthGuards, createAuthChecks } from '@letar/auth/server'
 * import { auth, type SessionWithRole, type UserWithRole } from './auth'
 *
 * const { getSession, getCurrentUser } = createSessionHelpers<SessionWithRole>(auth)
 * const { requireAuth, requireRole } = createAuthGuards(getSession, (s) => s.user as UserWithRole)
 * const { isAuthenticated, hasRole, isAdmin } = createAuthChecks(getCurrentUser)
 *
 * export { getSession, getCurrentUser, requireAuth, requireRole, isAuthenticated, hasRole, isAdmin }
 * ```
 *
 * @packageDocumentation
 */

// Re-export types
export type {
  AccountBase,
  ProviderDisplayConfig,
  SessionBase,
  SessionWithRole,
  SessionWithUserBase,
  SocialProviderActionResult,
  SocialProviderInput,
  SocialProviderRow,
  UnlinkAccountResult,
  UserBase,
  UserWithRole,
} from './types'

// Re-export client (for convenience, но лучше импортировать из @letar/auth/client)
export {
  OnlyFor,
  SessionProvider,
  createAuthClient,
  type AuthClient,
  type AuthClientOptions,
  type OnlyForProps,
  type SessionProviderProps,
} from './client'

// Re-export server (for convenience, но лучше импортировать из @letar/auth/server)
export {
  AuthError,
  createAuthChecks,
  createAuthGuards,
  createSessionHelpers,
  type AuthInstance,
  type GuardOptions,
} from './server'
