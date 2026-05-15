import { auth } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Proxy configuration для Dashboard
 *
 * Защищает все страницы кроме публичных путей
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // === Authentication protection ===
  // Публичные пути (не требуют авторизации на уровне proxy)
  // API роуты проверяют сессию внутри и возвращают JSON 401/403
  const publicPaths = [
    '/auth',
    '/api/auth',
    '/api/servers', // Защита внутри роутов (JSON 401/403 вместо HTML редиректа)
    '/api/cron', // Cron endpoints используют X-Cron-Secret для авторизации
    '/api/monitoring/auto-start',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
  ]

  // Проверяем публичные пути
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Проверяем сессию через Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  // Если не авторизован — редирект на страницу входа
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Проверяем роль ADMIN — только админы могут пользоваться дашбордом
  const { prismaAuth } = await import('@/lib/prisma')
  const dbUser = await prismaAuth.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'VIEWER') {
    return NextResponse.redirect(new URL('/auth/denied', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
