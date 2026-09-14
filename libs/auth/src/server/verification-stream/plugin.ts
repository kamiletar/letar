import { createAuthMiddleware, isAPIError } from 'better-auth/api'
import { createVerificationStreamToken } from './stream-token'

/** Имя httpOnly-cookie с подписанным токеном SSE-потока подтверждения email (R5 PLAN_EMAIL_CODE.md). */
export const VERIFICATION_STREAM_COOKIE = 'letar.verification_stream'

export interface VerificationStreamCookieOptions {
  /** Имя cookie. По умолчанию {@link VERIFICATION_STREAM_COOKIE}. */
  cookieName?: string
  /** Срок жизни cookie и подписанного в ней токена, секунды. По умолчанию 1800 (30 минут). */
  ttlSec?: number
}

interface SignUpEmailResponse {
  user?: { email?: string }
}

/** matcher хука — вынесен отдельно, чтобы тестироваться без поднятия `betterAuth()`. */
export function verificationStreamMatcher(ctx: { path?: string }): boolean {
  return ctx.path === '/sign-up/email' || ctx.path === '/send-verification-email'
}

/**
 * Мини-реплика `getEndpointResponse` из `better-auth/dist/utils/plugin-helper.mjs` — сам
 * хелпер не публичный (не в `exports` пакета), а логика достаточно простая, чтобы не тащить
 * deep-import во внутренности зависимости.
 */
async function getSignUpEmailResponse(ctx: { context: { returned?: unknown } }): Promise<SignUpEmailResponse | null> {
  const returned = ctx.context.returned
  if (!returned) {
    return null
  }
  if (returned instanceof Response) {
    if (returned.status !== 200) {
      return null
    }
    return (await returned.clone().json()) as SignUpEmailResponse
  }
  if (isAPIError(returned)) {
    return null
  }
  return returned as SignUpEmailResponse
}

interface VerificationStreamHookContext {
  path?: string
  context: { returned?: unknown; session?: { user?: { email?: string } } }
  body?: { email?: string }
}

/**
 * Извлекает email, для которого нужно поставить cookie потока — вынесено отдельно от
 * `createAuthMiddleware`, чтобы тестироваться напрямую без поднятия `betterAuth()`.
 */
export async function resolveVerificationStreamEmail(ctx: VerificationStreamHookContext): Promise<string | undefined> {
  if (ctx.path === '/sign-up/email') {
    return (await getSignUpEmailResponse(ctx))?.user?.email
  }
  return ctx.body?.email ?? ctx.context.session?.user?.email
}

/**
 * Better Auth плагин, ставящий httpOnly-cookie с подписанным токеном SSE-потока подтверждения
 * email — сразу после регистрации и после каждой повторной отправки письма верификации.
 *
 * ⚠️ Должен стоять в `plugins` **до** `nextCookies()` — иначе Set-Cookie не доедет из server
 * action (`nextCookies` форвардит только Set-Cookie плагинов, зарегистрированных выше себя).
 */
export function verificationStreamCookie(options: VerificationStreamCookieOptions = {}) {
  const { cookieName = VERIFICATION_STREAM_COOKIE, ttlSec = 1800 } = options

  return {
    id: 'letar-verification-stream',
    hooks: {
      after: [
        {
          matcher: verificationStreamMatcher,
          handler: createAuthMiddleware(async (ctx) => {
            const email = await resolveVerificationStreamEmail(ctx as unknown as VerificationStreamHookContext)

            if (!email) {
              return
            }

            const token = createVerificationStreamToken({ email, secret: ctx.context.secret, ttlSec })
            ctx.setCookie(cookieName, token, {
              httpOnly: true,
              sameSite: 'lax',
              path: '/api/auth/verification-stream',
              maxAge: ttlSec,
              secure: ctx.context.baseURL?.startsWith('https') ?? false,
            })
          }),
        },
      ],
    },
  }
}
