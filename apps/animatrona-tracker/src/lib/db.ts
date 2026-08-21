import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Реэкспорт часто используемых типов и enum'ов из Prisma
export type * from '@/generated/prisma'
export { Prisma } from '@/generated/prisma'

// ⚠️ Пароль в DATABASE_URL генерируется через `openssl rand -base64 32` (см. security.md) —
// алфавит base64 содержит `/` и `+`. Необработанный `/` перед `@` ломает разбор строки через
// `new URL()` внутри pg-connection-string. Разбираем строку вручную и передаём поля отдельно.
function parsePostgresUrl(url: string) {
  const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([\s\S]+)@([^@/:]+):(\d+)\/([^?]+)/)
  if (!match) {
    throw new Error('DATABASE_URL: не удалось распарсить (ожидается postgresql://user:password@host:port/db)')
  }
  const [, user, password, host, port, database] = match
  return { user: decodeURIComponent(user), password: decodeURIComponent(password), host, port: Number(port), database }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

/**
 * ZenStack v3 ORM Client для PostgreSQL
 */
const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      ...parsePostgresUrl(process.env.DATABASE_URL),
      max: 20,
    }),
  }),
})

/**
 * Получить enhanced Prisma Client с политиками доступа ZenStack.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 *
 * @param user - Аутентифицированный пользователь из Better Auth сессии (или null для анонимного)
 * @returns Enhanced PrismaClient с автоматическим применением политик доступа из schema.zmodel
 *
 * @example
 * ```ts
 * import { getSession } from '@/lib/auth'
 * import { headers } from 'next/headers'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * const session = await auth.api.getSession({ headers: await headers() })
 * const db = getEnhancedPrisma(session?.user)
 *
 * // Запрос автоматически применит политики доступа
 * const contents = await db.content.findMany()
 * ```
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'role'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}

// Алиас для совместимости с кодом, использующим prisma
export const prisma = orm
