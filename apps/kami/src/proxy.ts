import { buildIntlMatcher } from '@letar/i18n-proxy'
import createIntlMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { routing } from './i18n/routing'

// Интернационализация middleware
const intlMiddleware = createIntlMiddleware(routing)

/**
 * Next.js 16 Proxy
 *
 * Совмещает:
 * 1. next-intl для i18n routing
 * 2. Better Auth routes handling
 *
 * Примечание: Проверка авторизации перенесена в layout компоненты,
 * так как Better Auth не поддерживает Edge runtime middleware.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes — пропускаем intl middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Применяем i18n middleware
  return intlMiddleware(request)
}

export default proxy

export const config = {
  matcher: buildIntlMatcher({
    excludePrefixes: ['trpc', '_next', '_vercel', 'keystatic'],
    // icon.svg — metadata-роут Next.js, отдаётся на /icon без расширения (см. libs/i18n-proxy)
    metadataRoutes: ['icon'],
  }),
}
