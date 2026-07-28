import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createConsentRoute } from '@letar/consent'

export const POST = createConsentRoute({
  getUserId: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  },
  saveConsentLog: (data) => prisma.consentLog.create({ data }),
})
