/**
 * Стандартизированные ответы API
 * Обеспечивает единообразный формат ответов
 */

import { NextResponse } from 'next/server'

// =============================================================================
// Типы
// =============================================================================

interface SuccessResponse<T> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: string
  details?: unknown
}

// =============================================================================
// Успешные ответы
// =============================================================================

/**
 * Возвращает успешный ответ с данными
 * @example successResponse({ users: [...] })
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies SuccessResponse<T>, { status })
}

/**
 * Возвращает ответ без контента (204 No Content)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}

/**
 * Возвращает ответ для создания ресурса (201 Created)
 */
export function createdResponse<T>(data: T) {
  return successResponse(data, 201)
}

// =============================================================================
// Ошибки
// =============================================================================

/**
 * Возвращает ответ с ошибкой
 * @example errorResponse('Internal server error')
 * @example errorResponse('Not found', 404)
 */
export function errorResponse(error: string, status = 500, details?: unknown) {
  const body: ErrorResponse = { success: false, error }
  if (details !== undefined) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

/**
 * Возвращает ответ с ошибкой валидации (400 Bad Request)
 */
export function validationErrorResponse(errors: unknown) {
  return NextResponse.json({ success: false, error: 'Validation failed', details: errors } satisfies ErrorResponse, {
    status: 400,
  })
}

/**
 * Возвращает ответ "Не авторизован" (401 Unauthorized)
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401)
}

/**
 * Возвращает ответ "Доступ запрещён" (403 Forbidden)
 */
export function forbiddenResponse(message = 'Forbidden') {
  return errorResponse(message, 403)
}

/**
 * Возвращает ответ "Не найдено" (404 Not Found)
 */
export function notFoundResponse(message = 'Not found') {
  return errorResponse(message, 404)
}

/**
 * Возвращает ответ "Too Many Requests" (429)
 */
export function rateLimitedResponse(message = 'Too many requests') {
  return errorResponse(message, 429)
}

// =============================================================================
// Утилиты
// =============================================================================

/**
 * Оборачивает API handler в try-catch с логированием
 */
export function withErrorHandling<T>(handler: () => Promise<T>, context: string): Promise<T | NextResponse> {
  return handler().catch((error) => {
    console.error(`[API] Error in ${context}:`, error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  })
}
