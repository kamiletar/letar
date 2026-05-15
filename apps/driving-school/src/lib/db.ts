import type { User, UserRole } from '@letar/driving-school-db/prisma'
import { schema } from '@letar/driving-school-db/schema'
import type { ClientContract, ClientOptions } from '@zenstackhq/orm'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import { procedures } from './db-procedures'

// Реэкспорт часто используемых типов и enum'ов из Prisma
export type * from '@letar/driving-school-db/prisma'

/**
 * Тип ZenStack клиента — обходит баг TypeScript с union overloads
 * от пересечения ExtQueryArgs при $use() (TS2349, 540+ ошибок)
 * Cast безопасен: ClientContract<Schema> — та же структура, без ExtQueryArgs от PolicyPlugin
 */
type DB = ClientContract<typeof schema, ClientOptions<typeof schema>>

/**
 * Тип для auth() в ZenStack access policies
 * Используем булевые флаги вместо массива ролей из-за бага ZenStack v3.2.1:
 * "ошибочный литерал массива" при has(auth().roles, OWNER)
 */
type AuthInfo = {
  id: string
  isOwner: boolean
  isModerator: boolean
  isFreelanceInstructor: boolean
}

/**
 * MEMORY LEAK FIX: Кэширование ZenStackClient, PolicyPlugin и enhanced client через globalThis
 *
 * В production Next.js (serverless) может создавать новые module instances
 * при каждом request. globalThis гарантирует singleton на уровне процесса.
 *
 * КРИТИЧНО: PolicyPlugin и $use() создают Zod схемы при инициализации.
 * Создание нового enhanced client на каждый запрос вызывает утечку памяти (93% heap!).
 */
const globalForOrm = globalThis as unknown as {
  orm: InstanceType<typeof ZenStackClient<typeof schema>> | undefined
  policyPlugin: PolicyPlugin | undefined
  enhancedOrm: ReturnType<typeof ZenStackClient.prototype.$use> | undefined
}

/**
 * ZenStack v3 ORM Client для PostgreSQL с Custom Procedures
 */
const orm =
  globalForOrm.orm ??
  new ZenStackClient(schema, {
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
    // Custom Procedures (ZenStack v3.2.0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    procedures: procedures as any,
  })

// Сохраняем в globalThis для переиспользования между requests
// MEMORY LEAK FIX: Кэшируем ВСЕГДА, включая development
// Hot reload в dev создавал новые ZenStackClient с новыми pg Pool
globalForOrm.orm = orm

/**
 * MEMORY LEAK FIX: Singleton PolicyPlugin
 *
 * PolicyPlugin создаёт Zod схемы из JSON Schema при инициализации.
 * БЕЗ кэширования: каждый вызов getEnhancedPrisma() создавал новый PolicyPlugin,
 * накапливая Zod схемы в памяти (93% heap = 1.5GB за несколько минут!).
 */
const policyPlugin = globalForOrm.policyPlugin ?? new PolicyPlugin()
globalForOrm.policyPlugin = policyPlugin

/**
 * MEMORY LEAK FIX: Singleton Enhanced ORM
 *
 * $use() создаёт новый enhanced client с Zod схемами для валидации.
 * Кэшируем результат $use(), а $setAuth() вызываем на каждый запрос.
 */
const enhancedOrm = globalForOrm.enhancedOrm ?? orm.$use(policyPlugin)
globalForOrm.enhancedOrm = enhancedOrm

/**
 * Базовый ORM клиент без политик доступа
 * Используй для системных операций (auth, cron jobs)
 */
export const prisma: DB = orm as unknown as DB

/**
 * Конвертирует массив ролей в булевые флаги для auth()
 * Обход бага ZenStack v3.2.1: "ошибочный литерал массива" при has(auth().roles, ROLE)
 */
function rolesToAuthInfo(id: string, roles: UserRole[] = []): AuthInfo {
  return {
    id,
    isOwner: roles.includes('OWNER' as UserRole),
    isModerator: roles.includes('MODERATOR' as UserRole),
    isFreelanceInstructor: roles.includes('FREELANCE_INSTRUCTOR' as UserRole),
  }
}

/**
 * Получить enhanced Prisma Client с политиками доступа ZenStack.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(authInfo)
 *
 * ВАЖНО: Используем булевые флаги ролей вместо массива из-за бага ZenStack v3.2.1.
 * Вместо has(auth().roles, OWNER) используем auth().isOwner в schema.zmodel
 *
 * @param user - Аутентифицированный пользователь из NextAuth сессии (или null для анонимного)
 * @returns Enhanced PrismaClient с автоматическим применением политик доступа из schema.zmodel
 *
 * @example
 * ```ts
 * import { getSession } from '@/lib/auth'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * const session = await getSession()
 * const db = getEnhancedPrisma(session?.user)
 *
 * // Запрос автоматически применит политики доступа
 * const lessons = await db.lesson.findMany()
 * ```
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'roles'> | null): DB {
  const authInfo = user ? rolesToAuthInfo(user.id, user.roles) : undefined
  // MEMORY LEAK FIX: Используем singleton enhancedOrm вместо orm.$use() на каждый запрос
  return enhancedOrm.$setAuth(authInfo) as unknown as DB
}
