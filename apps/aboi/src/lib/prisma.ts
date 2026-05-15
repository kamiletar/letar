import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Стандартный Prisma Client для Better Auth adapter.
 *
 * Используется отдельно от ZenStack ORM (db.ts), потому что:
 * - Better Auth требует нативный PrismaClient для своего prismaAdapter
 * - ZenStack v3 ORM использует Kysely под капотом и несовместим с prismaAdapter
 *
 * Prisma 7 требует driver adapter для подключения к БД (@prisma/adapter-pg).
 * Singleton через globalThis — избегаем множественных подключений в dev (HMR).
 */
const globalForPrisma = globalThis as unknown as {
  prismaAuth: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
  return new PrismaClient({ adapter })
}

export const prismaAuth = globalForPrisma.prismaAuth ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAuth = prismaAuth
}
