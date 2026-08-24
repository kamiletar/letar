/**
 * Миграция: шифрование clientSecret в таблице oauthApplication.
 *
 * Читает все записи, шифрует plaintext-секреты через AES-256-GCM.
 * Уже зашифрованные (gcm:...) записи пропускает — идемпотентен.
 *
 * По умолчанию — DRY RUN (только показывает что будет сделано).
 * Для реального выполнения: bun run scripts/encrypt-client-secrets.ts --execute
 *
 * Требует: DATABASE_URL, AUTH_ENCRYPTION_KEY в .env.local / .env
 */
import { loadEnvCascade } from '@letar/env-load'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnvCascade(join(__dirname, '..'))

import { encryptSecret, isEncrypted } from '@letar/auth/server'
import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../src/generated/schema.js'

const IS_DRY_RUN = !process.argv.includes('--execute')

function getKey(): Buffer {
  const hex = process.env.AUTH_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('[encrypt-client-secrets] AUTH_ENCRYPTION_KEY не задан или неверной длины (нужно 64 hex символа)')
  }
  return Buffer.from(hex, 'hex')
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('[encrypt-client-secrets] DATABASE_URL не задан')
  }

  const key = getKey()

  const pool = new Pool({ connectionString: databaseUrl })
  const orm = new ZenStackClient(schema, {
    dialect: new PostgresDialect({ pool }) as never,
  })

  console.log(
    `[encrypt-client-secrets] ${
      IS_DRY_RUN ? '--- DRY RUN (передай --execute для реального запуска) ---' : '--- EXECUTE ---'
    }`,
  )

  const clients = await orm.oauthApplication.findMany({})
  console.log(`[encrypt-client-secrets] Найдено ${clients.length} клиентов`)

  let toEncrypt = 0
  let alreadyEncrypted = 0

  for (const client of clients) {
    const secret = client.clientSecret
    if (!secret) {
      console.log(`  SKIP   ${client.clientId} — clientSecret отсутствует`)
      continue
    }

    if (isEncrypted(secret)) {
      console.log(`  OK     ${client.clientId} — уже зашифрован`)
      alreadyEncrypted++
      continue
    }

    toEncrypt++
    console.log(`  ENCRYPT ${client.clientId} — "${secret.slice(0, 6)}..." → gcm:...`)

    if (!IS_DRY_RUN) {
      const encrypted = encryptSecret(secret, key)
      await orm.oauthApplication.update({
        where: { id: client.id },
        data: { clientSecret: encrypted },
      })
      console.log(`          ✓ обновлён`)
    }
  }

  console.log(
    `\n[encrypt-client-secrets] Итого: ${alreadyEncrypted} уже зашифровано, ${toEncrypt} ${
      IS_DRY_RUN ? 'ожидают' : 'зашифровано'
    }`,
  )

  if (IS_DRY_RUN && toEncrypt > 0) {
    console.log('[encrypt-client-secrets] Запусти с флагом --execute для применения изменений')
  }

  await pool.end()
}

run().catch((e) => {
  console.error('[encrypt-client-secrets] Error:', e)
  process.exit(1)
})
