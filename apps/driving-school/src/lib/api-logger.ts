import { prisma } from '@/lib/db'
import type { RateLimitResult } from '@letar/api-server'

/**
 * Параметры для логирования API запроса
 */
export interface ApiLogParams {
  // Идентификация
  apiKeyId: string
  organizationId: string

  // Запрос
  method: string
  endpoint: string
  queryParams?: Record<string, unknown>

  // IP и User-Agent
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Результат выполнения запроса для логирования
 */
export interface ApiLogResult {
  statusCode: number
  responseSize?: number
  rateLimit?: RateLimitResult | null
  errorCode?: string
  errorMessage?: string
}

/**
 * Извлекает IP адрес из запроса
 */
export function getClientIp(request: Request): string | null {
  // Пробуем разные заголовки
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Берём первый IP из списка
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  return null
}

/**
 * Извлекает параметры запроса из URL
 */
export function extractQueryParams(request: Request): Record<string, string> | null {
  try {
    const url = new URL(request.url)
    const params: Record<string, string> = {}

    url.searchParams.forEach((value, key) => {
      params[key] = value
    })

    return Object.keys(params).length > 0 ? params : null
  } catch {
    return null
  }
}

/**
 * Извлекает endpoint из URL (без query параметров)
 */
export function extractEndpoint(request: Request): string {
  try {
    const url = new URL(request.url)
    return url.pathname
  } catch {
    return request.url
  }
}

/**
 * Логирует API запрос в базу данных (асинхронно, не блокирует ответ)
 */
export function logApiRequest(params: ApiLogParams, result: ApiLogResult, responseTimeMs: number): void {
  // Асинхронное логирование — не блокируем ответ
  prisma.apiLog
    .create({
      data: {
        apiKeyId: params.apiKeyId,
        organizationId: params.organizationId,
        method: params.method,
        endpoint: params.endpoint,
        statusCode: result.statusCode,
        queryParams: params.queryParams ? JSON.parse(JSON.stringify(params.queryParams)) : undefined,
        responseTimeMs,
        responseSize: result.responseSize,
        rateLimitLimit: result.rateLimit?.limit,
        rateLimitRemaining: result.rateLimit?.remaining,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
    .catch((error) => {
      console.error('Ошибка логирования API запроса:', error)
    })
}

/**
 * Создаёт контекст для логирования запроса
 * Возвращает функцию для завершения логирования с результатом
 */
export function createApiLogger(request: Request) {
  const startTime = performance.now()

  return {
    startTime,
    method: request.method,
    endpoint: extractEndpoint(request),
    queryParams: extractQueryParams(request),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),

    /**
     * Завершает логирование с результатом
     */
    log(apiKeyId: string, organizationId: string, result: ApiLogResult): void {
      const responseTimeMs = Math.round(performance.now() - startTime)

      logApiRequest(
        {
          apiKeyId,
          organizationId,
          method: this.method,
          endpoint: this.endpoint,
          queryParams: this.queryParams ?? undefined,
          ipAddress: this.ipAddress,
          userAgent: this.userAgent,
        },
        result,
        responseTimeMs
      )
    },

    /**
     * Логирует ошибку авторизации (без apiKeyId/organizationId)
     * Для случаев когда ключ недействителен или отсутствует
     */
    logAuthError(apiKeyId: string | undefined, organizationId: string | undefined, result: ApiLogResult): void {
      // Если нет apiKeyId или organizationId, не логируем (нечего привязать)
      if (!apiKeyId || !organizationId) {
        return
      }

      this.log(apiKeyId, organizationId, result)
    },
  }
}

/**
 * Получает размер JSON ответа в байтах
 */
export function getResponseSize(body: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(body)).length
  } catch {
    return 0
  }
}
