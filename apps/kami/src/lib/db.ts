import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Re-export commonly used types
export type * from '@/generated/prisma'

// ⚠️ Пароль в DATABASE_URL генерируется через `openssl rand -base64 32` (см. security.md) —
// алфавит base64 содержит `/` и `+`. Необработанный `/` перед `@` ломает разбор строки через
// `new URL()` внутри pg-connection-string (WHATWG URL встречает `/` до `@`, решает, что userinfo
// закончился, и пытается распарсить "user:пароль-до-слэша" как host:port → "Invalid URL",
// `base: 'postgres://base'`). Ошибка детерминированная на каждый запрос — на staging kami
// молчаливо ломала auth/rate-limit (там ошибка проглатывается) и валила 500 на страницах,
// которые не оборачивают DB-запрос в try/catch (agent-mail e2e-gate-status-form-example-kami,
// 2026-08-21). Разбираем строку вручную и передаём поля отдельно — так `pg` не парсит
// connectionString через URL вообще.
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
 * Используй для публичных данных (skills, projects, blog).
 * Для защищённых операций используй getEnhancedPrisma().
 */
export const prisma = orm

/**
 * Get an enhanced ORM Client with ZenStack access control policies applied.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'roles'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
