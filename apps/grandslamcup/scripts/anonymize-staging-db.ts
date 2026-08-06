/**
 * Анонимизация snapshot-БД для staging (PLAN.md §18 Сессия D).
 *
 * Запускать ПОСЛЕ восстановления pg_dump продовой БД в grandslamcup-staging-db
 * (данные восстанавливаются БЕЗ таблиц Account/Session/Verification/consentLog/
 * PushSubscription — исключить их флагами `-T` уже на этапе `pg_dump`, это секреты
 * и OAuth-токены, не подлежат анонимизации, только полному исключению).
 *
 * ⚠️ ПРОВЕРЯЕТ, что подключение НЕ похоже на production, прежде чем что-либо менять —
 * скрипт необратим (UPDATE без транзакции отката для оператора).
 *
 * Player/City/Team/Match/Standings/Poem и т.п. НЕ анонимизируются — это публичные
 * турнирные данные (`@@allow('read', true)` в schema.zmodel), ровно то, что должен
 * протестировать e2e/QA. Анонимизации подлежит только приватное:
 * - User: email/name/image/telegramChatId — контакты и профиль аккаунта
 * - RosterApplication: playerTelegram/playerVk/playerBio — контакты в НЕ рассмотренной
 *   заявке (playerName/playerCity оставлены — те же данные, что попадут в публичный Player)
 *
 * ⚠️ ИСКЛЮЧЕНИЕ: `admin@grandslamcup.ru` НЕ анонимизируется. Это не реальный пользователь,
 * а служебный fixture-аккаунт для `/api/auth/dev-session` (preview/e2e-логин без OIDC,
 * см. apps/grandslamcup/src/app/api/auth/dev-session/route.ts) — e2e ищет пользователя
 * именно по этому email; если его анонимизировать, dev-session не находит существующего
 * админа и создаёт НОВОГО пустого пользователя без организаторских/ролевых связей — весь
 * admin-пласт e2e ломается каскадно (найдено на первом живом прогоне, PLAN.md §18 Сессия D).
 *
 * Запуск: bun apps/grandslamcup/scripts/anonymize-staging-db.ts
 */
import { config } from 'dotenv'
import { join } from 'node:path'
import { Pool } from 'pg'

config({ path: join(import.meta.dirname, '../.env.staging') })
config({ path: join(import.meta.dirname, '../.env.local') })
config({ path: join(import.meta.dirname, '../.env') })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL не задан — нужен .env.staging с адресом staging-БД')
}

// Защита от случайного запуска на проде: staging-БД в этом репо всегда живёт в
// grandslamcup-staging-db (см. docker-compose.staging.yml), продовая — в grandslamcup-db.
if (!DATABASE_URL.includes('grandslamcup-staging-db') && !DATABASE_URL.includes('localhost')) {
  throw new Error(
    `DATABASE_URL "${DATABASE_URL}" не похож на staging (ожидался хост grandslamcup-staging-db или localhost). `
      + 'Останавливаюсь — этот скрипт необратимо перезаписывает данные.',
  )
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function runStep(label: string, sql: string): Promise<void> {
  const { rowCount } = await pool.query(sql)
  console.log(`✓ ${label}: ${rowCount} строк`)
}

async function main(): Promise<void> {
  console.log(`Анонимизация staging-БД: ${DATABASE_URL!.replace(/:[^:@]+@/, ':***@')}`)

  // Секреты и session-токены — на случай если pg_dump всё же их затянул (defence in depth,
  // основная защита — исключение таблиц флагами -T на этапе pg_dump).
  await runStep('Account (OAuth-токены) — очищены', 'TRUNCATE "Account" CASCADE')
  await runStep('Session (сессионные токены) — очищены', 'TRUNCATE "Session" CASCADE')
  await runStep('Verification (verification-токены) — очищены', 'TRUNCATE "Verification" CASCADE')
  await runStep('consentLog (152-ФЗ аудит согласий реальных пользователей) — очищен', 'TRUNCATE "consentLog" CASCADE')
  await runStep('PushSubscription (push-эндпоинты устройств) — очищены', 'TRUNCATE "PushSubscription" CASCADE')

  // User — деterministic псевдонимизация по id, без совпадений/коллизий, без реального PII.
  // admin@grandslamcup.ru исключён — служебный e2e/dev-session fixture, не реальный пользователь
  // (см. пояснение в шапке файла).
  await runStep(
    'User — email/name/image/telegramChatId анонимизированы (кроме e2e-fixture admin@grandslamcup.ru)',
    `UPDATE "User" SET
      email = 'user-' || id || '@staging.invalid',
      name = 'Тестовый пользователь ' || substr(id, 1, 6),
      image = NULL,
      "telegramChatId" = NULL,
      "emailVerified" = true
     WHERE email != 'admin@grandslamcup.ru'`,
  )

  // RosterApplication — контакты нерассмотренной заявки (не публичные данные до апрува).
  await runStep(
    'RosterApplication — контактные поля анонимизированы',
    `UPDATE "RosterApplication" SET
      "playerTelegram" = NULL,
      "playerVk" = NULL,
      "playerBio" = NULL
     WHERE "playerTelegram" IS NOT NULL OR "playerVk" IS NOT NULL OR "playerBio" IS NOT NULL`,
  )

  console.log('Готово. Player/City/Team/Match/Standings/Poem и остальные публичные модели не тронуты.')
  await pool.end()
}

main().catch((error) => {
  console.error('Анонимизация упала:', error)
  process.exit(1)
})
