/**
 * API Key Utilities
 *
 * Генерация и хеширование API-ключей
 */

import { createHash, randomBytes } from 'crypto'

// Префикс по умолчанию для API-ключей
const DEFAULT_API_KEY_PREFIX = 'api_live_'

/**
 * Хеширует API-ключ для безопасного хранения
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Генерирует новый API-ключ с дефолтным префиксом
 * Возвращает сам ключ (для показа пользователю один раз) и его хеш (для хранения)
 */
export function generateApiKey(prefix: string = DEFAULT_API_KEY_PREFIX): {
  key: string
  keyHash: string
  keyPrefix: string
} {
  // Генерируем 32 случайных байта и конвертируем в base64url
  const randomPart = randomBytes(32).toString('base64url')
  const key = `${prefix}${randomPart}`

  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.substring(0, Math.min(12, prefix.length + 4)) + '...',
  }
}

/**
 * Создаёт генератор API-ключей с кастомным префиксом
 */
export function createApiKeyGenerator(prefix: string): () => {
  key: string
  keyHash: string
  keyPrefix: string
} {
  return () => generateApiKey(prefix)
}
