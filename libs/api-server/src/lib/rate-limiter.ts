/**
 * Rate Limiter
 *
 * Использует sliding window алгоритм с in-memory хранением.
 * Лимит по умолчанию: 100 запросов в минуту (настраивается).
 */

// Структура записи в окне
interface RequestRecord {
  timestamp: number
  count: number
}

/**
 * Результат проверки rate limit
 */
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number // Unix timestamp в секундах
  retryAfter?: number // Секунды до сброса (только если заблокирован)
}

/**
 * Конфигурация rate limiter
 */
export interface RateLimiterConfig {
  /** Длина окна в миллисекундах (по умолчанию: 60000 - 1 минута) */
  windowMs?: number
  /** Максимум запросов в окне (по умолчанию: 100) */
  maxRequests?: number
  /** Интервал очистки устаревших записей в мс (по умолчанию: 300000 - 5 минут) */
  cleanupIntervalMs?: number
}

/**
 * Экземпляр rate limiter
 */
export interface RateLimiterInstance {
  checkRateLimit: (key: string, secondaryKey?: string) => RateLimitResult
  setCustomLimit: (key: string, maxRequests: number) => void
  getCustomLimit: (key: string) => number | null
  addToWhitelist: (key: string) => void
  removeFromWhitelist: (key: string) => void
  addToBlacklist: (key: string) => void
  removeFromBlacklist: (key: string) => void
  isWhitelisted: (key: string) => boolean
  isBlacklisted: (key: string) => boolean
  getRateLimiterStats: () => {
    activeKeys: number
    customLimits: number
    whitelisted: number
    blacklisted: number
    defaultLimit: number
    windowSeconds: number
  }
  getAllSettings: () => {
    customLimits: Array<{ key: string; limit: number }>
    whitelist: string[]
    blacklist: string[]
  }
  resetCounters: (key: string) => void
  clearAll: () => void
  destroy: () => void
}

/**
 * Создаёт экземпляр rate limiter с заданной конфигурацией
 */
