import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { parsePostgresUrl } from '@letar/pg-url'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Re-export commonly used types
export type * from '@/generated/prisma'
export { Prisma } from '@/generated/prisma'

/**
 * ZenStack v3 ORM Client для PostgreSQL
 *
 * Pool настройки оптимизированы для production:
 * - max: 10 — достаточно для небольшого приложения
 * - idleTimeoutMillis: 30000 — освобождаем idle connections через 30 сек
 * - connectionTimeoutMillis: 5000 — таймаут на подключение
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      ...parsePostgresUrl(process.env.DATABASE_URL),
      max: 10, // Максимум 10 соединений в пуле
      idleTimeoutMillis: 30000, // Закрывать idle соединения через 30 сек
      connectionTimeoutMillis: 5000, // Таймаут подключения 5 сек
    }),
  }),
})

// Алиас для совместимости с кодом, использующим prisma
export const prisma = orm

/**
 * Get an enhanced ORM Client with ZenStack access control policies applied.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'role'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
