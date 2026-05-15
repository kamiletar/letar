/**
 * Скрипт миграции Auth.js → Better Auth
 *
 * Конвертирует существующие записи в таблицах:
 * - Account: provider → providerId, providerAccountId → accountId
 * - Session: sessionToken → token, expires → expiresAt
 * - User: emailVerified DateTime → Boolean
 */

import { config } from 'dotenv'
// Загружаем .env.local
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Начинаем миграцию Auth.js → Better Auth...\n')

  // 1. Проверяем текущую структуру таблицы Account
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Account'
    ORDER BY ordinal_position
  `)

  const columnNames = columns.map((c) => c.column_name)
  console.log('📋 Колонки таблицы Account:')
  console.log('  ', columnNames.join(', '))
  console.log('')

  const hasProvider = columnNames.includes('provider')
  const hasProviderId = columnNames.includes('providerId')
  const hasId = columnNames.includes('id')

  // Проверяем содержимое
  const accountData = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT * FROM "Account" LIMIT 3
  `)
  console.log('📋 Данные Account:')
  console.log(accountData)
  console.log('')

  if (hasProvider && !hasProviderId) {
    console.log('🔄 Миграция Account: добавляем колонки Better Auth...')

    // Добавляем id если нет
    if (!hasId) {
      console.log('   Добавляем колонку id...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "id" TEXT;
      `)
      // Генерируем id для существующих записей
      await prisma.$executeRawUnsafe(`
        UPDATE "Account" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
      `)
    }

    // Добавляем providerId и accountId
    console.log('   Добавляем колонки providerId и accountId...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Account"
      ADD COLUMN IF NOT EXISTS "providerId" TEXT,
      ADD COLUMN IF NOT EXISTS "accountId" TEXT;
    `)

    // Копируем данные из старых колонок
    console.log('   Копируем данные provider → providerId, providerAccountId → accountId...')
    await prisma.$executeRawUnsafe(`
      UPDATE "Account"
      SET
        "providerId" = COALESCE("providerId", provider),
        "accountId" = COALESCE("accountId", "providerAccountId")
      WHERE "providerId" IS NULL OR "accountId" IS NULL;
    `)

    // Добавляем новые колонки для токенов
    console.log('   Добавляем колонки для токенов Better Auth...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Account"
      ADD COLUMN IF NOT EXISTS "accessToken" TEXT,
      ADD COLUMN IF NOT EXISTS "refreshToken" TEXT,
      ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);
    `)

    // Копируем токены
    console.log('   Копируем токены: access_token → accessToken, refresh_token → refreshToken...')
    await prisma.$executeRawUnsafe(`
      UPDATE "Account"
      SET
        "accessToken" = COALESCE("accessToken", access_token),
        "refreshToken" = COALESCE("refreshToken", refresh_token),
        "accessTokenExpiresAt" = COALESCE("accessTokenExpiresAt", to_timestamp(expires_at))
      WHERE "accessToken" IS NULL AND access_token IS NOT NULL;
    `)

    console.log('   ✅ Данные Account подготовлены\n')
  } else if (hasProviderId) {
    // Проверяем нужно ли копировать токены
    const hasAccessToken = columnNames.includes('accessToken')
    const hasOldAccessToken = columnNames.includes('access_token')

    if (!hasAccessToken && hasOldAccessToken) {
      console.log('🔄 Миграция токенов Account...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Account"
        ADD COLUMN IF NOT EXISTS "accessToken" TEXT,
        ADD COLUMN IF NOT EXISTS "refreshToken" TEXT,
        ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);
      `)
      await prisma.$executeRawUnsafe(`
        UPDATE "Account"
        SET
          "accessToken" = COALESCE("accessToken", access_token),
          "refreshToken" = COALESCE("refreshToken", refresh_token),
          "accessTokenExpiresAt" = COALESCE("accessTokenExpiresAt", to_timestamp(expires_at))
        WHERE "accessToken" IS NULL AND access_token IS NOT NULL;
      `)
      console.log('   ✅ Токены скопированы\n')
    } else {
      console.log('ℹ️  Account уже в формате Better Auth\n')
    }
  } else {
    console.log('⚠️  Неизвестная структура Account\n')
  }

  // 2. Проверяем User.emailVerified
  const users = await prisma.$queryRawUnsafe<
    Array<{
      id: string
      email: string
      emailVerified: unknown
    }>
  >(`SELECT id, email, "emailVerified" FROM "User" LIMIT 5`)

  console.log('📋 Текущие записи User (emailVerified):')
  users.forEach((u) => {
    console.log(`   ${u.email}: ${u.emailVerified} (${typeof u.emailVerified})`)
  })
  console.log('')

  // Если emailVerified это timestamp, конвертируем в boolean
  const firstUser = users[0]
  if (firstUser && firstUser.emailVerified instanceof Date) {
    console.log('🔄 Миграция User: emailVerified DateTime → Boolean')

    // Создаём временную колонку
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified_new" BOOLEAN DEFAULT false;
    `)

    // Конвертируем данные
    await prisma.$executeRawUnsafe(`
      UPDATE "User" SET "emailVerified_new" = ("emailVerified" IS NOT NULL);
    `)

    console.log('   ✅ Данные сконвертированы\n')
  }

  // 3. Проверяем Session
  const sessionColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Session'
    ORDER BY ordinal_position
  `)

  const sessionColumnNames = sessionColumns.map((c) => c.column_name)
  console.log('📋 Колонки таблицы Session:')
  console.log('  ', sessionColumnNames.join(', '))
  console.log('')

  const hasSessionToken = sessionColumnNames.includes('sessionToken')
  const hasToken = sessionColumnNames.includes('token')
  const hasSessionId = sessionColumnNames.includes('id')

  if (hasSessionToken && !hasToken) {
    console.log('🔄 Миграция Session: добавляем колонки Better Auth...')

    // Добавляем id если нет
    if (!hasSessionId) {
      console.log('   Добавляем колонку id...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "id" TEXT;
      `)
      await prisma.$executeRawUnsafe(`
        UPDATE "Session" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
      `)
    }

    console.log('   Добавляем колонки token, expiresAt, ipAddress, userAgent...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Session"
      ADD COLUMN IF NOT EXISTS "token" TEXT,
      ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
    `)

    console.log('   Копируем данные sessionToken → token, expires → expiresAt...')
    await prisma.$executeRawUnsafe(`
      UPDATE "Session"
      SET
        "token" = COALESCE("token", "sessionToken"),
        "expiresAt" = COALESCE("expiresAt", expires)
      WHERE "token" IS NULL;
    `)

    console.log('   ✅ Данные скопированы\n')
  }

  console.log('🎉 Миграция завершена!')
  console.log('\nСледующие шаги:')
  console.log('1. Выполните: nx db:push premium-rosstil')
  console.log('2. Или создайте миграцию: nx db:migrate premium-rosstil')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка миграции:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
