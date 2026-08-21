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
 * Примечание: Проверка авторизации перенесена в layout компоненты,
 * так как Better Auth не поддерживает Edge runtime middleware.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes — пропускаем intl middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Применяем i18n middleware
  return intlMiddleware(request)
}

export default proxy

// ⚠️ matcher — литерал, не вызов buildIntlMatcher(). Next.js статически парсит `config.matcher`
// через AST (без исполнения модуля) для построения routes-manifest — `CallExpression` он не
// умеет разворачивать: "Unsupported node type "CallExpression" at "config.matcher"", билд падает
// на "Invalid segment configuration export detected" (см. .claude/docs/nextjs-standalone-tracing.md
// или сообщение в agent-mail e2e-gate-status-form-example-kami от 2026-08-21).
// Значение сгенерировано buildIntlMatcher({ excludePrefixes: ['trpc', '_next', '_vercel', 'keystatic'],
// metadataRoutes: ['icon'] }) — дрейф литерала от опций ловит proxy.spec.ts.
export const config = {
  matcher: ['/((?!trpc|_next|_vercel|keystatic|icon|.*\\..*).*)', '/'],
}
