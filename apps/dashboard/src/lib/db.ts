/**
 * ZenStack v3 ORM Client для Dashboard
 * Подключение к PostgreSQL с политиками доступа
 */

import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

/**
 * ZenStack v3 ORM Client для PostgreSQL
 *
 * Примечание: type assertion необходим из-за конфликта версий kysely
 * между корневым node_modules и @zenstackhq/orm/node_modules
 */
const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- конфликт версий kysely
  }) as any,
})

/**
 * Тип пользователя для ZenStack политик доступа
 * Соответствует модели User с @@auth в schema.zmodel
 */
interface AuthUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN' | 'VIEWER'
  name?: string | null
  image?: string | null
  emailVerified?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Получить enhanced Prisma Client с политиками доступа ZenStack.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 *
 * @param user - Аутентифицированный пользователь из session (или null для анонимного)
 * @returns Enhanced PrismaClient с автоматическим применением политик доступа из schema.zmodel
 *
 * @example
 * ```ts
 * import { auth } from '@/lib/auth'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * const session = await auth()
 * const db = getEnhancedPrisma(session?.user)
 *
 * // Запрос автоматически применит политики доступа
 * const alerts = await db.alert.findMany()
 * ```
 */
export function getEnhancedPrisma(user?: Partial<AuthUser> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}

// Алиас для совместимости с кодом, использующим prisma
export const prisma = orm
