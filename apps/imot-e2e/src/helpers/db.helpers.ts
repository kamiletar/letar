/**
 * Хелперы для работы с базой данных в E2E тестах IMOT
 *
 * ВАЖНО: Better Auth использует scrypt (@noble/hashes), НЕ bcrypt!
 * Используем Better Auth hashPassword для корректного хэширования.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Загружаем переменные окружения из IMOT приложения
const projectDir = resolve(__dirname, '../../../imot')
config({ path: resolve(projectDir, '.env.local') })
config({ path: resolve(projectDir, '.env') })

type PrismaClientType = import('@prisma/client').PrismaClient

let prisma: PrismaClientType | null = null
let UserRole: Record<string, string> | null = null

/**
 * Получить инстанс Prisma Client и UserRole enum
 *
 * Prisma 7+ генерирует ESM-only client.ts (import.meta.url),
 * Playwright транспилирует TS в CJS → import.meta.url ломается.
 * Используем CJS wrapper, который обходит client.ts напрямую.
 */
async function getPrisma(): Promise<PrismaClientType> {
  if (!prisma) {
    const prismaModule = require('./prisma-cjs-wrapper')
    prisma = prismaModule.createPrismaClient()
    UserRole = prismaModule.UserRole
  }
  return prisma
}

/**
 * Хэширование пароля через Better Auth (scrypt)
 *
 * Better Auth использует @noble/hashes/scrypt:
 * - N: 16384, r: 16, p: 1, dkLen: 64
 * - Формат: "salt:hash" (hex)
 */
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const { hashPassword } = await import('better-auth/crypto')
  return hashPassword(password)
}

/**
 * Создание тестового пользователя напрямую в БД
 *
 * IMOT User модель:
 * - role: UserRole (единственное поле, не массив)
 * - Нет hashedPassword — пароль хранится в Account.password
 * - emailVerified: Boolean (не DateTime)
 */
export async function createTestUser(data: { email: string; password: string; name: string; role: string }) {
  const db = await getPrisma()
  if (!UserRole) throw new Error('UserRole enum not loaded')

  const roleValue = UserRole[data.role]
  if (!roleValue) throw new Error(`Unknown role: ${data.role}`)

  // Проверяем существование
  const existing = await db.user.findUnique({ where: { email: data.email } })

  // Хешируем пароль через Better Auth (scrypt, формат "salt:hash")
  const hashedPassword = await hashPasswordBetterAuth(data.password)

  if (existing) {
    // Обновляем существующего пользователя
    const user = await db.user.update({
      where: { email: data.email },
      data: {
        name: data.name,
        emailVerified: true,
        role: roleValue as never,
      },
    })

    // Создаём/обновляем Account для Better Auth credential auth
    const account = await db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: data.email,
        },
      },
      update: { password: hashedPassword },
      create: {
        userId: user.id,
        providerId: 'credential',
        accountId: data.email,
        password: hashedPassword,
      },
    })
    console.log(`  ✓ User updated: ${data.email} (role: ${data.role}, account: ${account.id})`)

    return user
  }

  // Создаём нового пользователя
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      emailVerified: true,
      role: roleValue as never,
    },
  })

  // Создаём Account для Better Auth credential auth
  const account = await db.account.create({
    data: {
      userId: user.id,
      providerId: 'credential',
      accountId: data.email,
      password: hashedPassword,
    },
  })
  console.log(`  ✓ User created: ${data.email} (role: ${data.role}, account: ${account.id})`)

  return user
}

/**
 * Отключение от БД
 */
export async function disconnectDb() {
  if (prisma) {
    await (prisma as PrismaClientType & { $disconnect(): Promise<void> }).$disconnect()
    prisma = null
  }
}
