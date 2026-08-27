/**
 * DB-хелперы для E2E тестов dsperevod
 *
 * Создаёт тестовые данные напрямую в БД через Prisma CJS wrapper (см. prisma-cjs-wrapper.js) —
 * ZenStack-политики здесь не нужны, тест сам управляет доступом через UI-логин.
 */
import { loadEnvCascade } from '@letar/env-load'
import { randomBytes, scryptSync } from 'node:crypto'
import { resolve } from 'path'

// Better Auth scrypt format: `${salt_hex}:${key_hex}` (N=16384, r=16, p=1, dkLen=64)
// scryptSync вместо promisify(scrypt) — util.promisify теряет перегрузку с options-объектом
// (4 аргумента), типизация резолвится в 3-арг сигнатуру (TS2554). Тестовый setup-код —
// синхронность не критична.
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(Buffer.from(password.normalize('NFKC')), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${key.toString('hex')}`
}

const projectDir = resolve(__dirname, '../../../dsperevod')
loadEnvCascade(projectDir)

type AnyPrisma = {
  user: Record<string, unknown>
  account: Record<string, unknown>
  translationRequest: Record<string, unknown>
  $disconnect: () => Promise<void>
}

let prisma: AnyPrisma | null = null

async function getPrisma(): Promise<AnyPrisma> {
  if (!prisma) {
    const mod = require('./prisma-cjs-wrapper')
    prisma = mod.createPrismaClient() as AnyPrisma
  }
  return prisma
}

/** Создаёт или обновляет тестового ADMIN-пользователя. Возвращает userId. */
export async function createTestAdmin(data: { email: string; password: string; name: string }): Promise<string> {
  const db = (await getPrisma()) as any
  const hashedPassword = await hashPasswordBetterAuth(data.password)

  const existing = await db.user.findUnique({ where: { email: data.email } })

  let userId: string

  if (existing) {
    await db.user.update({
      where: { email: data.email },
      data: { name: data.name, emailVerified: true, role: 'ADMIN' },
    })
    userId = existing.id
    await db.account.upsert({
      where: { providerId_accountId: { providerId: 'credential', accountId: userId } },
      update: { password: hashedPassword },
      create: {
        userId,
        providerId: 'credential',
        accountId: userId,
        password: hashedPassword,
        issuer: 'local:credential',
      },
    })
  } else {
    const user = await db.user.create({
      data: { email: data.email, name: data.name, emailVerified: true, role: 'ADMIN' },
    })
    userId = user.id
    await db.account.create({
      data: {
        userId,
        providerId: 'credential',
        accountId: userId,
        password: hashedPassword,
        issuer: 'local:credential',
      },
    })
  }

  return userId
}

/** Создаёт тестовую заявку на перевод, возвращает её id. */
export async function createTestTranslationRequest(): Promise<string> {
  const db = (await getPrisma()) as any
  const req = await db.translationRequest.create({
    data: {
      name: 'E2E Тестов',
      email: 'e2e-request@example.com',
      phone: '+79990000000',
      status: 'NEW',
    },
    select: { id: true },
  })
  return req.id
}

/** Удаляет тестовую заявку по id (best-effort, не падает если уже удалена). */
export async function deleteTranslationRequest(id: string): Promise<void> {
  const db = (await getPrisma()) as any
  await db.translationRequest.delete({ where: { id } }).catch(() => undefined)
}

/** Закрывает соединение с БД. */
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
