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
 * Примечание: Better Auth не работает в Edge Runtime.
 * Проверка авторизации перенесена в layout компоненты.
 *
 * @see apps/mandala/src/app/(admin)/admin/layout.tsx
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes — пропускаем intl middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Админ-панель — пропускаем intl middleware (остаётся только на русском)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Применяем i18n middleware для остальных маршрутов
  return intlMiddleware(request)
}

export default proxy

export const config = {
  // Исключаем из обработки:
  // - /api (API routes)
  // - /_next, /_vercel (системные)
  // - Файлы со точкой (favicon.ico, robots.txt и т.д.)
  // - /admin (админ-панель без i18n)
  matcher: '/((?!api|_next|_vercel|admin|.*\\..*).*)',
}
