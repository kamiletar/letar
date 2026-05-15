import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Next.js 16 Proxy для IMOT
 *
 * Минимальный proxy, добавляет x-pathname header.
 * Защита роутов выполняется в Server Components через getSession().
 *
 * ПРИМЕЧАНИЕ: В Next.js 16 proxy работает на Node.js runtime (не Edge),
 * но защиту роутов лучше делать в layout.tsx для каждой группы.
 */
export function proxy(request: NextRequest) {
  // Добавляем pathname в headers для доступа в серверных компонентах
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
