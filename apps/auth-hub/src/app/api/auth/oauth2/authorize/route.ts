import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import type { NextRequest } from 'next/server'

/**
 * Враппер OIDC authorize endpoint — сохраняет полные параметры в cookie перед BA.
 *
 * Проблема без враппера: BA при наличии сессии сразу редиректит на consent page
 * с урезанным набором (?client_id=...&consent_code=...&scope=...), теряя
 * redirect_uri / state / code_challenge / response_type. При "Сменить аккаунт"
 * на consent page нет данных для продолжения OIDC flow после нового логина.
 *
 * Решение: перехватываем authorize, кладём полные params в oidc_pending cookie
 * (тот же cookie, что OidcPendingCapture ставит для незалогиненных) — consent page
 * читает cookie и передаёт AccountChooser-у, тот строит корректный redirect.
 *
 * Next.js: статический маршрут /api/auth/oauth2/authorize имеет приоритет
 * над catch-all /api/auth/[...all].
 */

const { GET: baGET } = toNextJsHandler(auth)

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
    if (val) {oidcParams[key] = val}
  }

  const baResponse = await baGET(request)

  if (Object.keys(oidcParams).length === 0) {
    return baResponse
  }

  const cookieValue = Buffer.from(JSON.stringify(oidcParams)).toString('base64')
  const cookieParts = [
    `oidc_pending=${cookieValue}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ]

  const headers = new Headers(baResponse.headers)
  headers.append('Set-Cookie', cookieParts.join('; '))

  return new Response(baResponse.body, {
    status: baResponse.status,
    statusText: baResponse.statusText,
    headers,
  })
}
