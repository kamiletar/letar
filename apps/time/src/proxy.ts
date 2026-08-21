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
// умеет разворачивать: "Next.js can't recognize the exported `config` field in route", билд
// падает на "matcher needs to be a static string or array of static strings" (см.
// .claude/docs/nextjs-standalone-tracing.md и коммит 6655f165 — тот же фикс в apps/kami).
// Значение сгенерировано buildIntlMatcher({ excludePrefixes: ['api', '_next', '_vercel'],
// metadataRoutes: ['icon'] }) — дрейф литерала от опций ловит proxy.spec.ts.
export const config = {
  matcher: ['/((?!api|_next|_vercel|icon|.*\\..*).*)', '/'],
}
