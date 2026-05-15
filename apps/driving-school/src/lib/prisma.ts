import { PrismaClient } from '@letar/driving-school-db/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Стандартный Prisma Client для Better Auth adapter
 *
 * Используется отдельно от ZenStack ORM (db.ts) потому что:
 * - Better Auth требует нативный PrismaClient для своего adapter'а
 * - ZenStack v3 ORM использует Kysely под капотом и не совместим с prismaAdapter
 *
 * Prisma 7 требует driver adapter для подключения к БД.
 * Ленивая инициализация для корректной работы при build time.
 */

// Глобальный singleton для избежания множественных подключений в dev mode
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
