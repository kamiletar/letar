/**
 * Dev-only endpoint для создания сессии без OIDC.
 * Используется для preview-верификации и e2e тестов на staging (см. `@letar/auth/server`
 * `createDevSessionRoute` — двойная защита `ALLOW_DEV_SESSION` + `DEV_SESSION_TOKEN`,
 * т.к. `NODE_ENV` в production-билде Next.js всегда `'production'` и не годится как индикатор
 * окружения).
 *
 * GET /api/auth/dev-session?email=admin@auth.letar.best&token=<DEV_SESSION_TOKEN>
 */

import { prisma } from '@/lib/db'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma,
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  defaultEmail: 'admin@auth.letar.best',
  defaultRedirect: '/admin',
  buildUserData: (email) => ({
    roles: email.includes('admin') ? ['ADMIN', 'USER'] : ['USER'],
  }),
})
