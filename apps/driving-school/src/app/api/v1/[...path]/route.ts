import { type ApiAuthResult, authenticateApiKey, getRateLimitHeaders } from '@/lib/api-auth'
import { createApiLogger, getResponseSize } from '@/lib/api-logger'
import { prisma } from '@/lib/db'
import { schema } from '@letar/driving-school-db/schema'
import { RestApiHandler } from '@zenstackhq/server/api'
import { NextRequestHandler } from '@zenstackhq/server/next'
import { NextRequest, NextResponse } from 'next/server'

// Whitelist разрешённых моделей (только эти модели доступны через API)
const ALLOWED_MODELS = new Set(['organization', 'member', 'team'])

/**
 * SINGLETON: RestApiHandler создаётся ОДИН РАЗ при загрузке модуля.
 * Это критично для памяти — ZenStack парсит schema и создаёт Zod объекты.
 * Без singleton каждый запрос создавал бы новые Zod схемы → memory leak.
 */
const apiHandler = new RestApiHandler({
  schema,
  endpoint: '/api/v1', // Относительный путь, работает для всех хостов
})

// Модели с фильтром по organizationId
const MODELS_WITH_ORGANIZATION_ID: Record<string, string> = {
  organization: 'id', // Для organization фильтруем по id == organizationId
  member: 'organizationId',
  team: 'organizationId',
}

// Whitelist разрешённых методов (только чтение на первом этапе)
const ALLOWED_METHODS = new Set(['GET'])

// Получить название модели из URL
function getModelFromPath(pathname: string): string | null {
  // URL: /api/v1/user, /api/v1/school, /api/v1/schoolMembership/123
  const parts = pathname.replace('/api/v1/', '').split('/')
  return parts[0] || null
}

// Проверить, разрешена ли модель
function isModelAllowed(model: string | null): boolean {
  if (!model) {
    return false
  }
  return ALLOWED_MODELS.has(model)
}

// Создание ZenStack ORM client для внешнего API
// Используем сырой Prisma без политик доступа ZenStack,
// т.к. access control обеспечивается на уровне API через:
// - Аутентификацию по API-ключу
// - Whitelist разрешённых моделей
// - Автоматическую фильтрацию по organizationId
function createClientForExternalApi(_organizationId: string) {
  return prisma
}

// Обработчик с авторизацией и логированием
async function handleRequest(request: NextRequest): Promise<NextResponse> {
  const logger = createApiLogger(request)
  const startTime = Date.now()

  // Проверяем метод
  if (!ALLOWED_METHODS.has(request.method)) {
    const body = {
      error: 'Метод не разрешён. Используйте GET.',
      code: 'METHOD_NOT_ALLOWED',
    }
    return NextResponse.json(body, { status: 405 })
  }

  // Проверяем модель
  const url = new URL(request.url)
  const model = getModelFromPath(url.pathname)

  if (!isModelAllowed(model)) {
    const body = {
      error: `Ресурс "${model}" недоступен через API`,
      code: 'RESOURCE_NOT_FOUND',
    }
    return NextResponse.json(body, { status: 404 })
  }

  // Авторизация по API-ключу
  const authResult = await authenticateApiKey(request)
  const rateLimitHeaders = getRateLimitHeaders(authResult.rateLimit)

  if (!authResult.success || !authResult.organization) {
    const status = authResult.errorCode === 'RATE_LIMITED' ? 429 : 401
    const body = { error: authResult.error || 'Ошибка авторизации', code: authResult.errorCode }

    // Логируем ошибку
    logRequest(logger, authResult, status, body, startTime)

    return NextResponse.json(body, { status, headers: rateLimitHeaders })
  }

  try {
    // Создаём ZenStack ORM клиент с контекстом организации
    const client = createClientForExternalApi(authResult.organization.id)

    // Модифицируем запрос, добавляя фильтр по organizationId

    const filteredRequest = addOrganizationIdFilter(request, model!, authResult.organization.id)
    const filteredUrl = new URL(filteredRequest.url)

    // Используем singleton apiHandler (создан при загрузке модуля)
    const handler = NextRequestHandler({
      getClient: () => client,
      useAppDir: true,
      apiHandler, // singleton — не создаём новый на каждый запрос!
    })

    // Вызываем ZenStack handler с отфильтрованным запросом
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handler(filteredRequest as any, {
      params: Promise.resolve({ path: getPathSegments(filteredUrl.pathname) }),
    })

    // Получаем тело ответа для логирования
    const clonedResponse = response.clone()
    const responseBody = await clonedResponse.json().catch(() => ({}))

    // Логируем успешный запрос
    logRequest(logger, authResult, response.status, responseBody, startTime)

    // Добавляем rate limit headers
    const headers = new Headers(response.headers)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error('API Error:', error)

    const body = {
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    }

    // Логируем ошибку
    logRequest(logger, authResult, 500, body, startTime, error)

    return NextResponse.json(body, { status: 500, headers: rateLimitHeaders })
  }
}

// Логирование запроса
function logRequest(
  logger: ReturnType<typeof createApiLogger>,
  authResult: ApiAuthResult,
  statusCode: number,
  body: unknown,
  _startTime: number,
  error?: unknown
) {
  if (authResult.apiKeyId && authResult.organization) {
    // logger.log уже сам вычисляет responseTimeMs на основе startTime из createApiLogger
    logger.log(authResult.apiKeyId, authResult.organization.id, {
      statusCode,
      responseSize: getResponseSize(body),
      rateLimit: authResult.rateLimit,
      ...(statusCode >= 400 && {
        errorCode: (body as { code?: string })?.code,
        errorMessage: error instanceof Error ? error.message : (body as { error?: string })?.error,
      }),
    })
  }
}

// Получить сегменты пути для ZenStack handler
function getPathSegments(pathname: string): string[] {
  // /api/v1/school/123 -> ['school', '123']
  return pathname.replace('/api/v1/', '').split('/').filter(Boolean)
}

// Добавить фильтр по organizationId к URL
function addOrganizationIdFilter(request: NextRequest, model: string, organizationId: string): NextRequest {
  const filterField = MODELS_WITH_ORGANIZATION_ID[model]
  if (!filterField) {
    return request
  }

  const url = new URL(request.url)

  // Проверяем, нет ли уже фильтра (не переопределяем явно указанный)
  const existingFilter = url.searchParams.get(`filter[${filterField}]`)
  if (existingFilter) {
    // Проверяем, что пользователь не пытается получить данные чужой организации
    if (existingFilter !== organizationId) {
      // Возвращаем запрос, который не найдёт ничего (защита от подмены)
      url.searchParams.set(`filter[${filterField}]`, 'invalid-organization-id-blocked')
    }
  } else {
    // Добавляем фильтр по organizationId
    url.searchParams.set(`filter[${filterField}]`, organizationId)
  }

  // Создаём новый Request с модифицированным URL
  return new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
}

// Экспортируем обработчики для всех методов
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest
