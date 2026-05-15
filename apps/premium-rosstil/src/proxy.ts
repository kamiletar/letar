import createIntlMiddleware from 'next-intl/middleware'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { auth } from './lib/auth'

// Создаём middleware для интернационализации
const handleI18nRouting = createIntlMiddleware(routing)

// Регулярное выражение для извлечения локали из пути
const localePattern = new RegExp(`^/(${routing.locales.join('|')})(?:/|$)`)

type UserRole = 'USER' | 'ADMIN'

/**
 * Извлекает путь без локали для проверки защищённых роутов
 * /ru/admin/users -> /admin/users
 * /admin/users -> /admin/users
 */
function getPathWithoutLocale(pathname: string): string {
  const match = pathname.match(localePattern)
  if (match) {
    const locale = match[1]
    return pathname.slice(locale.length + 1) || '/'
  }
  return pathname
}

/**
 * Проверяет, является ли путь защищённым (требует аутентификации)
 */
function isProtectedPath(pathname: string): boolean {
  const pathWithoutLocale = getPathWithoutLocale(pathname)
  return (
    pathWithoutLocale.startsWith('/admin') ||
    pathWithoutLocale.startsWith('/profile') ||
    pathWithoutLocale.startsWith('/auth')
  )
}

/**
 * Основная функция proxy, объединяющая i18n и auth
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Сначала обрабатываем i18n (редиректы и rewrite для локали)
  const i18nResponse = handleI18nRouting(request)

  // Если i18n вернул редирект - выполняем его
  if (i18nResponse.status !== 200) {
    return i18nResponse
  }

  // Для защищённых путей проверяем аутентификацию
  if (isProtectedPath(pathname)) {
    // Получаем сессию из Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    const isLoggedIn = !!session?.user
    const userRole = (session?.user as { role?: UserRole } | undefined)?.role

    const pathWithoutLocale = getPathWithoutLocale(pathname)
    const isOnAuthPage = pathWithoutLocale.startsWith('/auth')
    const isOnAdminPage = pathWithoutLocale.startsWith('/admin')
    const isOnProfilePage = pathWithoutLocale.startsWith('/profile')

    // Определяем текущую локаль для редиректов
    const localeMatch = pathname.match(localePattern)
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale

    if (isOnAuthPage) {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url))
      }
      return i18nResponse
    }

    if (isOnAdminPage) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url))
      }
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL(`/${locale}`, request.url))
      }
      return i18nResponse
    }

    if (isOnProfilePage) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url))
      }
      return i18nResponse
    }
  }

  // Для публичных страниц возвращаем i18n response
  return i18nResponse
}

export default proxy

export const config = {
  // Обрабатывать все пути кроме:
  // - /api, /trpc, /_next, /_vercel
  // - файлы со статическими расширениями (favicon.ico, robots.txt, etc.)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
