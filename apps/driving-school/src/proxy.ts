import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Next.js 16 Proxy
 *
 * Примечание: Better Auth не работает в Edge Runtime.
 * Проверка авторизации перенесена в layout компоненты.
 *
 * @see apps/driving-school/src/app/(protected)/layout.tsx
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth API routes — пропускаем
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Публичные страницы авторизации
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/privacy',
    '/terms',
    '/about',
    '/contacts',
    '/instructors',
    '/schools',
    '/join-instructor',
    '/join-school',
  ]

  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  // Пропускаем публичные пути
  if (isPublicPath || pathname === '/') {
    return NextResponse.next()
  }

  // Все остальные маршруты пропускаем
  // Детальная проверка авторизации выполняется в layout компонентах
  return NextResponse.next()
}

export default proxy

export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images/ (static images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/).*)',
  ],
}
