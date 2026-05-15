import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma Client для Better Auth
 *
 * Отдельный инстанс для auth, т.к. ZenStack ORM используется для бизнес-логики.
 * Better Auth требует стандартный PrismaClient.
 * Prisma 7 требует driver adapter для подключения к БД.
 *
 * Используем ленивую инициализацию через Proxy — Turbopack выполняет top-level
 * код при сборке, что приводит к ошибке "Cannot read properties of undefined (reading 'graph')".
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
