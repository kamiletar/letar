/**
 * Dev-only endpoint для создания сессии без OIDC Ключницы.
 * Используется для preview-верификации в браузере, т.к. дашборд входит только через
 * `genericOAuth('letar-auth')` (см. `@letar/auth/server` `createDevSessionRoute` — двойная
 * защита `ALLOW_DEV_SESSION` + `DEV_SESSION_TOKEN`, т.к. `NODE_ENV` в production-билде Next.js
 * всегда `'production'` и не годится как индикатор окружения).
 *
 * GET /api/auth/dev-session?token=<DEV_SESSION_TOKEN>&redirect=/deps
 */

import { prismaAuth } from '@/lib/prisma'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma: prismaAuth,
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  defaultEmail: 'dev-admin@letar.best',
  defaultRedirect: '/',
  // Dashboard.User.role — одиночный enum UserRole (ADMIN/USER/VIEWER), не массив ролей
  buildUserData: () => ({ role: 'ADMIN' }),
})
