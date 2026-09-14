import { VERIFICATION_STREAM_COOKIE } from './plugin'
import { readVerificationStreamToken } from './stream-token'

const DEFAULT_POLL_MS = 2000
const DEFAULT_HEARTBEAT_MS = 15000
const DEFAULT_TIMEOUT_MS = 300000

export interface CreateVerificationStreamRouteOptions {
  /** Секрет для проверки подписи cookie-токена (тот же, что передан `createAuth`/плагину). */
  secret: string | (() => string)
  /** Проверяет, подтверждён ли email — единственный источник правды о статусе. */
  isEmailVerified: (email: string) => Promise<boolean>
  /** Имя cookie. По умолчанию {@link VERIFICATION_STREAM_COOKIE}. */
  cookieName?: string
  /** Интервал опроса `isEmailVerified`, мс. По умолчанию 2000. */
  pollMs?: number
  /** Интервал heartbeat-комментария, мс. По умолчанию 15000. */
  heartbeatMs?: number
  /** Таймаут потока, мс. По умолчанию 300000 (5 минут). */
  timeoutMs?: number
}

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null
  }
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) {
      continue
    }
    const key = part.slice(0, eq).trim()
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return null
}

/**
 * Фабрика Next.js Route Handler для SSE-потока подтверждения email (§13.1/R4-R5
 * PLAN_EMAIL_CODE.md). Приложение оборачивает вызов и само ставит
 * `export const dynamic = 'force-dynamic'` — фабрика этого сделать не может.
 */
export function createVerificationStreamRoute(options: CreateVerificationStreamRouteOptions): {
  GET: (request: Request) => Promise<Response>
} {
  const {
    secret,
    isEmailVerified,
    cookieName = VERIFICATION_STREAM_COOKIE,
    pollMs = DEFAULT_POLL_MS,
    heartbeatMs = DEFAULT_HEARTBEAT_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  async function GET(request: Request): Promise<Response> {
    const resolvedSecret = typeof secret === 'function' ? secret() : secret
    const token = readCookieValue(request.headers.get('cookie'), cookieName)
    const parsed = token ? readVerificationStreamToken(token, { secret: resolvedSecret }) : null

    if (!parsed) {
      return new Response(null, { status: 401 })
    }

    const { email } = parsed

    const alreadyVerified = await isEmailVerified(email).catch((err) => {
      console.error('[verification-stream] isEmailVerified упал:', err)
      return false
    })

    if (alreadyVerified) {
      const body = `data: ${JSON.stringify({ verified: true })}\n\n`
      return new Response(body, { headers: sseHeaders() })
    }

    const encoder = new TextEncoder()
    let closed = false
    let pollTimer: ReturnType<typeof setInterval> | undefined
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined

    const stream = new ReadableStream({
      start(controller) {
        const cleanup = () => {
          if (closed) {
            return
          }
          closed = true
          clearInterval(pollTimer)
          clearInterval(heartbeatTimer)
          clearTimeout(timeoutTimer)
        }

        const safeEnqueue = (chunk: string) => {
          if (closed) {
            return
          }
          try {
            controller.enqueue(encoder.encode(chunk))
          } catch {
            cleanup()
          }
        }

        const safeClose = () => {
          if (closed) {
            return
          }
          cleanup()
          try {
            controller.close()
          } catch {
            // уже закрыт получателем
          }
        }

        request.signal.addEventListener('abort', cleanup)

        safeEnqueue(': connected\n\n')

        heartbeatTimer = setInterval(() => {
          safeEnqueue(': heartbeat\n\n')
        }, heartbeatMs)

        pollTimer = setInterval(async () => {
          if (closed) {
            return
          }
          const verified = await isEmailVerified(email).catch((err) => {
            console.error('[verification-stream] isEmailVerified упал:', err)
            return false
          })
          if (verified) {
            safeEnqueue(`data: ${JSON.stringify({ verified: true })}\n\n`)
            safeClose()
          }
        }, pollMs)

        timeoutTimer = setTimeout(() => {
          safeEnqueue('event: timeout\ndata: {}\n\n')
          safeClose()
        }, timeoutMs)
      },
      cancel() {
        closed = true
        clearInterval(pollTimer)
        clearInterval(heartbeatTimer)
        clearTimeout(timeoutTimer)
      },
    })

    return new Response(stream, { headers: sseHeaders() })
  }

  return { GET }
}

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}
