import createIntlMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Next.js 16 Proxy — i18n routing
 */
export function proxy(request: NextRequest) {
  return intlMiddleware(request)
}

export default proxy

// ⚠️ matcher — литерал, не вызов buildIntlMatcher(). Next.js статически парсит `config.matcher`
// через AST (без исполнения модуля) для построения routes-manifest — `CallExpression` он не
// умеет разворачивать: "Unsupported node type "CallExpression" at "config.matcher"", билд падает
// на "Invalid segment configuration export detected" (см. .claude/docs/nextjs-standalone-tracing.md
// или образцовый фикс в apps/kami/src/proxy.ts, commit 6655f165).
// Значение сгенерировано buildIntlMatcher({ excludePrefixes: ['api', '_next', '_vercel'] }) —
// дрейф литерала от опций ловит proxy.spec.ts.
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
}
