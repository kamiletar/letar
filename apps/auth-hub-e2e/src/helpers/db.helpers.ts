/**
 * Хелперы прямого доступа к БД auth-hub для e2e-тестов (по образцу
 * apps/driving-school-e2e/src/helpers/db.helpers.ts).
 *
 * ⚠️ Только для локального прогона (BASE_URL по умолчанию → localhost:3014, DATABASE_URL
 * из .env.local → dev-БД на порту 5440). Пароль основного аккаунта создаём НЕ прямой вставкой
 * в БД, а через реальный HTTP sign-up endpoint (см. spec) — у Better Auth собственное scrypt-
 * хеширование, воспроизводить его вручную здесь избыточно и хрупко. Здесь нужна только вставка
 * `UserEmail` (self-service linked-email flow не имеет публичного API без письма-подтверждения).
 */
import { config } from 'dotenv'
import { resolve } from 'path'

const projectDir = resolve(__dirname, '../../../auth-hub')
config({ path: resolve(projectDir, '.env.local') })
config({ path: resolve(projectDir, '.env') })

/**
 * Структурный тип вместо импорта полного generated-клиента auth-hub — импорт .ts из
 * другого Nx-приложения ломает `tsc --build` rootDir-границы проекта (TS6059/TS6307).
 * Описываем только методы, которые реально используются в хелперах.
 */
interface AuthHubPrismaClient {
  user: {
    findUnique: (args: { where: { email: string } }) => Promise<{ id: string; email: string } | null>
  }
  userEmail: {
    upsert: (args: {
      where: { email: string }
      create: { userId: string; email: string; verified: boolean }
      update: { userId: string; verified: boolean }
    }) => Promise<unknown>
    deleteMany: (args: { where: { email: string } }) => Promise<unknown>
  }
  $disconnect: () => Promise<void>
}

let prisma: AuthHubPrismaClient | null = null

async function getPrisma(): Promise<AuthHubPrismaClient> {
  if (!prisma) {
    const prismaModule = require('./prisma-cjs-wrapper')
    prisma = prismaModule.createPrismaClient()
  }
  return prisma as AuthHubPrismaClient
}

/**
 * Находит пользователя по email (основному, не linked).
 */
export async function findUserByEmail(email: string) {
  const db = await getPrisma()
  return db.user.findUnique({ where: { email } })
}

/**
 * Создаёт (или обновляет — идемпотентно) ПОДТВЕРЖДЁННЫЙ linked-email, указывающий
 * на переданного владельца. Имитирует состояние после self-service подтверждения
 * в /profile/emails/ (Этап 8.5), не проходя реальную отправку письма.
 */
export async function ensureVerifiedLinkedEmail(ownerUserId: string, linkedEmail: string) {
  const db = await getPrisma()
  const normalized = linkedEmail.toLowerCase().trim()

  await db.userEmail.upsert({
    where: { email: normalized },
    create: { userId: ownerUserId, email: normalized, verified: true },
    update: { userId: ownerUserId, verified: true },
  })
}

/**
 * Удаляет linked-email (очистка между прогонами, чтобы upsert не путался при смене владельца).
 */
export async function deleteUserEmail(linkedEmail: string) {
  const db = await getPrisma()
  await db.userEmail.deleteMany({ where: { email: linkedEmail.toLowerCase().trim() } })
}

export async function disconnectDb() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
