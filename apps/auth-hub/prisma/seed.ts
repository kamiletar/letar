/**
 * Seed OIDC-клиентов в таблицу oauthApplication.
 *
 * Секреты читаются из переменных окружения (не хранятся в коде).
 * Better Auth сравнивает clientSecret plaintext (без хеширования по умолчанию).
 *
 * Запуск: nx run auth-hub:db:seed
 */
import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Загружаем .env.local, затем .env — как Next.js
config({ path: join(__dirname, '../.env.local') })
config({ path: join(__dirname, '../.env') })

import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
// Используем относительный путь — tsconfig.paths недоступен вне src/
import { schema } from '../src/generated/schema.js'

function requireSecret(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`[seed] Не задан секрет ${name} — проверь .env.local (dev) / .env.docker (prod)`)
  }
  return value
}

// redirectUrls хранится как comma-separated string (Better Auth: res.redirectUrls.split(","))
const clients = [
  {
    clientId: 'archetest-prod',
    clientSecret: requireSecret('OIDC_ARCHETEST_SECRET'),
    name: 'Архетест',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://archetest.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://archetest.letar.best/sign-in',
      'http://localhost:3012/sign-in',
    ].join(','),
  },
  {
    clientId: 'time-prod',
    clientSecret: requireSecret('OIDC_TIME_SECRET'),
    name: 'Unix Time',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://time.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://time.letar.best/',
      'http://localhost:3013/',
      // Staging (PLAN.md §18.7 Тираж M) — тот же клиент, отдельного staging-инстанса Ключницы
      // нет, только дополнительный redirect URI. Один лейбл (time-stage), под wildcard
      // `*.s3 CNAME s3.letar.best`.
      'https://time-stage.s3.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://time-stage.s3.letar.best/',
    ].join(','),
  },
  {
    clientId: 'grandslamcup-prod',
    clientSecret: requireSecret('OIDC_GRANDSLAMCUP_SECRET'),
    name: 'Grand Slam Cup',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://grandslamcup.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://grandslamcup.letar.best/sign-in',
      'http://localhost:3016/sign-in',
      // Staging на s3 (PLAN.md §18 Сессия D) — реальный HTTPS-домен, максимально близко к проду.
      // Один лейбл (grandslamcup-stage), не два (grandslamcup.stage) — попадает под существующий
      // DNS-wildcard `*.s3 CNAME s3.letar.best`, новая DNS-запись не нужна.
      'https://grandslamcup-stage.s3.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://grandslamcup-stage.s3.letar.best/sign-in',
    ].join(','),
  },
  {
    clientId: 'kami-prod',
    clientSecret: requireSecret('OIDC_KAMI_SECRET'),
    name: 'Ками',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://kami.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://kami.letar.best/sign-in',
      'http://localhost:3005/sign-in',
    ].join(','),
  },
  {
    clientId: 'animatrona-tracker-prod',
    clientSecret: requireSecret('OIDC_ANIMATRONA_TRACKER_SECRET'),
    name: 'Animatrona Tracker',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://animatrona-tracker.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://animatrona-tracker.letar.best/sign-in',
      'http://localhost:3010/sign-in',
    ].join(','),
  },
  {
    clientId: 'dashboard-prod',
    clientSecret: requireSecret('OIDC_DASHBOARD_SECRET'),
    name: 'Dashboard',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://dash.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://dash.letar.best/auth/signin',
    ].join(','),
  },
  {
    clientId: 'studio-prod',
    clientSecret: requireSecret('OIDC_STUDIO_SECRET'),
    name: 'Studio Letar',
    type: 'web',
    disabled: false,
    // skipConsent: true работает только через trustedClients (Better Auth v1.6.11 не читает поле из БД).
    // После миграции — единожды покажется consent-экран, затем consent сохраняется в oauthConsent.
    skipConsent: false,
    redirectUrls: [
      'https://studio.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://studio.letar.best/sign-in',
      // Локальный dev-порт студии — 3024 (3020 занял form-docs). Расхождение с этим
      // значением ломает локальный вход: студия ходит в ПРОД-Ключницу, поэтому localhost-адрес
      // должен лежать в боевой БД. Сверяется guard-тестом @letar/infra-config.
      'http://localhost:3024/api/auth/oauth2/callback/letar-auth',
      'http://localhost:3024/sign-in',
    ].join(','),
  },
  {
    clientId: 'domwellbes-prod',
    clientSecret: requireSecret('OIDC_DOMWELLBES_SECRET'),
    name: 'DomWellbes',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://domwellbes.ru/api/auth/oauth2/callback/letar-auth',
      'https://domwellbes.ru/sign-in',
    ].join(','),
  },
  {
    clientId: 'aprel8008-prod',
    clientSecret: requireSecret('OIDC_APREL8008_SECRET'),
    name: 'Aprel8008 (7 Сестёр) — админка',
    type: 'web',
    disabled: false,
    skipConsent: false,
    redirectUrls: [
      'https://aprel8008.ru/api/auth/oauth2/callback/letar-auth',
      'https://aprel8008.ru/sign-in',
      'http://localhost:3023/api/auth/oauth2/callback/letar-auth',
      'http://localhost:3023/sign-in',
      // Staging (PLAN.md §18.7 Тираж M1) — тот же клиент, отдельного staging-инстанса Ключницы
      // нет, только дополнительный redirect URI. Один лейбл (aprel8008-stage), под wildcard
      // `*.s3 CNAME s3.letar.best`.
      'https://aprel8008-stage.s3.letar.best/api/auth/oauth2/callback/letar-auth',
      'https://aprel8008-stage.s3.letar.best/sign-in',
    ].join(','),
  },
]

async function seed() {
  // Необходимо DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('[seed] DATABASE_URL не задан')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  // Raw ORM без PolicyPlugin — обходит @@deny('all', true) на OauthApplication
  const orm = new ZenStackClient(schema, {
    dialect: new PostgresDialect({ pool }) as never,
  })

  console.log('[seed] Seeding OIDC clients...')

  for (const client of clients) {
    const result = await orm.oauthApplication.upsert({
      where: { clientId: client.clientId },
      update: client,
      create: client,
    })
    console.log(`  ✓ ${result.clientId} (${result.name})`)
  }

  console.log(`[seed] Done: ${clients.length} clients seeded.`)
  await pool.end()
}

seed().catch((e) => {
  console.error('[seed] Error:', e)
  process.exit(1)
})
