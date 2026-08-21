/**
 * ZenStack v3 ORM Client для Dashboard
 * Подключение к PostgreSQL с политиками доступа
 */

import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

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
 *
 * Примечание: type assertion необходим из-за конфликта версий kysely
 * между корневым node_modules и @zenstackhq/orm/node_modules
 */
const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool(parsePostgresUrl(process.env.DATABASE_URL)),
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
