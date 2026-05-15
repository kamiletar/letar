/**
 * Типы для Rate Limiting компонентов.
 */

/**
 * Статистика Rate Limiting.
 */
export interface RateLimitStats {
  activeKeys: number
  customLimits: number
  whitelisted: number
  blacklisted: number
  defaultLimit: number
  windowSeconds: number
}

/**
 * Настройки Rate Limiting.
 */
export interface RateLimitSettings {
  customLimits: Array<{ organizationId: string; limit: number }>
  whitelist: string[]
  blacklist: string[]
}

/**
 * Организация.
 */
export interface Organization {
  id: string
  name: string
}

/**
 * Пропсы для RateLimitsClient.
 */
export interface RateLimitsClientProps {
  organizations: Organization[]
}
