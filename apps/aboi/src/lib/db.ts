import type { User, UserRole } from '@/generated/prisma/client'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

/**
 * Re-export типов и enum'ов из generated Prisma для удобства импорта по одному пути.
 */
export type * from '@/generated/prisma/client'

/**
 * Тип auth-контекста — соответствует `type Auth` в schema.zmodel.
 * Используем булевые флаги, потому что ZenStack v3 не поддерживает has()/in
 * для массивов enum в auth().
 */
export interface AuthInfo {
  id: string
  isAdmin: boolean
  isManager: boolean
  isAnonymous: boolean
}

/**
 * ZenStack v3 ORM Client для PostgreSQL — singleton на уровне процесса.
 *
 * MEMORY LEAK FIX: PolicyPlugin создаёт Zod-схемы при инициализации, поэтому
 * enhanced client кэшируется и переиспользуется.
 */
const globalForOrm = globalThis as unknown as {
  aboiOrm: InstanceType<typeof ZenStackClient<typeof schema>> | undefined
}

const orm = globalForOrm.aboiOrm ?? new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }) as never,
})

if (process.env.NODE_ENV !== 'production') {
  globalForOrm.aboiOrm = orm
}

/**
 * Raw ORM client без access-policies. Для защищённых операций — getEnhancedPrisma().
 */
export const prisma = orm

/**
 * Enhanced ORM Client с применёнными access-policies.
 * Передаём auth в виде булевых флагов (см. AuthInfo).
 */
export function getEnhancedPrisma(authUser?: Pick<User, 'id' | 'roles' | 'isAnonymous'> | null) {
  if (!authUser) {
    return orm.$use(new PolicyPlugin())
  }

  const auth: AuthInfo = {
    id: authUser.id,
    isAdmin: (authUser.roles as UserRole[]).includes('ADMIN'),
    isManager: (authUser.roles as UserRole[]).includes('MANAGER'),
    isAnonymous: authUser.isAnonymous,
  }

  return orm.$use(new PolicyPlugin()).$setAuth(auth as never)
}
