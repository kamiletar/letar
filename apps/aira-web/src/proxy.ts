import { buildIntlMatcher } from '@letar/i18n-proxy'
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

export const config = {
  matcher: buildIntlMatcher({
    excludePrefixes: ['api', '_next', '_vercel'],
  }),
}
