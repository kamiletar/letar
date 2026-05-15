import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Стандартный Prisma Client для Better Auth adapter и rate limiting
 *
 * Используется отдельно от ZenStack ORM (db.ts) потому что:
 * - Better Auth требует нативный PrismaClient для своего adapter'а
 * - ZenStack v3 ORM использует Kysely под капотом и не совместим с prismaAdapter
 *
 * Prisma 7 требует driver adapter для подключения к БД.
 * Lazy initialization нужна для корректной работы с Turbopack production build.
 */
let _prismaAuth: PrismaClient | null = null

export function getPrismaAuth(): PrismaClient {
  if (!_prismaAuth) {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
    _prismaAuth = new PrismaClient({ adapter })
  }
  return _prismaAuth
}

// Обратная совместимость — Proxy для замены прямого обращения к prismaAuth
export const prismaAuth = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaAuth() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
