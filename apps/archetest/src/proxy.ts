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
  // Пропускаем API, статику и Next.js внутренние пути
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
