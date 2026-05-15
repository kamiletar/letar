import createIntlMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Next.js 16 proxy: пропускаем API через intl middleware (auth — в /api/auth/*),
 * для всего остального применяем i18n routing. Auth-проверка маршрутов /profile, /admin
 * вынесена в layout-компоненты этих сегментов (Better Auth не работает в Edge).
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Cast: bun-cache содержит несколько версий next (16.1.7 / 16.2.3), и NextRequest
  // приходит из 16.1.7, а next-intl ожидает 16.2.3. На рантайме это один и тот же класс.
  return intlMiddleware(request as never)
}

export default proxy

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
