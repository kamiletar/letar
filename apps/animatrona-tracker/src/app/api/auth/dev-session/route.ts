/**
 * Dev-only endpoint для создания сессии без OIDC.
 * Используется для e2e тестов (см. `@letar/auth/server` `createDevSessionRoute` — двойная защита
 * `ALLOW_DEV_SESSION` + `DEV_SESSION_TOKEN`, т.к. `NODE_ENV` в production-билде Next.js всегда
 * `'production'` и не годится как индикатор окружения).
 *
 * GET /api/auth/dev-session?email=admin@animatrona-tracker.letar.best&token=<DEV_SESSION_TOKEN>
 */

import { prismaAuth } from '@/lib/prisma'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma: prismaAuth,
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  defaultEmail: 'admin@animatrona-tracker.letar.best',
  defaultRedirect: '/admin',
  buildUserData: () => ({ role: 'ADMIN', emailVerified: true }),
})
