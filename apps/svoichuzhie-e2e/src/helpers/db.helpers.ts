/**
 * DB-хелперы для E2E тестов svoichuzhie
 *
 * Создаёт тестовых пользователей напрямую в БД через Prisma CJS wrapper.
 */
import { hash } from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

const projectDir = resolve(__dirname, '../../../svoichuzhie')
config({ path: resolve(projectDir, '.env.local') })
config({ path: resolve(projectDir, '.env') })

type AnyPrisma = { user: Record<string, unknown>; account: Record<string, unknown> }

let prisma: AnyPrisma | null = null

async function getPrisma(): Promise<AnyPrisma> {
  if (!prisma) {
    const mod = require('./prisma-cjs-wrapper')
    prisma = mod.createPrismaClient() as AnyPrisma
  }
  return prisma
}

/** Создаёт или обновляет тестового пользователя. Возвращает userId. */
export async function createTestUser(data: {
  email: string
  password: string
  name: string
  role?: 'USER' | 'ADMIN'
}): Promise<string> {
  const db = await getPrisma() as any
  const hashedPassword = await hash(data.password, 12)
  const role = data.role ?? 'USER'

  const existing = await db.user.findUnique({ where: { email: data.email } })

  let userId: string

  if (existing) {
    await db.user.update({
      where: { email: data.email },
      data: { name: data.name, emailVerified: true, role },
    })
    userId = existing.id
    await db.account.upsert({
      where: { providerId_accountId: { providerId: 'credential', accountId: data.email } },
      update: { password: hashedPassword },
      create: { userId, providerId: 'credential', accountId: data.email, password: hashedPassword },
    })
    console.log(`  ✓ Updated user: ${data.email}`)
  } else {
    const user = await db.user.create({
      data: { email: data.email, name: data.name, emailVerified: true, role },
    })
    userId = user.id
    await db.account.create({
      data: { userId, providerId: 'credential', accountId: data.email, password: hashedPassword },
    })
    console.log(`  ✓ Created user: ${data.email}`)
  }

  return userId
}

/** Создаёт FanMember запись для пользователя (если не существует). */
export async function ensureFanMember(userId: string): Promise<void> {
  const db = await getPrisma() as any
  const existing = await db.fanMember.findUnique({ where: { userId } })
  if (!existing) {
    await db.fanMember.create({
      data: { userId, tier: 'STANDARD', consentPersonal: true, consentMarketing: true, consentedAt: new Date() },
    })
    console.log(`  ✓ FanMember created for userId=${userId}`)
  }
}

/** Закрывает соединение с БД. */
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await (prisma as any).$disconnect()
    prisma = null
  }
}
