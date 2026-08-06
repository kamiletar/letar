/**
 * Encryption wrapper для ZenStack ORM auth-hub.
 *
 * Шифрует чувствительные поля at-rest (Этап 8 PLAN.md):
 * - OauthApplication.clientSecret     — AES-256-GCM (non-deterministic, долгосрочный секрет)
 * - OauthAccessToken.accessToken      — AES-256-CBC (deterministic, нужен для lookup)
 * - OauthAccessToken.refreshToken     — AES-256-CBC (deterministic)
 * - Account.accessToken               — AES-256-GCM (BA ищет по userId+providerId, не по значению)
 * - Account.refreshToken              — AES-256-GCM
 *
 * Обратная совместимость: незашифрованные (plaintext) значения возвращаются без изменений.
 * Это позволяет безопасно запускать зашифрованную версию поверх существующих данных
 * до запуска скрипта миграции encrypt-tokens.ts.
 */

import { decryptSecret, decryptToken, encryptSecret, encryptToken, isEncrypted } from '@letar/auth/server'

type Key = Buffer

// ─── helpers ─────────────────────────────────────────────────────────────────

function encS(v: string | null | undefined, key: Key) {
  return v ? encryptSecret(v, key) : v
}
function decS(v: string | null | undefined, key: Key) {
  return v ? decryptSecret(v, key) : v
}
function encT(v: string | null | undefined, key: Key, salt: string) {
  return v ? encryptToken(v, key, salt) : v
}
function decT(v: string | null | undefined, key: Key, salt: string) {
  return v ? decryptToken(v, key, salt) : v
}

// ─── OauthApplication proxy ──────────────────────────────────────────────────

/**
 * Создаёт encryption-обёртку для ORM-модели oauthApplication.
 * Используется в admin actions и seed.ts для прозрачного шифрования.
 */
export function createEncryptedOauthApplicationClient<
  T extends {
    findMany(args?: object): Promise<Array<{ clientSecret?: string | null; [k: string]: unknown }>>
    findUnique(args: object): Promise<{ clientSecret?: string | null; [k: string]: unknown } | null>
    findFirst(args?: object): Promise<{ clientSecret?: string | null; [k: string]: unknown } | null>
    create(args: object): Promise<{ clientSecret?: string | null; [k: string]: unknown }>
    update(args: object): Promise<{ clientSecret?: string | null; [k: string]: unknown }>
    upsert(args: object): Promise<{ clientSecret?: string | null; [k: string]: unknown }>
    delete(args: object): Promise<unknown>
  },
>(client: T, key: Key): T {
  function decryptResult<R extends { clientSecret?: string | null } | null>(result: R): R {
    if (!result || result.clientSecret === null || result.clientSecret === undefined) {
      return result
    }
    return { ...result, clientSecret: decS(result.clientSecret, key) } as R
  }

  function encryptData(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') {
      return data
    }
    const out = { ...data }
    if (typeof out.clientSecret === 'string') {
      out.clientSecret = encS(out.clientSecret, key)
    }
    return out
  }

  return new Proxy(client, {
    get(target, prop) {
      const original = (target as Record<string, unknown>)[prop as string]
      if (typeof original !== 'function') {
        return original
      }

      switch (prop) {
        case 'findMany':
          return async (args?: object) => {
            const results = await (target.findMany as (a?: object) => Promise<Array<{ clientSecret?: string | null }>>)(
              args,
            )
            return results.map(decryptResult)
          }
        case 'findUnique':
        case 'findFirst':
          return async (args?: object) => {
            const result = await (
              target[prop as 'findUnique' | 'findFirst'] as (
                a?: object,
              ) => Promise<{ clientSecret?: string | null } | null>
            )(args)
            return decryptResult(result)
          }
        case 'create':
          return async (args: { data?: Record<string, unknown> }) => {
            const encrypted = { ...args, data: encryptData(args.data ?? {}) }
            const result = await target.create(encrypted)
            return decryptResult(result)
          }
        case 'update':
          return async (args: { data?: Record<string, unknown>; [k: string]: unknown }) => {
            const data = args.data
            const encrypted = { ...args, ...(data && { data: encryptData(data) }) }
            const result = await target.update(encrypted)
            return decryptResult(result)
          }
        case 'upsert':
          return async (args: {
            create?: Record<string, unknown>
            update?: Record<string, unknown>
            [k: string]: unknown
          }) => {
            const encrypted = {
              ...args,
              ...(args.create && { create: encryptData(args.create) }),
              ...(args.update && { update: encryptData(args.update) }),
            }
            const result = await target.upsert(encrypted)
            return decryptResult(result)
          }
        default:
          return original
      }
    },
  }) as T
}

// ─── OauthAccessToken proxy ──────────────────────────────────────────────────

/**
 * Encryption-обёртка для ORM-модели oauthAccessToken.
 * Использует детерминированное шифрование (CBC) для lookup по accessToken.
 */
export function createEncryptedOauthAccessTokenClient<
  T extends {
    findMany(
      args?: object,
    ): Promise<Array<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>>
    findUnique(
      args: object,
    ): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown } | null>
    findFirst(
      args?: object,
    ): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown } | null>
    create(args: object): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>
    update(args: object): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>
    delete(args: object): Promise<unknown>
  },
