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
// ⚠️ Пароль в DATABASE_URL генерируется через `openssl rand -base64 32` (см. security.md) —
// алфавит base64 содержит `/` и `+`. Необработанный `/` перед `@` ломает разбор connectionString
// через `new URL()` внутри pg-connection-string (используется и adapter-pg при передаче строки).
// Разбираем строку вручную и передаём поля отдельным объектом — PrismaPg принимает как
// connectionString, так и { host, port, user, password, database } без создания Pool напрямую.
function parsePostgresUrl(url: string) {
  const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([\s\S]+)@([^@/:]+):(\d+)\/([^?]+)/)
  if (!match) {
    throw new Error('DATABASE_URL: не удалось распарсить (ожидается postgresql://user:password@host:port/db)')
  }
  const [, user, password, host, port, database] = match
  return { user: decodeURIComponent(user), password: decodeURIComponent(password), host, port: Number(port), database }
}

function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL не задан')
    }
    const adapter = new PrismaPg(parsePostgresUrl(process.env.DATABASE_URL))
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
