import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

/**
 * Lazy-initialized PrismaClient with pg adapter (Prisma 7).
 *
 * Передаём connectionString напрямую, а не готовый `new Pool()` — в bun-хостинге
 * монорепо параллельно установлено несколько версий `pg` (hoisting), и наш экземпляр
 * Pool мог быть создан ДРУГОЙ версией `pg`, чем та, что резолвится внутри
 * @prisma/adapter-pg. instanceof-проверка внутри адаптера тогда не проходит, он не
 * распознаёт наш Pool и тихо создаёт свой без connectionString (дефолт localhost) —
 * инцидент 2026-07-12, /products 500 с обманчивым ECONNREFUSED (реальная причина
 * маскируется внутри performIO, см. github.com/prisma/prisma/issues/28055).
 */
function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  return globalForPrisma.prisma
}

/** Shorthand — use in Server Components and Server Actions */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
