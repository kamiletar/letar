import { type NextRequest, NextResponse } from 'next/server'

/**
 * Route Handler для сохранения OIDC-параметров в cookie.
 *
 * cookies().set() запрещён в Server Components (Next.js 15+) —
 * только в Route Handlers и Server Actions.
 *
 * Поток: /sign-in?client_id=...
 *   → (redirect) /api/oidc-capture?client_id=...
 *   → (set cookie + redirect) /sign-in
 */

const OIDC_PARAMS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'nonce',
] as const

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const oidcParams: Record<string, string> = {}
  for (const key of OIDC_PARAMS) {
    const val = searchParams.get(key)
    if (val) {
      oidcParams[key] = val
    }
  }

  // request.url внутри Docker содержит http://0.0.0.0:3010/...
  // Используем BETTER_AUTH_URL чтобы редирект шёл на публичный домен
  const baseUrl = process.env.BETTER_AUTH_URL ?? request.url
  const signInUrl = new URL('/sign-in', baseUrl)
  const response = NextResponse.redirect(signInUrl)

  response.cookies.set('oidc_pending', Buffer.from(JSON.stringify(oidcParams)).toString('base64'), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