export function createRateLimiter(config: RateLimiterConfig = {}): RateLimiterInstance {
  const windowMs = config.windowMs ?? 60 * 1000
  const defaultMaxRequests = config.maxRequests ?? 100
  const cleanupIntervalMs = config.cleanupIntervalMs ?? 5 * 60 * 1000

  // Хранилище запросов по ключу
  const requestStore = new Map<string, RequestRecord[]>()
  // Кастомные лимиты (key -> maxRequests)
  const customLimits = new Map<string, number>()
  // Whitelist (без лимитов)
  const whitelist = new Set<string>()
  // Blacklist (блокировка)
  const blacklist = new Set<string>()

  // Очищает устаревшие записи
  function cleanupOldRecords(records: RequestRecord[]): RequestRecord[] {
    const now = Date.now()
    const windowStart = now - windowMs
    return records.filter((record) => record.timestamp > windowStart)
  }

  // Периодическая очистка
  let cleanupInterval: ReturnType<typeof setInterval> | undefined
  if (typeof setInterval !== 'undefined' && cleanupIntervalMs > 0) {
    cleanupInterval = setInterval(() => {
      const now = Date.now()
      const windowStart = now - windowMs

      for (const [key, records] of requestStore.entries()) {
        const cleaned = records.filter((record) => record.timestamp > windowStart)
        if (cleaned.length === 0) {
          requestStore.delete(key)
        } else {
          requestStore.set(key, cleaned)
        }
      }
    }, cleanupIntervalMs)
  }

  return {
    checkRateLimit(key: string, secondaryKey?: string): RateLimitResult {
      const now = Date.now()
      const resetAt = Math.floor((now + windowMs) / 1000)

      // Проверяем blacklist
      if (blacklist.has(key)) {
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetAt,
          retryAfter: Math.ceil(windowMs / 1000),
        }
      }

      // Проверяем whitelist
      if (whitelist.has(key)) {
        return {
          allowed: true,
          limit: -1, // Unlimited
          remaining: -1,
          resetAt,
        }
      }

      // Получаем лимит
      const maxRequests = customLimits.get(key) || defaultMaxRequests

      // Ключ для хранения
      const storeKey = secondaryKey || key

      // Получаем и очищаем записи
      let records = requestStore.get(storeKey) || []
      records = cleanupOldRecords(records)

      // Считаем количество запросов в текущем окне
      const requestCount = records.reduce((sum, record) => sum + record.count, 0)

      // Проверяем лимит
      if (requestCount >= maxRequests) {
        const oldestRecord = records[0]
        const retryAfter = oldestRecord ? Math.ceil((oldestRecord.timestamp + windowMs - now) / 1000) : 60

        requestStore.set(storeKey, records)

        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetAt: Math.floor((oldestRecord?.timestamp || now + windowMs) / 1000) + 60,
          retryAfter: Math.max(1, retryAfter),
        }
      }

      // Добавляем новый запрос
      records.push({ timestamp: now, count: 1 })
      requestStore.set(storeKey, records)

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - requestCount - 1,
        resetAt,
      }
    },

    setCustomLimit(key: string, maxRequests: number): void {
      if (maxRequests <= 0) {
        customLimits.delete(key)
      } else {
        customLimits.set(key, maxRequests)
      }
    },

    getCustomLimit(key: string): number | null {
      return customLimits.get(key) || null
    },

    addToWhitelist(key: string): void {
      whitelist.add(key)
      blacklist.delete(key)
    },

    removeFromWhitelist(key: string): void {
      whitelist.delete(key)
    },

    addToBlacklist(key: string): void {
      blacklist.add(key)
      whitelist.delete(key)
    },

    removeFromBlacklist(key: string): void {
      blacklist.delete(key)
    },

    isWhitelisted(key: string): boolean {
      return whitelist.has(key)
    },

    isBlacklisted(key: string): boolean {
      return blacklist.has(key)
    },

    getRateLimiterStats() {
      return {
        activeKeys: requestStore.size,
        customLimits: customLimits.size,
        whitelisted: whitelist.size,
        blacklisted: blacklist.size,
        defaultLimit: defaultMaxRequests,
        windowSeconds: windowMs / 1000,
      }
    },

    getAllSettings() {
      return {
        customLimits: Array.from(customLimits.entries()).map(([key, limit]) => ({ key, limit })),
        whitelist: Array.from(whitelist),
        blacklist: Array.from(blacklist),
      }
    },

    resetCounters(key: string): void {
      for (const storeKey of requestStore.keys()) {
        if (storeKey === key || storeKey.startsWith(key)) {
          requestStore.delete(storeKey)
        }
      }
    },

    clearAll(): void {
      requestStore.clear()
      customLimits.clear()
      whitelist.clear()
      blacklist.clear()
    },

    destroy(): void {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
      }
      requestStore.clear()
      customLimits.clear()
      whitelist.clear()
      blacklist.clear()
    },
  }
}

// === Глобальный rate limiter для обратной совместимости ===

// Хранилище запросов по API-ключу
const requestStore = new Map<string, RequestRecord[]>()

// Настройки по умолчанию
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 минута
const DEFAULT_MAX_REQUESTS = 100 // 100 запросов в минуту

// Кастомные лимиты (key -> maxRequests)
const customLimits = new Map<string, number>()

// Whitelist (без лимитов)
const whitelist = new Set<string>()

// Blacklist (блокировка)
const blacklist = new Set<string>()

/**
 * Очищает устаревшие записи
 */
function cleanupOldRecords(records: RequestRecord[], windowMs: number): RequestRecord[] {
  const now = Date.now()
  const windowStart = now - windowMs
  return records.filter((record) => record.timestamp > windowStart)
}

/**
 * Проверяет и обновляет rate limit для ключа
 */
