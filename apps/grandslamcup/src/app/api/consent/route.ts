import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createConsentRoute } from '@letar/consent'

export const POST = createConsentRoute({
  getUserId: async () => {
    const session = await getSession()
    return session?.user?.id ?? null
  },
  saveConsentLog: (data) => prisma.consentLog.create({ data }),
})
