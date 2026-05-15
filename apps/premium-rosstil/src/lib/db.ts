import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Re-export commonly used types and enums from Prisma
export type * from '@/generated/prisma'

/**
 * Lazy singleton для ZenStack ORM Client
 * Решает проблему когда process.env.DATABASE_URL не загружен в момент импорта модуля
 * (актуально для Next.js standalone build в Docker)
 */

let orm: InstanceType<typeof ZenStackClient<typeof schema>> | null = null

function getOrm() {
  if (!orm) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
          'Please check your .env file or Docker environment configuration.'
      )
    }

    orm = new ZenStackClient(schema, {
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          // Лимиты connection pool для предотвращения утечек памяти
          max: 20, // Максимум соединений в пуле
          idleTimeoutMillis: 30000, // Закрывать idle соединения через 30 секунд
          connectionTimeoutMillis: 5000, // Таймаут подключения 5 секунд
        }),
      }),
    })
  }
  return orm
}

/**
 * Базовый ORM клиент без политик доступа
 * Используй для системных операций (auth, cron jobs)
 *
 * @example
 * ```ts
 * import { getPrisma } from '@/lib/db'
 * const users = await getPrisma().user.findMany()
 * ```
 */
export function getPrisma() {
  return getOrm()
}

/**
 * Базовый ORM клиент (proxy для обратной совместимости)
 * @deprecated Используй getPrisma() для явной lazy инициализации
 */
export const prisma = new Proxy(
  {},
  {
    get(_, prop) {
      return Reflect.get(getOrm(), prop)
    },
  }
) as ReturnType<typeof getOrm>

/**
 * Get an enhanced Prisma Client with ZenStack access control policies applied.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 *
 * @param user - The authenticated user from NextAuth session (or null for anonymous)
 * @returns Enhanced PrismaClient that automatically enforces access policies from schema.zmodel
 *
 * @example
 * ```ts
 * import { getSession } from '@/lib/auth'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * const session = await getSession()
 * const db = getEnhancedPrisma(session?.user)
 *
 * // This query will automatically enforce access policies
 * const users = await db.user.findMany()
 * ```
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'role'> | null) {
  return getOrm()
    .$use(new PolicyPlugin())
    .$setAuth(user ?? undefined)
}
