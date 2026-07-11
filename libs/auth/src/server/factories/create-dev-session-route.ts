import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

/**
 * Минимальный контракт Prisma-клиента, нужный dev-session роуту.
 * Совместим и с чистым Prisma, и с enhanced-клиентом ZenStack.
 */
export interface DevSessionPrismaClient {
  user: {
    // Method-синтаксис (не arrow-function тип) — TS проверяет параметры бивариантно, что
    // позволяет присвоить сюда строго типизированный ZenStack/Prisma клиент приложения.
    findUnique(args: { where: { email: string } }): Promise<{ id: string } | null>
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>
  }
  session: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
}

export interface CreateDevSessionRouteOptions {
  /** Prisma/ZenStack клиент приложения */
  prisma: DevSessionPrismaClient
  /** `BETTER_AUTH_SECRET` приложения — тем же ключом Better Auth проверяет cookie */
  authSecret: string
  /** Email по умолчанию, если query-параметр `email` не передан */
  defaultEmail: string
  /** Путь редиректа по умолчанию */
  defaultRedirect?: string
  /** Название cookie сессии Better Auth (по умолчанию `better-auth.session_token`) */
  cookieName?: string
  /** Кастомизация полей нового User при первом создании фикстуры */
  buildUserData?: (email: string) => Record<string, unknown>
}

/**
 * Определяет base URL для построения редиректа/cookie-домена по внешним заголовкам, а не по
 * `request.url` — за Docker port-forward и reverse-proxy (NPM) `request.url` резолвится во
 * внутренний bind-адрес контейнера (`http://0.0.0.0:<port>/...`, Next.js standalone слушает
 * `0.0.0.0`), не в клиентский host:port. Редирект на `0.0.0.0` браузер закономерно не может
 * открыть (`ERR_CONNECTION_REFUSED`), хотя cookie сессии к этому моменту уже установлена.
 */
function resolveBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  if (!host) {
    return request.url
  }
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const proto = forwardedProto ?? new URL(request.url).protocol.replace(':', '')
  return `${proto}://${host}`
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Всё равно прогоняем сравнение постоянной длины, чтобы не палить длину секрета таймингом
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/**
 * Фабрика dev-only роута для создания сессии без OIDC/пароля — для e2e-тестов и preview-аудита
 * на staging-окружениях (собранных production-билдом Next.js, где `NODE_ENV` всегда `'production'`
 * и не годится как индикатор окружения).
 *
 * Двойная защита от случайного открытия на реальном проде:
 * 1. `process.env.ALLOW_DEV_SESSION === 'true'` — явный флаг, должен жить **только** в
 *    `.env.staging`, никогда в `.env.docker`/`.env.docker.enc` (см. `.claude/rules/env-files.md`).
 * 2. `process.env.DEV_SESSION_TOKEN` — секретный токен, сравнивается constant-time с параметром
 *    `token` в query/заголовке `x-dev-session-token`. Если `ALLOW_DEV_SESSION=true` случайно
 *    просочится в прод-конфиг (копипаста, утечка `.env.staging`), роут всё равно не откроется без
 *    знания токена — токен генерируется отдельно и не путешествует вместе с флагом.
 *
 * @example
 * ```typescript
 * // apps/my-app/src/app/api/auth/dev-session/route.ts
 * import { createDevSessionRoute } from '@letar/auth/server'
 * import { prisma } from '@/lib/db'
 *
 * export const GET = createDevSessionRoute({
 *   prisma,
 *   authSecret: process.env.BETTER_AUTH_SECRET ?? '',
 *   defaultEmail: 'admin@my-app.ru',
 *   defaultRedirect: '/admin',
 *   buildUserData: (email) => ({ roles: email.includes('admin') ? ['ADMIN', 'USER'] : ['USER'] }),
 * })
 * ```
 */
export function createDevSessionRoute(options: CreateDevSessionRouteOptions) {
  const { prisma, authSecret, defaultEmail, defaultRedirect = '/', cookieName = 'better-auth.session_token' } = options

  return async function GET(request: Request): Promise<Response> {
    if (process.env.ALLOW_DEV_SESSION !== 'true') {
      return NextResponse.json({ error: 'Not available' }, { status: 403 })
    }

    const expectedToken = process.env.DEV_SESSION_TOKEN
    if (!expectedToken) {
      // Fail-closed: флаг включён, но токен не настроен — считаем конфигурацию неполной, а не открытой
      console.error('[dev-session] ALLOW_DEV_SESSION=true, но DEV_SESSION_TOKEN не задан — отказ')
      return NextResponse.json({ error: 'Not configured' }, { status: 403 })
    }

    const url = new URL(request.url)
    const providedToken = url.searchParams.get('token') ?? request.headers.get('x-dev-session-token') ?? ''
    if (!timingSafeEqualStr(providedToken, expectedToken)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const email = url.searchParams.get('email') || defaultEmail
    const redirect = url.searchParams.get('redirect') || defaultRedirect

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: email.split('@')[0],
          email,
          emailVerified: true,
          ...(options.buildUserData?.(email) ?? {}),
        },
      })
    }

    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: '127.0.0.1',
        userAgent: 'Claude Preview / E2E Test',
      },
    })

    // Формат подписи cookie идентичен тому, что использует Better Auth внутри (Hono signed cookie):
    // value = `${token}.${btoa(hmac(token, secret))}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(authSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionToken))
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    const signedValue = `${sessionToken}.${signatureB64}`

    const cookieValue = encodeURIComponent(signedValue)
    const maxAge = 7 * 24 * 60 * 60
    const response = NextResponse.redirect(new URL(redirect, resolveBaseUrl(request)))
    response.headers.append(
      'Set-Cookie',
      `${cookieName}=${cookieValue}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
    )

    return response
  }
}
