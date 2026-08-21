import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Re-export типов
export type * from '@/generated/prisma'

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
    pool: new Pool(parsePostgresUrl(process.env.DATABASE_URL)),
  }) as never,
})

/**
 * Raw ORM client без access control policies.
 * Для защищённых операций используй getEnhancedPrisma().
 */
export const prisma = orm

/**
 * Enhanced ORM Client с access control policies.
 */
export function getEnhancedPrisma(user?: Pick<User, 'id'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
