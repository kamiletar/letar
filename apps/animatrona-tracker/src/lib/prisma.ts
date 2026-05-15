import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma Client для Better Auth
 *
 * Отдельный инстанс для auth, т.к. ZenStack ORM используется для бизнес-логики.
 * Better Auth требует стандартный PrismaClient.
 * Prisma 7 требует driver adapter для подключения к БД.
 */

const globalForPrisma = globalThis as unknown as { prismaAuth: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  return new PrismaClient({ adapter })
}

export const prismaAuth = globalForPrisma.prismaAuth || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAuth = prismaAuth
}
