import { buildIntlMatcher } from '@letar/i18n-proxy'
import createIntlMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Next.js 16 Proxy
 *
 * Совмещает i18n routing через next-intl.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes — пропускаем intl middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  return intlMiddleware(request)
}

export default proxy

export const config = {
  matcher: buildIntlMatcher({
    excludePrefixes: ['api', '_next', '_vercel'],
    // icon.svg отдаётся на /icon без расширения — тот же класс бага, что и apple-icon,
    // но раньше не был замечен (см. libs/i18n-proxy — findUndeclaredMetadataRoutes его ловит)
    metadataRoutes: ['icon', 'apple-icon'],
  }),
}
