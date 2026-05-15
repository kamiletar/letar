import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Re-export типов
export type * from '@/generated/prisma'

/**
 * ZenStack v3 ORM Client для PostgreSQL
 */
const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }) as never,
})

/**
 * Raw ORM client без access control policies.
 * Используй для публичных данных.
 * Для защищённых операций используй getEnhancedPrisma().
 */
export const prisma = orm

/**
 * Enhanced ORM Client с access control policies.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'roles'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