export function checkRateLimit(key: string, secondaryKey?: string): RateLimitResult {
  const now = Date.now()
  const windowMs = DEFAULT_WINDOW_MS
  const resetAt = Math.floor((now + windowMs) / 1000)

  // Проверяем blacklist
  if (blacklist.has(key)) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    }
  }

  // Проверяем whitelist
  if (whitelist.has(key)) {
    return {
      allowed: true,
      limit: -1, // Unlimited
      remaining: -1,
      resetAt,
    }
  }

  // Получаем лимит
  const maxRequests = customLimits.get(key) || DEFAULT_MAX_REQUESTS

  // Ключ для хранения
  const storeKey = secondaryKey || key

  // Получаем и очищаем записи
  let records = requestStore.get(storeKey) || []
  records = cleanupOldRecords(records, windowMs)

  // Считаем количество запросов в текущем окне
  const requestCount = records.reduce((sum, record) => sum + record.count, 0)

  // Проверяем лимит
  if (requestCount >= maxRequests) {
    const oldestRecord = records[0]
    const retryAfter = oldestRecord ? Math.ceil((oldestRecord.timestamp + windowMs - now) / 1000) : 60

    requestStore.set(storeKey, records)

    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: Math.floor((oldestRecord?.timestamp || now + windowMs) / 1000) + 60,
      retryAfter: Math.max(1, retryAfter),
    }
  }

  // Добавляем новый запрос
  records.push({ timestamp: now, count: 1 })
  requestStore.set(storeKey, records)

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - requestCount - 1,
    resetAt,
  }
}

/**
 * Устанавливает кастомный лимит
 */
export function setCustomLimit(key: string, maxRequests: number): void {
  if (maxRequests <= 0) {
    customLimits.delete(key)
  } else {
    customLimits.set(key, maxRequests)
  }
}

/**
 * Получает кастомный лимит
 */
export function getCustomLimit(key: string): number | null {
  return customLimits.get(key) || null
}

/**
 * Добавляет в whitelist (без лимитов)
 */
export function addToWhitelist(key: string): void {
  whitelist.add(key)
  blacklist.delete(key)
}

/**
 * Удаляет из whitelist
 */
export function removeFromWhitelist(key: string): void {
  whitelist.delete(key)
}

/**
 * Добавляет в blacklist (блокировка)
 */
export function addToBlacklist(key: string): void {
  blacklist.add(key)
  whitelist.delete(key)
}

/**
 * Удаляет из blacklist
 */
export function removeFromBlacklist(key: string): void {
  blacklist.delete(key)
}

/**
 * Проверяет, в whitelist ли ключ
 */
export function isWhitelisted(key: string): boolean {
  return whitelist.has(key)
}

/**
 * Проверяет, в blacklist ли ключ
 */
export function isBlacklisted(key: string): boolean {
  return blacklist.has(key)
}

/**
 * Получает статистику rate limiter
 */
export function getRateLimiterStats(): {
  activeKeys: number
  customLimits: number
  whitelisted: number
  blacklisted: number
  defaultLimit: number
  windowSeconds: number
} {
  return {
    activeKeys: requestStore.size,
    customLimits: customLimits.size,
    whitelisted: whitelist.size,
    blacklisted: blacklist.size,
    defaultLimit: DEFAULT_MAX_REQUESTS,
    windowSeconds: DEFAULT_WINDOW_MS / 1000,
  }
}

/**
 * Получает все кастомные настройки
 */
export function getAllSettings(): {
  customLimits: Array<{ key: string; limit: number }>
  whitelist: string[]
  blacklist: string[]
} {
  return {
    customLimits: Array.from(customLimits.entries()).map(([key, limit]) => ({ key, limit })),
    whitelist: Array.from(whitelist),
    blacklist: Array.from(blacklist),
  }
}

/**
 * Сбрасывает счётчики для ключа
 */
export function resetCounters(key: string): void {
  for (const storeKey of requestStore.keys()) {
    if (storeKey === key || storeKey.startsWith(key)) {
      requestStore.delete(storeKey)
    }
  }
}

/**
 * Очищает все данные
 */
export function clearAll(): void {
  requestStore.clear()
  customLimits.clear()
  whitelist.clear()
  blacklist.clear()
}

// Периодическая очистка устаревших записей (каждые 5 минут)
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now()
      const windowStart = now - DEFAULT_WINDOW_MS

      for (const [key, records] of requestStore.entries()) {
        const cleaned = records.filter((record) => record.timestamp > windowStart)
        if (cleaned.length === 0) {
          requestStore.delete(key)
        } else {
          requestStore.set(key, cleaned)
        }
      }
    },
    5 * 60 * 1000
  )
}
