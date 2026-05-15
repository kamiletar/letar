import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Стандартный Prisma Client для Better Auth adapter
 *
 * Используется отдельно от ZenStack ORM (db.ts) потому что:
 * - Better Auth требует нативный PrismaClient для своего adapter'а
 * - ZenStack v3 ORM использует Kysely под капотом и не совместим с prismaAdapter
 *
 * Prisma 7 требует driver adapter — url в schema.prisma больше не поддерживается.
 * Используем ленивую инициализацию через Proxy — Turbopack выполняет top-level
 * код при сборке, что приводит к ошибке "Cannot read properties of undefined".
 */

let _prismaAuth: PrismaClient | null = null

export function getPrismaAuth(): PrismaClient {
  if (!_prismaAuth) {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
    _prismaAuth = new PrismaClient({ adapter })
  }
  return _prismaAuth
}

export const prismaAuth = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaAuth() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
