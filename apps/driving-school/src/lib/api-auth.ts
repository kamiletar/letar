import { prisma } from '@/lib/db'
import {
  apiError,
  apiSuccess,
  checkRateLimit,
  generateApiKey as generateApiKeyBase,
  getRateLimitHeaders,
  hashApiKey,
  type RateLimitResult,
} from '@letar/api-server'
import type { Organization } from '@letar/driving-school-db/models'

// Префикс для API-ключей driving-school
const API_KEY_PREFIX = 'ds_live_'

/**
 * Результат авторизации по API-ключу
 */
export interface ApiAuthResult {
  success: boolean
  organization?: Organization
  apiKeyId?: string
  error?: string
  errorCode?: 'MISSING_KEY' | 'INVALID_KEY' | 'REVOKED_KEY' | 'RATE_LIMITED' | 'INTERNAL_ERROR'
  rateLimit?: RateLimitResult
}

// Реэкспортируем утилиты из @letar/api-server
export { apiError, apiSuccess, getRateLimitHeaders, hashApiKey }

/**
 * Генерирует новый API-ключ для driving-school
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  return generateApiKeyBase(API_KEY_PREFIX)
}

/**
 * Авторизует запрос по API-ключу из заголовка X-API-Key
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  try {
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return {
        success: false,
        error: 'API-ключ не предоставлен. Используйте заголовок X-API-Key',
        errorCode: 'MISSING_KEY',
      }
    }

    // Хешируем полученный ключ для поиска в БД
    const keyHash = hashApiKey(apiKey)

    // Ищем ключ в БД
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    })

    if (!apiKeyRecord) {
      return {
        success: false,
        error: 'Неверный API-ключ',
        errorCode: 'INVALID_KEY',
      }
    }

    if (apiKeyRecord.status === 'REVOKED') {
      return {
        success: false,
        error: 'API-ключ отозван',
        errorCode: 'REVOKED_KEY',
      }
    }

    // Проверяем rate limit
    const rateLimit = checkRateLimit(apiKeyRecord.organizationId, apiKeyRecord.id)

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Превышен лимит запросов. Повторите через ${rateLimit.retryAfter} сек.`,
        errorCode: 'RATE_LIMITED',
        rateLimit,
      }
    }

    // Обновляем статистику использования (асинхронно, не блокируем запрос)
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      })
      .catch(console.error)

    return {
      success: true,
      organization: apiKeyRecord.organization,
      apiKeyId: apiKeyRecord.id,
      rateLimit,
    }
  } catch (error) {
    console.error('Ошибка авторизации API-ключа:', error)
    return {
      success: false,
      error: 'Внутренняя ошибка сервера',
      errorCode: 'INTERNAL_ERROR',
    }
  }
}
