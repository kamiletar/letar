import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Проверяет API Key в заголовке запроса
 *
 * @param request - Next.js Request
 * @returns true если API Key валиден
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-Dashboard-Secret')
  const expectedKey = process.env.DASHBOARD_SECRET_KEY

  if (!expectedKey) {
    console.warn('DASHBOARD_SECRET_KEY is not configured')
    return false
  }

  return apiKey === expectedKey
}

/**
 * Middleware для защиты API endpoints с помощью API Key
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const authResponse = requireApiKey(request);
 *   if (authResponse) return authResponse;
 *
 *   // Ваша логика API здесь
 * }
 * ```
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or missing API key. Include X-Dashboard-Secret header.',
      },
      { status: 401 },
    )
  }

  return null
}

/**
 * Wrapper функция для защиты API route handler с помощью API Key
 *
 * @example
 * ```ts
 * export const GET = withApiKey(async (request: NextRequest) => {
 *   // Ваша логика API здесь
 *   return NextResponse.json({ data: 'protected' });
 * });
 * ```
 */
export function withApiKey(handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: unknown) => {
    const authResponse = requireApiKey(request)
    if (authResponse) {
      return authResponse
    }

    return handler(request, context)
  }
}