>(client: T, key: Key): T {
  type TokenRow = { accessToken?: string | null; refreshToken?: string | null }

  function decryptResult<R extends TokenRow | null>(result: R): R {
    if (!result) {
      return result
    }
    return {
      ...result,
      accessToken: decT(result.accessToken, key, 'oauthAccessToken.accessToken'),
      refreshToken: decT(result.refreshToken, key, 'oauthAccessToken.refreshToken'),
    } as R
  }

  function encryptData(data: Record<string, unknown>) {
    const out = { ...data }
    if (typeof out.accessToken === 'string' && !isEncrypted(out.accessToken)) {
      out.accessToken = encT(out.accessToken, key, 'oauthAccessToken.accessToken')
    }
    if (typeof out.refreshToken === 'string' && !isEncrypted(out.refreshToken)) {
      out.refreshToken = encT(out.refreshToken, key, 'oauthAccessToken.refreshToken')
    }
    return out
  }

  // Перехватывает WHERE по accessToken/refreshToken: plaintext → cbc-encrypted lookup
  function transformWhere(where: Record<string, unknown>) {
    const out = { ...where }
    if (typeof out.accessToken === 'string' && !isEncrypted(out.accessToken)) {
      out.accessToken = encT(out.accessToken, key, 'oauthAccessToken.accessToken')
    }
    if (typeof out.refreshToken === 'string' && !isEncrypted(out.refreshToken)) {
      out.refreshToken = encT(out.refreshToken, key, 'oauthAccessToken.refreshToken')
    }
    return out
  }

  return new Proxy(client, {
    get(target, prop) {
      const original = (target as Record<string, unknown>)[prop as string]
      if (typeof original !== 'function') {
        return original
      }

      switch (prop) {
        case 'findMany':
          return async (args?: { where?: Record<string, unknown>; [k: string]: unknown }) => {
            const transformed = args?.where ? { ...args, where: transformWhere(args.where) } : args
            const results = await (target.findMany as (a?: object) => Promise<Array<TokenRow>>)(transformed)
            return results.map(decryptResult)
          }
        case 'findUnique':
        case 'findFirst':
          return async (args: { where?: Record<string, unknown>; [k: string]: unknown }) => {
            const transformed = args.where ? { ...args, where: transformWhere(args.where) } : args
            const result = await (
              target[prop as 'findUnique' | 'findFirst'] as (a: object) => Promise<TokenRow | null>
            )(transformed)
            return decryptResult(result)
          }
        case 'create':
          return async (args: { data?: Record<string, unknown> }) => {
            const encrypted = { ...args, data: encryptData(args.data ?? {}) }
            const result = await target.create(encrypted)
            return decryptResult(result)
          }
        case 'update':
          return async (args: {
            where?: Record<string, unknown>
            data?: Record<string, unknown>
            [k: string]: unknown
          }) => {
            const encrypted = {
              ...args,
              ...(args.where && { where: transformWhere(args.where) }),
              ...(args.data && { data: encryptData(args.data) }),
            }
            const result = await target.update(encrypted)
            return decryptResult(result)
          }
        default:
          return original
      }
    },
  }) as T
}

// ─── Account proxy ────────────────────────────────────────────────────────────

/**
 * Encryption-обёртка для ORM-модели account.
 * BA ищет account по userId+providerId, поэтому accessToken/refreshToken можно шифровать GCM.
 */
export function createEncryptedAccountClient<
  T extends {
    findMany(
      args?: object,
    ): Promise<Array<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>>
    findFirst(
      args?: object,
    ): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown } | null>
    findUnique(
      args: object,
    ): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown } | null>
    create(args: object): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>
    update(args: object): Promise<{ accessToken?: string | null; refreshToken?: string | null; [k: string]: unknown }>
    delete(args: object): Promise<unknown>
  },
>(client: T, key: Key): T {
  type AccountRow = { accessToken?: string | null; refreshToken?: string | null }

  function decryptResult<R extends AccountRow | null>(result: R): R {
    if (!result) {
      return result
    }
    return {
      ...result,
      accessToken: decS(result.accessToken, key),
      refreshToken: decS(result.refreshToken, key),
    } as R
  }

  function encryptData(data: Record<string, unknown>) {
    const out = { ...data }
    if (typeof out.accessToken === 'string' && !isEncrypted(out.accessToken)) {
      out.accessToken = encS(out.accessToken, key)
    }
    if (typeof out.refreshToken === 'string' && !isEncrypted(out.refreshToken)) {
      out.refreshToken = encS(out.refreshToken, key)
    }
    return out
  }

  return new Proxy(client, {
    get(target, prop) {
      const original = (target as Record<string, unknown>)[prop as string]
      if (typeof original !== 'function') {
        return original
      }

      switch (prop) {
        case 'findMany':
          return async (args?: object) => {
            const results = await (target.findMany as (a?: object) => Promise<Array<AccountRow>>)(args)
            return results.map(decryptResult)
          }
        case 'findFirst':
        case 'findUnique':
          return async (args?: object) => {
            const result = await (
              target[prop as 'findFirst' | 'findUnique'] as (a?: object) => Promise<AccountRow | null>
            )(args)
            return decryptResult(result)
          }
        case 'create':
          return async (args: { data?: Record<string, unknown> }) => {
            const result = await target.create({ ...args, data: encryptData(args.data ?? {}) })
            return decryptResult(result)
          }
        case 'update':
          return async (args: { data?: Record<string, unknown>; [k: string]: unknown }) => {
            const result = await target.update({
              ...args,
              ...(args.data && { data: encryptData(args.data) }),
            })
            return decryptResult(result)
          }
        default:
          return original
      }
    },
  }) as T
}
