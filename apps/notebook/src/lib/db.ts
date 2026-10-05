import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { parsePostgresUrl } from '@letar/pg-url'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

export type * from '@/generated/prisma'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool(parsePostgresUrl(process.env.DATABASE_URL)),
  }) as never,
})

/**
 * Клиент без политик доступа. Только для Better Auth и публичных страниц сайта,
 * где код сам выбирает, что отдавать.
 */
export const prisma = orm

/** Клиент с политиками ZenStack: видит только данные пользователя из сессии */
export function getEnhancedPrisma(user?: Pick<User, 'id'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
