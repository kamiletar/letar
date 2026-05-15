/**
 * @letar/api-server
 *
 * Серверные утилиты для REST API:
 * - API ключи и аутентификация
 * - Rate limiting
 * - Роли и права доступа
 * - Стандартные ответы
 */

// API Response
export { apiError, apiSuccess, getRateLimitHeaders } from './lib/api-response'

// API Key
export { createApiKeyGenerator, generateApiKey, hashApiKey } from './lib/api-key'

// Rate Limiter
export {
  addToBlacklist,
  addToWhitelist,
  checkRateLimit,
  clearAll,
  createRateLimiter,
  getAllSettings,
  getCustomLimit,
  getRateLimiterStats,
  isBlacklisted,
  isWhitelisted,
  removeFromBlacklist,
  removeFromWhitelist,
  resetCounters,
  setCustomLimit,
} from './lib/rate-limiter'

export type { RateLimitResult, RateLimiterConfig, RateLimiterInstance } from './lib/rate-limiter'

// Role Utils
export { createMembershipChecker, createRoleChecker, hasAllRoles, hasAnyRole, hasRole } from './lib/role-utils'

export type { MembershipChecker, MembershipLike, RoleChecker } from './lib/role-utils'
