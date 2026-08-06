import type { User } from '@/generated/prisma'
import { schema } from '@/generated/schema'
import { getEncryptionKey } from '@letar/auth/server'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import {
  createEncryptedAccountClient,
  createEncryptedOauthAccessTokenClient,
  createEncryptedOauthApplicationClient,
} from './crypto-orm'

// Re-export типов
export type * from '@/generated/prisma'

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }) as never,
})

// В dev без AUTH_ENCRYPTION_KEY шифрование пропускается (предупреждение в консоль).
// В production ключ обязателен.
let encryptionKey: Buffer | null = null
try {
  encryptionKey = getEncryptionKey()
} catch {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[auth-hub/db] AUTH_ENCRYPTION_KEY обязателен в production — задай 64-hex символа')
  }
  console.warn('[auth-hub/db] AUTH_ENCRYPTION_KEY не задан — поля БД хранятся незашифрованными (dev mode)')
}

type OrmType = typeof orm

/**
 * Оборачивает ORM-клиент прозрачным encryption proxy для чувствительных моделей:
 * - oauthApplication.clientSecret  → AES-256-GCM
 * - oauthAccessToken.accessToken   → AES-256-CBC (deterministic, нужен для WHERE lookup)
 * - oauthAccessToken.refreshToken  → AES-256-CBC
 * - account.accessToken            → AES-256-GCM
 * - account.refreshToken           → AES-256-GCM
 */
function wrapWithEncryption(base: OrmType, key: Buffer): OrmType {
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'oauthApplication') {
        return createEncryptedOauthApplicationClient(
          Reflect.get(target, prop, receiver) as Parameters<typeof createEncryptedOauthApplicationClient>[0],
          key,
        )
      }
      if (prop === 'oauthAccessToken') {
        return createEncryptedOauthAccessTokenClient(
          Reflect.get(target, prop, receiver) as Parameters<typeof createEncryptedOauthAccessTokenClient>[0],
          key,
        )
      }
      if (prop === 'account') {
        return createEncryptedAccountClient(
          Reflect.get(target, prop, receiver) as Parameters<typeof createEncryptedAccountClient>[0],
          key,
        )
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as OrmType
}

/**
 * Raw ORM — используй только когда нужен прямой доступ без policy check.
 * Нужен для seed.ts и скриптов миграции данных (шифрование там применяется явно).
 * @internal
 */
export const rawOrm = orm

/**
 * ORM с прозрачным шифрованием at-rest (если AUTH_ENCRYPTION_KEY задан).
 * Передаётся в prismaAdapter Better Auth и используется в admin actions.
 */
export const prisma: OrmType = encryptionKey ? wrapWithEncryption(orm, encryptionKey) : orm

/**
 * Enhanced ORM с access control policies.
 * ZenStack v3: $use(PolicyPlugin()).$setAuth(user)
 */
export function getEnhancedPrisma(user?: Pick<User, 'id' | 'roles'> | null) {
  return orm.$use(new PolicyPlugin()).$setAuth(user ?? undefined)
}
