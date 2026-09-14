/**
 * SSE-поток «email подтверждён в другой вкладке» (PLAN_EMAIL_CODE.md, Фаза A/0.3).
 *
 * Сырой `prisma` (не enhanced) — политика доступа `User` не даёт прочитать чужую запись,
 * а этому роуту нужно проверять emailVerified произвольного пользователя по подписанному
 * cookie-токену, не по текущей сессии.
 */
import { prisma } from '@/lib/db'
import { createVerificationStreamRoute } from '@letar/auth/server'

export const dynamic = 'force-dynamic'

export const { GET } = createVerificationStreamRoute({
  secret: () => process.env.BETTER_AUTH_SECRET ?? '',
  isEmailVerified: async (email) => {
    const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } })
    return !!user?.emailVerified
  },
})
