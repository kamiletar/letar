import { auth } from '@/lib/auth-config'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Защищённые пути по ролям
 */
const clientPaths = ['/my-profile', '/diagnostics', '/plan', '/practices', '/progress']
const specialistPaths = ['/clients', '/sessions', '/plans', '/analytics']
const adminPaths = ['/users', '/specialists', '/settings']
const authPaths = ['/sign-in', '/sign-up']
const protectedPaths = ['/dashboard', '/profile']

type UserRole = 'CLIENT' | 'SPECIALIST' | 'ADMIN'

/**
 * Проверка доступа к защищённым роутам
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Получаем сессию из Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isLoggedIn = !!session?.user
  const userRole = (session?.user as { role?: UserRole } | undefined)?.role

  // Auth страницы с сессией → редирект на dashboard
  const isOnAuthPage = authPaths.some((path) => pathname.startsWith(path))
  if (isOnAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Страницы для специалистов
  // ВАЖНО: /plan (singular) для клиентов, /plans (plural) для специалистов
  const isOnSpecialistPage = specialistPaths.some((path) => pathname.startsWith(path))
  if (isOnSpecialistPage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    if (userRole !== 'SPECIALIST' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Страницы для клиентов
  const isOnClientPage = clientPaths.some((path) => {
    // /plan для клиентов, но не /plans
    if (path === '/plan') {
      return pathname.startsWith('/plan') && !pathname.startsWith('/plans')
    }
    return pathname.startsWith(path)
  })
  if (isOnClientPage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    if (userRole !== 'CLIENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Страницы для администраторов
  const isOnAdminPage = adminPaths.some((path) => pathname.startsWith(path))
  if (isOnAdminPage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Общие защищённые страницы (dashboard, profile)
  const isOnProtectedPage = protectedPaths.some((path) => pathname.startsWith(path))
  if (isOnProtectedPage && !isLoggedIn) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
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
