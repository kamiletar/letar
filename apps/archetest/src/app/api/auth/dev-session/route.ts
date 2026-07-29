/**
 * Dev-only endpoint для создания сессии без OIDC-редиректа через Ключницу.
 * Используется e2e-тестами на staging (см. `@letar/auth/server` `createDevSessionRoute` —
 * двойная защита `ALLOW_DEV_SESSION` + `DEV_SESSION_TOKEN`, т.к. `NODE_ENV` в production-билде
 * Next.js всегда `'production'` и не годится как индикатор окружения).
 *
 * GET /api/auth/dev-session?email=e2e-safety-net@archetest.test&token=<DEV_SESSION_TOKEN>
 */

import { prisma } from '@/lib/db'
import { createDevSessionRoute } from '@letar/auth/server'

export const GET = createDevSessionRoute({
  prisma,
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  defaultEmail: 'e2e-dev-session@archetest.test',
  defaultRedirect: '/ru',
  // disclaimerAccepted:false — дефолт схемы (@default(false)) — блокирует старт квиза
  // на экране дисклеймера (quiz-intro.tsx); фикстурам e2e он не нужен.
  buildUserData: () => ({
    roles: ['USER'],
    disclaimerAccepted: true,
  }),
})
