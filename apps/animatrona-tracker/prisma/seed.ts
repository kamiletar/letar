/**
 * Seed данных для Animatrona Tracker
 *
 * Создаёт dev-пользователя с ролью ADMIN для локальной разработки.
 * Запуск: nx db:seed animatrona-tracker
 *
 * Логин: admin@dev.local / admin123
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient, UserRole } from '../src/generated/prisma'

const DEV_USER = {
  email: 'admin@dev.local',
  password: 'admin123',
  name: 'Dev Admin',
  role: UserRole.ADMIN,
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  const prisma = new PrismaClient({ adapter })

  console.log('🌱 Seeding animatrona-tracker...')

  // Создаём или обновляем dev-пользователя
  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {
      name: DEV_USER.name,
      role: DEV_USER.role,
    },
    create: {
      email: DEV_USER.email,
      name: DEV_USER.name,
      role: DEV_USER.role,
      emailVerified: true,
    },
  })
  console.log(`✅ User: ${user.name} (${user.email}, role: ${user.role})`)

  // Хешируем пароль через Better Auth (scrypt)
  const hashedPassword = await hashPassword(DEV_USER.password)

  // Создаём credential аккаунт (email/password)
  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: 'credential',
        accountId: user.id,
      },
    },
    update: {
      password: hashedPassword,
    },
    create: {
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hashedPassword,
    },
  })
  console.log(`🔑 Credential account created`)

  console.log('\n🎉 Seed completed!')
  console.log(`\n📧 Логин: ${DEV_USER.email}`)
  console.log(`🔒 Пароль: ${DEV_USER.password}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Seed error:', e)
  process.exit(1)
})
