import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /auth/post-login
 *
 * Промежуточный route после входа через соцсети (Google/VK/Яндекс).
 *
 * Проблема: callbackURL с вложенными OIDC-параметрами
 * (`/api/auth/oauth2/authorize?client_id=X&redirect_uri=https://...&state=Y`)
 * не выживает в цепочке редиректов через внешний OAuth из-за двойного
 * кодирования спецсимволов. Email/password не проходит внешний редирект,
 * поэтому у него этой проблемы нет.
 *
 * Решение: соцсети всегда редиректят сюда (`callbackUrl="/auth/post-login"`),
 * а OIDC-параметры хранятся в httpOnly cookie `oidc_pending`, установленной
 * на странице /sign-in (Server Component). Здесь мы читаем cookie и
 * перенаправляем на /api/auth/oauth2/authorize с исходными параметрами.
 *
 * Flow:
 * 1. /sign-in с OIDC params → cookie oidc_pending = base64(JSON(params))
 * 2. Пользователь логинится через Google/VK/Яндекс
 * 3. Better Auth после callback → redirect /auth/post-login
 * 4. Здесь: читаем cookie → redirect /api/auth/oauth2/authorize?<params>
 * 5. OIDC authorize видит сессию → redirect обратно на клиентский сайт ✅
 */
export async function GET() {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3014'

  // Проверяем сессию — если нет, отправляем на логин
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', baseUrl))
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('oidc_pending')

  if (pending?.value) {
    try {
      const oidcParams = JSON.parse(Buffer.from(pending.value, 'base64').toString('utf-8')) as Record<string, string>
      const qs = new URLSearchParams(oidcParams).toString()

      // Удаляем cookie (одноразовая) и редиректим на OIDC authorize
      const response = NextResponse.redirect(new URL(`/api/auth/oauth2/authorize?${qs}`, baseUrl))
      response.cookies.delete('oidc_pending')
      return response
    } catch {
      // Повреждённая cookie — просто идём на главную
    }
  }

  // Нет OIDC контекста — обычный вход на Ключницу
  return NextResponse.redirect(new URL('/', baseUrl))
}
