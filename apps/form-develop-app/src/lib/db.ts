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

// Singleton для PostgreSQL pool (избегаем множественных подключений в dev режиме)
const globalForPool = globalThis as unknown as { pool: Pool }

const pool = globalForPool.pool
  ?? new Pool(parsePostgresUrl(process.env.DATABASE_URL))

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pool = pool
}

// Базовый ORM клиент с PostgreSQL диалектом
export const db = new ZenStackClient(schema, {
  dialect: new PostgresDialect({ pool }),
})

// ORM клиент с PolicyPlugin для access control
export const authDb = db.$use(new PolicyPlugin())

/**
 * Получить ORM клиент с привязкой к пользователю
 *
 * Для песочницы не используем аутентификацию - все операции разрешены (@@allow('all', true))
 * Если нужна аутентификация, вызовите authDb.$setAuth(user)
 */
export function getEnhancedPrisma(user?: { id: string }) {
  if (user) {
    return authDb.$setAuth(user)
  }
  return authDb
}
